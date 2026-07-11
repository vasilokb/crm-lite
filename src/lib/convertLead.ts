'use server';

import { Prisma } from '@prisma/client';
import { getTenantPrisma } from '@/lib/auth/session';
import { safeRevalidate } from '@/lib/revalidate';
import { convertLeadSchema, type ConvertLeadInput } from '@/lib/validators';

export type ConvertLeadResult =
  | {
      ok: true;
      customerId: string;
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

  // Шаг 2 — атомарная транзакция через tenant-клиент.
  try {
    const db = await getTenantPrisma();
    return await db.$transaction(async (tx) => {
      // (1) findFirst вместо findUnique — чужой лид не сконвертируется.
      //     Extension авто-фильтрует по organizationId сессии.
      const lead = await tx.lead.findFirst({ where: { id: leadId } });
      if (!lead) return { ok: false as const, error: 'lead_not_found' };
      if (lead.status === 'converted') return { ok: false as const, error: 'lead_already_converted' };

      // (2) Customer: upsert по compound-unique [organizationId, name].
      //     lead.organizationId гарантированно == orgId сессии (лид найден
      //     через findFirst с авто-фильтром extension-а).
      const customer = await tx.customer.upsert({
        where: { organizationId_name: { organizationId: lead.organizationId, name: input.accountName } },
        update: {},
        // organizationId инжектируется extension на runtime.
        create: { name: input.accountName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      // (3) Contact.create получает organizationId от extension.
      const contact = await tx.contact.create({
        data: {
          name:      input.contactName,
          email:     input.contactEmail || null,
          phone:     input.contactPhone || null,
          accountId: customer.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      let opportunity: { id: string } | null = null;
      if (input.createOpportunity && input.opportunityTitle) {
        // (4) Stage.findFirst — квалификация в рамках org.
        const stage = await tx.stage.findFirst({ where: { name: 'qualification' } });
        if (!stage) {
          throw new Error('Stage "qualification" not found — выполните npm run db:seed');
        }
        opportunity = await tx.opportunity.create({
          data: {
            title:     input.opportunityTitle,
            amount:    input.opportunityAmount ?? null,
            accountId: customer.id,
            contactId: contact.id,
            leadId:    lead.id,
            stageId:   stage.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        });
      }

      await tx.lead.update({ where: { id: leadId }, data: { status: 'converted' } });

      safeRevalidate('/leads');
      safeRevalidate(`/leads/${leadId}`);
      safeRevalidate('/dashboard');

      return {
        ok: true as const,
        customerId:    customer.id,
        contactId:     contact.id,
        opportunityId: opportunity?.id ?? null,
      };
    });
  } catch (err) {
    // Защита от race: уникальный индекс на Opportunity.leadId.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return { ok: false as const, error: 'lead_already_converted' };
    }
    throw err;
  }
}