'use server';

import { safeRevalidate } from './revalidate';
import { getTenantPrisma } from '@/lib/auth/session';
import {
  activityInputSchema,
  toggleDoneSchema,
  type ActivityInput,
  type ToggleDoneInput,
} from './validators';
import type { Result } from './types';
import type { Activity } from '@prisma/client';

export async function createActivity(input: ActivityInput): Promise<Result<Activity>> {
  const p = activityInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  const db = await getTenantPrisma();
  const activity = await db.activity.create({
    data: {
      opportunityId: p.data.opportunityId,
      type:          p.data.type,
      text:          p.data.text,
      dueDate:       p.data.dueDate ? new Date(p.data.dueDate) : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });
  safeRevalidate(`/opportunities/${p.data.opportunityId}`);
  safeRevalidate('/dashboard');
  return { ok: true, data: activity };
}

export async function toggleActivityDone(input: ToggleDoneInput): Promise<Result<Activity>> {
  const p = toggleDoneSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  const db = await getTenantPrisma();
  const existing = await db.activity.findFirst({ where: { id: p.data.id } });
  if (!existing) return { ok: false, error: 'not_found' };
  const activity = await db.activity.update({
    where: { id: p.data.id },
    data:  { done: p.data.done },
    include: { opportunity: { select: { id: true } } },
  });
  if (activity.opportunity) {
    safeRevalidate(`/opportunities/${activity.opportunity.id}`);
  }
  safeRevalidate('/dashboard');
  return { ok: true, data: activity };
}

export async function getActivities(opportunityId: string) {
  const db = await getTenantPrisma();
  return db.activity.findMany({
    where: { opportunityId },
    orderBy: { createdAt: 'desc' },
  });
}