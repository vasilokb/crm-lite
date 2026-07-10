import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const failures: string[] = [];
  const check = (cond: unknown, label: string) => { if (!cond) failures.push(label); };

  // === Tenant isolation ===
  const orgs = await prisma.organization.findMany({ orderBy: { createdAt: 'asc' } });
  check(orgs.length >= 1, 'at least 1 org');
  const orgA = orgs[0];
  let orgB = orgs.find(o => o.id !== orgA.id);
  if (!orgB) {
    orgB = await prisma.organization.create({
      data: { name: 'B Agency', slug: 'b-agency-' + Date.now() },
    });
  }

  // Tenant-scoped Prisma (mimics getTenantPrisma via createTenantPrisma)
  const { createTenantPrisma } = await import('../src/lib/db');
  const tA = createTenantPrisma(orgA.id);

  const leadsA = await tA.lead.findMany();
  check(leadsA.every(l => l.organizationId === orgA.id), 'all leads in A scope are orgA');

  // === Convert lead ===
  const freshLead = await tA.lead.create({
    data: {
      id: 'a8-smoke-lead-' + Date.now(),
      name: 'Smoke Convert',
      source: 'manual',
      status: 'new',
      organizationId: orgA.id,
    },
  });
  const result = await tA.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({ where: { id: freshLead.id } });
    if (!lead) return { ok: false, error: 'not_found' } as const;
    const customer = await tx.customer.upsert({
      where: { organizationId_name: { organizationId: lead.organizationId, name: 'A8 Smoke Co' } },
      update: {},
      create: { name: 'A8 Smoke Co' } as any,
    });
    const contact = await tx.contact.create({
      data: {
        name: 'Smoke Contact',
        email: 'smoke@a8.test',
        accountId: customer.id,
      } as any,
    });
    const stage = await tx.stage.findFirst({ where: { name: 'qualification' } });
    if (!stage) throw new Error('no qualification stage');
    const opp = await tx.opportunity.create({
      data: {
        title: 'A8 Smoke Opp',
        amount: 100000,
        accountId: customer.id,
        contactId: contact.id,
        leadId: lead.id,
        stageId: stage.id,
      } as any,
    });
    await tx.lead.update({ where: { id: lead.id }, data: { status: 'converted' } });
    return { ok: true, customerId: customer.id, contactId: contact.id, opportunityId: opp.id } as const;
  });
  check(result.ok === true, 'convertLead-style transaction ok');
  check(typeof result.customerId === 'string', 'customerId returned');
  check(typeof result.contactId === 'string', 'contactId returned');
  check(typeof result.opportunityId === 'string', 'opportunityId returned');

  if (result.ok) {
    const leadAfter = await tA.lead.findFirst({ where: { id: freshLead.id } });
    check(leadAfter?.status === 'converted', 'lead.status === converted');
    const oppAfter = await tA.opportunity.findFirst({ where: { id: result.opportunityId } });
    check(oppAfter?.organizationId === orgA.id, 'opportunity scoped to orgA');
  }

  // === Cross-tenant lookup returns null ===
  const tB = createTenantPrisma(orgB.id);
  const crossLead = await tB.lead.findFirst({ where: { id: freshLead.id } });
  check(crossLead === null, 'tenant B cannot see orgA leads');

  // === Cleanup ===
  await prisma.lead.deleteMany({ where: { id: freshLead.id } });
  if (result.ok) {
    await prisma.opportunity.deleteMany({ where: { id: result.opportunityId } });
    await prisma.contact.deleteMany({ where: { id: result.contactId } });
    await prisma.customer.deleteMany({ where: { id: result.customerId } });
  }

  if (failures.length > 0) {
    console.error('FAIL:', failures);
    process.exit(1);
  }
  console.log('OK: convertLead smoke + tenant isolation passed');
}

main().finally(() => prisma.$disconnect());