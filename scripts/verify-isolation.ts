import { PrismaClient } from '@prisma/client';
import { createTenantPrisma } from '../src/lib/db';

const prisma = new PrismaClient();

async function main() {
  let orgs = await prisma.organization.findMany({ take: 2 });
  if (orgs.length < 2) {
    const o = await prisma.organization.create({
      data: { name: 'ISO-TEMP', slug: 'iso-temp-' + Math.random().toString(36).slice(2, 8) },
    });
    orgs = [...orgs, o];
  }
  const [a, b] = orgs;
  const ta = createTenantPrisma(a.id);
  const tb = createTenantPrisma(b.id);

  const la = await ta.lead.create({
    data: { name: 'ISO-A', source: 'manual', status: 'new', organizationId: 'HACK' },
  });
  const lb = await tb.lead.create({
    data: { name: 'ISO-B', source: 'manual', status: 'new', organizationId: a.id },
  });

  const aLeads = await ta.lead.findMany({ where: { name: { in: ['ISO-A', 'ISO-B'] } } });
  const bLeads = await tb.lead.findMany({ where: { name: { in: ['ISO-A', 'ISO-B'] } } });

  console.log('A sees:', aLeads.map((l) => l.name + '(' + l.organizationId.slice(0, 4) + ')'));
  console.log('B sees:', bLeads.map((l) => l.name + '(' + l.organizationId.slice(0, 4) + ')'));
  console.log(
    'injection resisted (la org==A):',
    la.organizationId === a.id,
    '(lb org==B despite HACK=a.id):',
    lb.organizationId === b.id,
  );
  console.log(
    'ISOLATION_OK:',
    aLeads.length === 1 && aLeads[0].name === 'ISO-A' && bLeads.length === 1 && bLeads[0].name === 'ISO-B',
  );

  // cleanup
  await prisma.lead.deleteMany({ where: { name: { in: ['ISO-A', 'ISO-B'] } } });
  if (orgs[1].name === 'ISO-TEMP') {
    await prisma.organization.delete({ where: { id: orgs[1].id } });
  }
}

main().finally(() => prisma.$disconnect());