import { getTenantPrisma } from '@/lib/auth/session';
import type { Stage } from '@prisma/client';

/**
 * Возвращает все стадии воронки в порядке position asc.
 * Используется в server-страницах для StageProgressBar и CreateOpportunityForm.
 */
export async function getStages(): Promise<Stage[]> {
  const db = await getTenantPrisma();
  return db.stage.findMany({ orderBy: { position: 'asc' } });
}