import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const failures: string[] = [];
  const check = (cond: unknown, label: string) => { if (!cond) failures.push(label); };

  const stamp = Date.now();
  const slug = `demosmoke-${stamp}`;

  const owner = await prisma.user.create({
    data: { email: `demosmoke-${stamp}@t.l`, name: 'Owner', passwordHash: 'x' },
  });

  // Симуляция registerAction: User + Org + 5 Stages + demo data + Membership
  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: `Demo ${stamp}`, slug } });
    await Promise.all(
      [1, 2, 3, 4, 5].map((position) =>
        tx.stage.create({
          data: { name: ['qualification','proposal','negotiation','won','lost'][position-1], position, organizationId: org.id },
        }),
      ),
    );
    // Demo data inline (как будет в seedDemoData)
    const bcrypt = (await import('bcryptjs')).default;
    const demoPw = bcrypt.hashSync('demo1234', 10);
    const jane = await tx.user.create({ data: { name: 'Jane Doe', email: `jane.doe+${slug}@demo.example`, passwordHash: demoPw } });
    const john = await tx.user.create({ data: { name: 'John Doe', email: `john.doe+${slug}@demo.example`, passwordHash: demoPw } });
    await tx.membership.create({ data: { userId: jane.id, organizationId: org.id, role: 'member', status: 'active' } });
    await tx.membership.create({ data: { userId: john.id, organizationId: org.id, role: 'member', status: 'active' } });
    await tx.membership.create({ data: { userId: owner.id, organizationId: org.id, role: 'owner', status: 'active' } });

    const c1 = await tx.customer.create({ data: { name: 'OOO Romashka', industry: 'retail', organizationId: org.id } });
    const c2 = await tx.customer.create({ data: { name: 'Acme Ltd', industry: 'tech', organizationId: org.id } });
    const k1 = await tx.contact.create({ data: { name: 'Ivan Ivanov', email: `ivan+${slug}@demo.example`, phone: '+7 999 111-22-33', role: 'CEO', accountId: c1.id, organizationId: org.id } });
    const k2 = await tx.contact.create({ data: { name: 'Anna Smirnova', email: `anna+${slug}@demo.example`, phone: '+7 999 222-33-44', role: 'PM', accountId: c2.id, organizationId: org.id } });
    const stages = await tx.stage.findMany({ where: { organizationId: org.id } });
    const qual = stages.find((s) => s.name === 'qualification')!;
    const prop = stages.find((s) => s.name === 'proposal')!;
    await tx.lead.create({ data: { name: 'Запрос стенда', email: `lead1+${slug}@demo.example`, phone: '+7 999 000-11-22', source: 'site', status: 'new', company: 'OOO Romashka', organizationId: org.id, ownerUserId: owner.id } });
    await tx.lead.create({ data: { name: 'KP от Acme', email: `lead2+${slug}@demo.example`, source: 'email', status: 'processed', organizationId: org.id, ownerUserId: jane.id } });
    const o1 = await tx.opportunity.create({ data: { title: 'Стенд Romashka 2026', amount: 1_000_000, stageId: qual.id, accountId: c1.id, contactId: k1.id, status: 'open', organizationId: org.id } });
    await tx.opportunity.create({ data: { title: 'Proekt Acme', amount: 500_000, stageId: prop.id, accountId: c2.id, contactId: k2.id, status: 'open', organizationId: org.id } });
    await tx.activity.create({ data: { type: 'task', text: 'Связаться', dueDate: new Date(Date.now() + 86_400_000), done: false, opportunityId: o1.id, organizationId: org.id } });
    await tx.activity.create({ data: { type: 'note', text: 'Demo created', done: false, opportunityId: o1.id, organizationId: org.id } });
  });

  const org = await prisma.organization.findUnique({ where: { slug } });
  const memberships = await prisma.membership.findMany({
    where: { organizationId: org!.id, status: 'active' },
    include: { user: { select: { name: true, email: true } } },
  });
  const jane = await prisma.user.findUnique({ where: { email: `jane.doe+${slug}@demo.example` } });
  const john = await prisma.user.findUnique({ where: { email: `john.doe+${slug}@demo.example` } });

  check(memberships.length === 3, `team: 3 участника в org (got ${memberships.length})`);
  check(memberships.find((m) => m.user.email === owner.email)?.role === 'owner', 'team: владелец = owner');
  check(!!jane, 'team: Jane Doe User создан');
  check(!!john, 'team: John Doe User создан');
  check(!!jane?.passwordHash, 'team: Jane имеет passwordHash');
  check(memberships.find((m) => m.user.email === jane?.email)?.role === 'member', 'team: Jane role=member');
  check(memberships.find((m) => m.user.email === john?.email)?.role === 'member', 'team: John role=member');

  // CRM counts
  const leads = await prisma.lead.count({ where: { organizationId: org!.id } });
  const customers = await prisma.customer.count({ where: { organizationId: org!.id } });
  const contacts = await prisma.contact.count({ where: { organizationId: org!.id } });
  const opps = await prisma.opportunity.count({ where: { organizationId: org!.id } });
  const activities = await prisma.activity.count({ where: { organizationId: org!.id } });
  check(leads === 2, `crm: 2 лида (got ${leads})`);
  check(customers === 2, `crm: 2 customer (got ${customers})`);
  check(contacts === 2, `crm: 2 contact (got ${contacts})`);
  check(opps === 2, `crm: 2 opportunity (got ${opps})`);
  check(activities === 2, `crm: 2 activity (got ${activities})`);

  // Ownership: один лид на Jane, один на owner
  const leadByJane = await prisma.lead.count({ where: { organizationId: org!.id, ownerUserId: jane!.id } });
  const leadByOwner = await prisma.lead.count({ where: { organizationId: org!.id, ownerUserId: owner.id } });
  check(leadByJane === 1, 'ownership: один лид на Jane');
  check(leadByOwner === 1, 'ownership: один лид на owner');

  // Stage-based opp: o1 привязан к qualification
  const o1 = await prisma.opportunity.findFirst({ where: { organizationId: org!.id, title: 'Стенд Romashka 2026' }, include: { stage: true } });
  check(o1?.stage.name === 'qualification', 'opp: o1 → qualification');

  // Вторая регистрация: slug-суффикс уникален, email'ы тоже
  const slug2 = `demosmoke-${stamp}-b`;
  const owner2 = await prisma.user.create({ data: { email: `demosmoke-${stamp}-b@t.l`, name: 'Owner2', passwordHash: 'x' } });
  await prisma.$transaction(async (tx) => {
    const org2 = await tx.organization.create({ data: { name: `Demo ${stamp} B`, slug: slug2 } });
    await Promise.all([1,2,3,4,5].map((p) =>
      tx.stage.create({ data: { name: ['qualification','proposal','negotiation','won','lost'][p-1], position: p, organizationId: org2.id } }),
    ));
    const bcrypt = (await import('bcryptjs')).default;
    const pw = bcrypt.hashSync('demo1234', 10);
    const jane2 = await tx.user.create({ data: { name: 'Jane Doe', email: `jane.doe+${slug2}@demo.example`, passwordHash: pw } });
    const john2 = await tx.user.create({ data: { name: 'John Doe', email: `john.doe+${slug2}@demo.example`, passwordHash: pw } });
    await tx.membership.create({ data: { userId: jane2.id, organizationId: org2.id, role: 'member', status: 'active' } });
    await tx.membership.create({ data: { userId: john2.id, organizationId: org2.id, role: 'member', status: 'active' } });
    await tx.membership.create({ data: { userId: owner2.id, organizationId: org2.id, role: 'owner', status: 'active' } });
  });
  const org2 = await prisma.organization.findUnique({ where: { slug: slug2 } });
  const jane2 = await prisma.user.findUnique({ where: { email: `jane.doe+${slug2}@demo.example` } });
  check(!!org2 && !!jane2, 'second org: создан без коллизий (slug + email)');

  // Cleanup
  await prisma.activity.deleteMany({ where: { organizationId: { in: [org!.id, org2!.id] } } });
  await prisma.opportunity.deleteMany({ where: { organizationId: { in: [org!.id, org2!.id] } } });
  await prisma.contact.deleteMany({ where: { organizationId: { in: [org!.id, org2!.id] } } });
  await prisma.lead.deleteMany({ where: { organizationId: { in: [org!.id, org2!.id] } } });
  await prisma.customer.deleteMany({ where: { organizationId: { in: [org!.id, org2!.id] } } });
  await prisma.stage.deleteMany({ where: { organizationId: { in: [org!.id, org2!.id] } } });
  await prisma.membership.deleteMany({ where: { organizationId: { in: [org!.id, org2!.id] } } });
  await prisma.organization.deleteMany({ where: { id: { in: [org!.id, org2!.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, jane!.id, john!.id, owner2.id, jane2!.id] } } });

  if (failures.length > 0) {
    console.error('FAIL:', failures);
    process.exit(1);
  }
  console.log('OK: demo data — 3 члена команды (owner+Jane+John), 2 лида (по 1 на Jane/owner), 2 customer/contact/opportunity/activity, вторая org без коллизий');
}

main().finally(() => prisma.$disconnect());