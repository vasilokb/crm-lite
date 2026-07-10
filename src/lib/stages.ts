import { PrismaClient } from '@prisma/client';
import { getTenantPrisma } from '@/lib/auth/session';
import type { Stage } from '@prisma/client';

export const DEFAULT_STAGES = [
  { name: 'qualification', position: 1 },
  { name: 'proposal',      position: 2 },
  { name: 'negotiation',   position: 3 },
  { name: 'won',           position: 4 },
  { name: 'lost',          position: 5 },
] as const;

// Тип transaction-клиента: у tx тот же интерфейс, что у prisma, но без $transaction/$extends.
// Используем для совместимости с prisma.$transaction(async (tx) => ...).
type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// Создаёт стадии по умолчанию для новой организации.
// Принимает tx, чтобы вызываться внутри prisma.$transaction.
export async function seedDefaultStages(tx: Tx, organizationId: string): Promise<void> {
  await Promise.all(
    DEFAULT_STAGES.map((s) =>
      tx.stage.create({
        data: { name: s.name, position: s.position, organizationId },
      }),
    ),
  );
}

/**
 * Возвращает все стадии воронки в порядке position asc.
 * Используется в server-страницах для StageProgressBar и CreateOpportunityForm.
 */
export async function getStages(): Promise<Stage[]> {
  const db = await getTenantPrisma();
  return db.stage.findMany({ orderBy: { position: 'asc' } });
}