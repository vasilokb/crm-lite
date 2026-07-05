import { prisma } from './db';
import type { Stage } from '@prisma/client';

/**
 * Возвращает все стадии воронки в порядке position asc.
 * Используется в server-страницах для StageProgressBar и CreateOpportunityForm.
 */
export async function getStages(): Promise<Stage[]> {
  return prisma.stage.findMany({ orderBy: { position: 'asc' } });
}