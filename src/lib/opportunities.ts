'use server';

import { Prisma } from '@prisma/client';
import { safeRevalidate } from './revalidate';
import { getTenantPrisma } from '@/lib/auth/session';
import {
  opportunityInputSchema,
  opportunityStageUpdateSchema,
  type OpportunityInput,
} from './validators';
import type { Paginated, ListFilters, Result } from './types';
import type { Opportunity } from '@prisma/client';

type OpportunityWithRefs = Prisma.OpportunityGetPayload<{
  include: {
    stage: true;
    customer: { select: { id: true; name: true } };
    contact: { select: { id: true; name: true } };
    _count: { select: { activities: true } };
  };
}>;

export async function createOpportunity(input: OpportunityInput): Promise<Result<Opportunity>> {
  const p = opportunityInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  const db = await getTenantPrisma();
  const opp = await db.opportunity.create({
    data: {
      title:     p.data.title,
      amount:    p.data.amount ?? null,
      dueDate:   p.data.dueDate ? new Date(p.data.dueDate) : null,
      stageId:   p.data.stageId,
      accountId: p.data.customerId ?? null,
      contactId: p.data.contactId ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });
  safeRevalidate('/opportunities');
  safeRevalidate('/dashboard');
  return { ok: true, data: opp };
}

export async function updateOpportunity(
  id: string,
  input: OpportunityInput
): Promise<Result<Opportunity>> {
  const p = opportunityInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  const db = await getTenantPrisma();
  const existing = await db.opportunity.findFirst({ where: { id } });
  if (!existing) return { ok: false, error: 'not_found' };
  const opp = await db.opportunity.update({
    where: { id },
    data: {
      title:     p.data.title,
      amount:    p.data.amount ?? null,
      dueDate:   p.data.dueDate ? new Date(p.data.dueDate) : null,
      stageId:   p.data.stageId,
      accountId: p.data.customerId ?? null,
      contactId: p.data.contactId ?? null,
    },
  });
  safeRevalidate('/opportunities');
  safeRevalidate(`/opportunities/${id}`);
  safeRevalidate('/dashboard');
  return { ok: true, data: opp };
}

export async function getOpportunity(id: string) {
  const db = await getTenantPrisma();
  return db.opportunity.findFirst({
    where: { id },
    include: {
      customer:    true,
      contact:     true,
      stage:       true,
      activities: { orderBy: { createdAt: 'desc' } },
    },
  });
}

export async function getOpportunities(
  f: ListFilters & { stageId?: string; status?: string } = {}
): Promise<Paginated<OpportunityWithRefs>> {
  const { q, stageId, status, page = 1, limit = 50 } = f;
  const andClauses: Record<string, unknown>[] = [];
  if (q) {
    andClauses.push({ title: { contains: q, mode: 'insensitive' as const } });
  }
  if (stageId) andClauses.push({ stageId });
  if (status) andClauses.push({ status: status as never });
  const where = andClauses.length > 0 ? { AND: andClauses } : {};

  const db = await getTenantPrisma();
  const [items, total] = await Promise.all([
    db.opportunity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        stage: true,
        customer: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
        _count: { select: { activities: true } },
      },
    }),
    db.opportunity.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function updateOpportunityStage(
  opportunityId: string,
  newStageId: string,
  reasonLost?: string
): Promise<Result<Opportunity>> {
  // 1. Zod-валидация входа.
  const parsed = opportunityStageUpdateSchema.safeParse({
    opportunityId,
    newStageId,
    reasonLost,
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const db = await getTenantPrisma();
  // 2. Загрузить opportunity + целевую стадию (через findFirst — авто-фильтр по org).
  const [opp, newStage] = await Promise.all([
    db.opportunity.findFirst({ where: { id: parsed.data.opportunityId } }),
    db.stage.findFirst({ where: { id: parsed.data.newStageId } }),
  ]);
  if (!opp) return { ok: false, error: 'opportunity_not_found' };
  if (!newStage) return { ok: false, error: 'stage_not_found' };

  // 3. Правила won (Plan.md §6.3).
  if (newStage.name === 'won') {
    if (opp.amount === null || opp.amount === undefined) {
      return { ok: false, error: 'amount_required' };
    }
    if (!opp.contactId) {
      return { ok: false, error: 'contact_required' };
    }
  }

  // 4. Правила lost.
  if (newStage.name === 'lost') {
    if (!parsed.data.reasonLost || !parsed.data.reasonLost.trim()) {
      return { ok: false, error: 'reason_lost_required' };
    }
  }

  // 5. Синхронизация status + closeDate при переходе в won/lost
  //    (Plan.md §6.5 — стадия и статус всегда согласованы).
  const isFinal = newStage.name === 'won' || newStage.name === 'lost';
  const newStatus: 'open' | 'won' | 'lost' = isFinal
    ? (newStage.name as 'won' | 'lost')
    : 'open';
  const newCloseDate: Date | null = isFinal ? new Date() : null;

  // 6. Обновить opportunity (single update — только ПОСЛЕ findFirst-проверки tenant).
  const updated = await db.opportunity.update({
    where: { id: opp.id },
    data: {
      stageId:    newStage.id,
      status:     newStatus,
      closeDate:  newCloseDate,
      reasonLost: newStage.name === 'lost' && parsed.data.reasonLost ? parsed.data.reasonLost.trim() : null,
    },
  });

  // 7. Инвалидация кэша (D13 — для согласованности списка ↔ Drawer).
  safeRevalidate('/opportunities');
  safeRevalidate(`/opportunities/${opp.id}`);
  safeRevalidate('/dashboard');

  return { ok: true, data: updated };
}