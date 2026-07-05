'use server';

import { safeRevalidate } from './revalidate';
import { prisma } from './db';
import {
  opportunityInputSchema,
  type OpportunityInput,
} from './validators';
import type { Paginated, ListFilters, Result } from './types';
import type { Opportunity } from '@prisma/client';

export async function createOpportunity(input: OpportunityInput): Promise<Result<Opportunity>> {
  const p = opportunityInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  const opp = await prisma.opportunity.create({
    data: {
      title:     p.data.title,
      amount:    p.data.amount ?? null,
      dueDate:   p.data.dueDate ? new Date(p.data.dueDate) : null,
      stageId:   p.data.stageId,
      accountId: p.data.accountId ?? null,
      contactId: p.data.contactId ?? null,
    },
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
  const opp = await prisma.opportunity.update({
    where: { id },
    data: {
      title:     p.data.title,
      amount:    p.data.amount ?? null,
      dueDate:   p.data.dueDate ? new Date(p.data.dueDate) : null,
      stageId:   p.data.stageId,
      accountId: p.data.accountId ?? null,
      contactId: p.data.contactId ?? null,
    },
  });
  safeRevalidate('/opportunities');
  safeRevalidate(`/opportunities/${id}`);
  safeRevalidate('/dashboard');
  return { ok: true, data: opp };
}

export async function getOpportunity(id: string) {
  return prisma.opportunity.findUnique({
    where: { id },
    include: {
      account:    true,
      contact:    true,
      stage:      true,
      activities: { orderBy: { createdAt: 'desc' } },
    },
  });
}

export async function getOpportunities(
  f: ListFilters & { stageId?: string; status?: string } = {}
): Promise<Paginated<Opportunity>> {
  const { q, stageId, status, page = 1, limit = 50 } = f;
  const andClauses: Record<string, unknown>[] = [];
  if (q) {
    andClauses.push({ title: { contains: q, mode: 'insensitive' as const } });
  }
  if (stageId) andClauses.push({ stageId });
  if (status) andClauses.push({ status: status as never });
  const where = andClauses.length > 0 ? { AND: andClauses } : {};

  const [items, total] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { stage: true, _count: { select: { activities: true } } },
    }),
    prisma.opportunity.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function updateOpportunityStage(
  _opportunityId: string,
  _newStageId: string,
  _reasonLost?: string
): Promise<Result<Opportunity>> {
  throw new Error('updateOpportunityStage: РїРѕР»РЅР°СЏ СЂРµР°Р»РёР·Р°С†РёСЏ РІ phase-9-funnel.md (РїСЂР°РІРёР»Р° won/lost)');
}