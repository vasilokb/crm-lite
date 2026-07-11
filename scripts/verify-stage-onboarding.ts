import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const failures: string[] = [];
  const check = (cond: unknown, label: string) => { if (!cond) failures.push(label); };

  const stamp = Date.now();
  const slug = `hotfix-${stamp}`;

  // === Симуляция registerAction: User + Org + 5 Stages + Membership в одной транзакции ===
  const user = await prisma.user.create({
    data: { email: `hotfix-${stamp}@t.l`, name: 'Hotfix Owner', passwordHash: 'x' },
  });
  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: `Hotfix Co ${stamp}`, slug },
    });
    const DEFAULT_STAGES = [
      { name: 'qualification', position: 1 },
      { name: 'proposal',      position: 2 },
      { name: 'negotiation',   position: 3 },
      { name: 'won',           position: 4 },
      { name: 'lost',          position: 5 },
    ];
    await Promise.all(
      DEFAULT_STAGES.map((s) =>
        tx.stage.create({ data: { ...s, organizationId: org.id } }),
      ),
    );
    await tx.membership.create({
      data: { userId: user.id, organizationId: org.id, role: 'owner', status: 'active' },
    });
  });

  const org = await prisma.organization.findUnique({ where: { slug } });
  const stages = await prisma.stage.findMany({
    where: { organizationId: org!.id },
    orderBy: { position: 'asc' },
  });

  check(stages.length === 5, `onboarding: 5 stages created (got ${stages.length})`);
  check(stages.map((s) => s.name).join(',') === 'qualification,proposal,negotiation,won,lost',
    'onboarding: правильный порядок стадий');
  check(stages.every((s) => s.organizationId === org!.id), 'onboarding: стадии привязаны к org');

  // === Симуляция createOpportunity с qualification-стадией ===
  const qualStage = stages.find((s) => s.name === 'qualification')!;
  const opp = await prisma.opportunity.create({
    data: {
      title: 'Hotfix Opp',
      amount: 100_000,
      stageId: qualStage.id,
      organizationId: org!.id,
    },
  });
  check(opp.stageId === qualStage.id, 'createOpportunity: использует qualification стадию');

  // === Cleanup ===
  await prisma.opportunity.deleteMany({ where: { organizationId: org!.id } });
  await prisma.stage.deleteMany({ where: { organizationId: org!.id } });
  await prisma.membership.deleteMany({ where: { organizationId: org!.id } });
  await prisma.organization.delete({ where: { id: org!.id } });
  await prisma.user.delete({ where: { id: user.id } });

  if (failures.length > 0) {
    console.error('FAIL:', failures);
    process.exit(1);
  }
  console.log('OK: stage onboarding создаёт 5 стадий в транзакции; createOpportunity использует qualification');
}

main().finally(() => prisma.$disconnect());