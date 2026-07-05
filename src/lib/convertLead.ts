'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import { convertLeadSchema, type ConvertLeadInput } from './validators';
import { safeRevalidate } from './revalidate';

export type ConvertLeadResult =
  | {
      ok: true;
      accountId: string;
      contactId: string;
      opportunityId: string | null;
    }
  | {
      ok: false;
      fieldErrors?: Record<string, string[]>;
      error?: string;
    };

export async function convertLead(
  leadId: string,
  rawInput: unknown,
): Promise<ConvertLeadResult> {
  // Шаг 1 — Zod-валидация ДО транзакции (D14: не открываем транзакцию
  // для невалидных данных).
  const parsed = convertLeadSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const input: ConvertLeadInput = parsed.data;

  // Шаг 2 — атомарная транзакция.
  try {
    return await prisma.$transaction(async (tx) => {
      // (a) UX-проверка статуса (НЕ защита от race — её обеспечивает
      //     UNIQUE-индекс на Opportunity.leadId в шаге (d)).
      const lead = await tx.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        return { ok: false as const, error: 'lead_not_found' };
      }
      if (lead.status === 'converted') {
        return { ok: false as const, error: 'lead_already_converted' };
      }

      // (b) Account: upsert по обязательному accountName (D12 — без
      //     fallback "Лид #<id>"; Account.name @unique гарантирует
      //     идемпотентность).
      const account = await tx.account.upsert({
        where: { name: input.accountName },
        update: {},
        create: { name: input.accountName },
      });

      // (c) Contact.
      const contact = await tx.contact.create({
        data: {
          name:      input.contactName,
          email:     input.contactEmail || null,
          phone:     input.contactPhone || null,
          accountId: account.id,
        },
      });

      // (d) Opportunity (опц.) — здесь сработает UNIQUE INDEX на leadId
      //     при race (D14).
      let opportunity: { id: string } | null = null;
      if (input.createOpportunity && input.opportunityTitle) {
        const qualificationStage = await tx.stage.findUnique({
          where: { name: 'qualification' },
        });
        if (!qualificationStage) {
          throw new Error('Stage "qualification" not found — выполните npm run db:seed');
        }
        opportunity = await tx.opportunity.create({
          data: {
            title:     input.opportunityTitle,
            amount:    input.opportunityAmount ?? null,
            accountId: account.id,
            contactId: contact.id,
            leadId:    lead.id,
            stageId:   qualificationStage.id,
          },
        });
      }

      // (e) Lead → converted.
      await tx.lead.update({
        where: { id: leadId },
        data: { status: 'converted' },
      });

      // (f) Инвалидация кэша (D13). safeRevalidate глушит ошибку Next,
      //     которая возникает при запуске вне request-context (smoke).
      safeRevalidate('/leads');
      safeRevalidate(`/leads/${leadId}`);
      safeRevalidate('/dashboard');

      return {
        ok: true as const,
        accountId:    account.id,
        contactId:    contact.id,
        opportunityId: opportunity?.id ?? null,
      };
    });
  } catch (err) {
    // Защита от race (D14): уникальный индекс на Opportunity.leadId.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return { ok: false as const, error: 'lead_already_converted' };
    }
    throw err;
  }
}