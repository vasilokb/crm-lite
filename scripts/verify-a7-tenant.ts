import { PrismaClient } from '@prisma/client';

(async () => {
  const p = new PrismaClient();
  const { createTenantPrisma } = await import('../src/lib/db');
  const orgs = await p.organization.findMany();
  if (!orgs.length) {
    console.log('NO_ORG');
    await p.$disconnect();
    return;
  }
  const orgA = orgs[0];
  const t = createTenantPrisma(orgA.id);
  const leads = await t.lead.findMany();
  console.log('leads filtered by orgA:', leads.length, 'all orgA:', leads.every(l => l.organizationId === orgA.id));
  const created = await t.lead.create({
    data: { name: 'A7-smoke', source: 'manual', status: 'new', organizationId: 'WRONG' },
  });
  console.log('create injected orgA (overrides WRONG):', created.organizationId === orgA.id);
  await t.lead.delete({ where: { id: created.id } });
  await p.$disconnect();
})();