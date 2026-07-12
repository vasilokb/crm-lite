import bcrypt from 'bcryptjs';
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
 * Демо-фича для учебного проекта: при регистрации создаёт «живую» CRM
 * (2 компании, 2 контакта, 2 лида, 2 сделки, 2 активности) + 2 демо-участника
 * команды (Jane Doe, John Doe) с паролем `demo1234`, чтобы можно было
 * залогиниться под ними и проверить member-role (read-only /team).
 *
 * Email демо-членов: `<first>.<last>+<orgSlug>@demo.example` — slug org уникален,
 * значит коллизий между разными регистрациями не будет.
 *
 * ВНИМАНИЕ: в реальном B2B так делать нельзя (фейковые loginable-юзеры).
 * Позже вынести в опцию/чекбокс.
 */
export async function seedDemoData(
  tx: Tx,
  organizationId: string,
  ownerUserId: string,
  orgSlug: string,
): Promise<void> {
  // === демо-команда (2 участника) ===
  const demoPassword = bcrypt.hashSync('demo1234', 10);
  const jane = await tx.user.create({
    data: {
      name: 'Jane Doe',
      email: `jane.doe+${orgSlug}@demo.example`,
      passwordHash: demoPassword,
    },
  });
  const john = await tx.user.create({
    data: {
      name: 'John Doe',
      email: `john.doe+${orgSlug}@demo.example`,
      passwordHash: demoPassword,
    },
  });
  await tx.membership.create({
    data: { userId: jane.id, organizationId, role: 'member', status: 'active' },
  });
  await tx.membership.create({
    data: { userId: john.id, organizationId, role: 'member', status: 'active' },
  });

  // === демо CRM-данные ===
  const c1 = await tx.customer.create({
    data: { name: 'ООО «Ромашка»', industry: 'retail', organizationId },
  });
  const c2 = await tx.customer.create({
    data: { name: 'Acme Ltd', industry: 'tech', organizationId },
  });
  const k1 = await tx.contact.create({
    data: {
      name: 'Иван Иванов',
      email: `ivan+${orgSlug}@demo.example`,
      phone: '+7 999 111-22-33',
      role: 'CEO',
      accountId: c1.id,
      organizationId,
    },
  });
  const k2 = await tx.contact.create({
    data: {
      name: 'Анна Смирнова',
      email: `anna+${orgSlug}@demo.example`,
      phone: '+7 999 222-33-44',
      role: 'PM',
      accountId: c2.id,
      organizationId,
    },
  });

  const stages = await tx.stage.findMany({ where: { organizationId } });
  const qual = stages.find((s) => s.name === 'qualification');
  const prop = stages.find((s) => s.name === 'proposal');
  if (!qual || !prop) throw new Error('Default stages missing');

  // лиды: один на владельца, один на Jane (демо ownership)
  await tx.lead.create({
    data: {
      name: 'Запрос стенда',
      email: `lead1+${orgSlug}@demo.example`,
      phone: '+7 999 000-11-22',
      source: 'site',
      status: 'new',
      company: 'ООО «Ромашка»',
      organizationId,
      ownerUserId,
    },
  });
  await tx.lead.create({
    data: {
      name: 'КП от Acme',
      email: `lead2+${orgSlug}@demo.example`,
      source: 'email',
      status: 'processed',
      organizationId,
      ownerUserId: jane.id,
    },
  });

  const o1 = await tx.opportunity.create({
    data: {
      title: 'Стенд «Ромашка 2026»',
      amount: 1_000_000,
      stageId: qual.id,
      accountId: c1.id,
      contactId: k1.id,
      status: 'open',
      organizationId,
    },
  });

  // === демо-продукты / бандл / позиции / скидка (фаза P7) ===
  const stand = await tx.product.upsert({
    where: { organizationId_name: { organizationId, name: 'Стенд «Стандарт»' } },
    update: {},
    create: { name: 'Стенд «Стандарт»', price: 800_000, organizationId },
  });
  const mount = await tx.product.upsert({
    where: { organizationId_name: { organizationId, name: 'Монтаж оборудования' } },
    update: {},
    create: { name: 'Монтаж оборудования', price: 120_000, organizationId },
  });
  const design = await tx.product.upsert({
    where: { organizationId_name: { organizationId, name: 'Дизайн-проект' } },
    update: {},
    create: { name: 'Дизайн-проект', price: 150_000, organizationId },
  });
const bundle = await tx.product.upsert({
    where: { organizationId_name: { organizationId, name: 'Комплекс «Под ключ»' } },
    update: {},
    // B5-revised: цена бандла = Σ компонентов (800_000 + 2×120_000 + 150_000 = 1_190_000).
    create: { name: 'Комплекс «Под ключ»', price: 1_190_000, organizationId },
  });
  await Promise.all([
    tx.productComponent.upsert({
      where: { organizationId_bundleId_componentId: { organizationId, bundleId: bundle.id, componentId: stand.id } },
      update: {},
      create: { bundleId: bundle.id, componentId: stand.id, quantity: 1, organizationId },
    }),
    tx.productComponent.upsert({
      where: { organizationId_bundleId_componentId: { organizationId, bundleId: bundle.id, componentId: mount.id } },
      update: {},
      create: { bundleId: bundle.id, componentId: mount.id, quantity: 2, organizationId },
    }),
    tx.productComponent.upsert({
      where: { organizationId_bundleId_componentId: { organizationId, bundleId: bundle.id, componentId: design.id } },
      update: {},
      create: { bundleId: bundle.id, componentId: design.id, quantity: 1, organizationId },
    }),
  ]);
  // Позиции сделки o1 (снапшот unitPrice явный; идемпотентность через findFirst — дубли в сделке разрешены).
  const li1 = await tx.lineItem.findFirst({ where: { opportunityId: o1.id, productId: bundle.id } });
  if (!li1) {
    await tx.lineItem.create({
      data: { opportunityId: o1.id, productId: bundle.id, quantity: 1, unitPrice: bundle.price, organizationId },
    });
  }
  const li2 = await tx.lineItem.findFirst({ where: { opportunityId: o1.id, productId: mount.id, unitPrice: mount.price } });
  if (!li2) {
    await tx.lineItem.create({
      data: { opportunityId: o1.id, productId: mount.id, quantity: 1, unitPrice: mount.price, organizationId },
    });
  }
  // B5-revised: цена бандла = 1_190_000 (Σ компонентов); Subtotal o1 = 1_190_000 + 120_000 = 1_310_000; discount = 20_000 → amount = 1_290_000.
  await tx.opportunity.update({
    where: { id: o1.id },
    data: { discount: 20_000, amount: 1_290_000 },
  });

  await tx.opportunity.create({
    data: {
      title: 'Проект Acme',
      amount: 500_000,
      stageId: prop.id,
      accountId: c2.id,
      contactId: k2.id,
      status: 'open',
      organizationId,
    },
  });

  await tx.activity.create({
    data: {
      type: 'task',
      text: 'Связаться с клиентом',
      dueDate: new Date(Date.now() + 86_400_000),
      done: false,
      opportunityId: o1.id,
      organizationId,
    },
  });
  await tx.activity.create({
    data: {
      type: 'note',
      text: 'Демо-данные созданы при регистрации',
      done: false,
      opportunityId: o1.id,
      organizationId,
    },
  });
}

/**
 * Возвращает все стадии воронки в порядке position asc.
 * Используется в server-страницах для StageProgressBar и CreateOpportunityForm.
 */
export async function getStages(): Promise<Stage[]> {
  const db = await getTenantPrisma();
  return db.stage.findMany({ orderBy: { position: 'asc' } });
}