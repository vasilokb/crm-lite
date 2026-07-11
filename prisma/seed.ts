import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // === D8: фиксированные даты ===
  const NOW      = new Date();
  const TODAY    = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 12, 0, 0, 0);
  const YESTERDAY = new Date(TODAY.getTime() - 86_400_000);
  const offsetDate = (n: number | null) =>
    n == null ? null : new Date(TODAY.getTime() + n * 86_400_000);

  // === Очистка в порядке FK; User и Organization НЕ удаляем (upsert ниже) ===
  await prisma.activity.deleteMany({});
  await prisma.opportunity.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.stage.deleteMany({});
  await prisma.inviteToken.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});   // Auth.js Account (тестовые остатки)
  await prisma.membership.deleteMany({});

  // === Tenant-якорь: Organization + owner User + Membership ===
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-agency' },
    update: {},
    create: { name: 'Demo Agency', slug: 'demo-agency' },
  });
  const owner = await prisma.user.upsert({
    where: { email: 'owner@demo.agency' },
    update: {},
    create: { email: 'owner@demo.agency', name: 'Demo Owner', passwordHash: bcrypt.hashSync('demo1234', 10) },
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: owner.id, organizationId: org.id } },
    update: {},
    create: { userId: owner.id, organizationId: org.id, role: 'owner', status: 'active' },
  });

  // === Stage (upsert по per-tenant [organizationId, name]) ===
  const stages = await Promise.all([
    { name: 'qualification', position: 1 },
    { name: 'proposal',      position: 2 },
    { name: 'negotiation',   position: 3 },
    { name: 'won',           position: 4 },
    { name: 'lost',          position: 5 },
  ].map(async s => {
    const where = { organizationId_name: { organizationId: org.id, name: s.name } };
    return prisma.stage.upsert({ where, update: { position: s.position }, create: { ...s, organizationId: org.id } });
  }));

  // === Customer (ex-Account; upsert по [organizationId, name]) ===
  const customers = await Promise.all([
    { name: 'ЭкспоФормат',   industry: 'events' },
    { name: 'СтендАрт',      industry: 'marketing' },
    { name: 'БрендЗона Pro', industry: 'design' },
    { name: 'Showroom Lab',  industry: 'production' },
  ].map(async a => {
    const where = { organizationId_name: { organizationId: org.id, name: a.name } };
    return prisma.customer.upsert({ where, update: { industry: a.industry }, create: { ...a, organizationId: org.id } });
  }));

  // === Contact (upsert по [organizationId, email]) ===
  const contactDefs = [
    { name: 'Анна Иванова',    email: 'a.ivanova@expofmt.ru',     phone: '+7 495 111-22-33', role: 'CFO',             customerName: 'ЭкспоФормат' },
    { name: 'Дмитрий Петров',  email: 'd.petrov@standart.ru',     phone: '+7 495 222-33-44', role: 'Marketing Dir.',  customerName: 'СтендАрт' },
    { name: 'Елена Сидорова',  email: 'e.sidorova@brandzone.pro', phone: '+7 495 333-44-55', role: 'Designer',        customerName: 'БрендЗона Pro' },
    { name: 'Михаил Козлов',   email: 'm.kozlov@showroomlab.ru',  phone: '+7 495 444-55-66', role: 'Production Mgr.', customerName: 'Showroom Lab' },
    { name: 'Олег Смирнов',    email: 'o.smirnov@gmail.com',      phone: '+7 495 555-66-77', role: 'Freelance',       customerName: null },
  ];
  const contacts = await Promise.all(contactDefs.map(async c => {
    const customer = c.customerName ? customers.find(a => a.name === c.customerName)! : null;
    const where = { organizationId_email: { organizationId: org.id, email: c.email } };
    const data = { name: c.name, email: c.email, phone: c.phone, role: c.role, accountId: customer?.id ?? null, organizationId: org.id };
    return prisma.contact.upsert({ where, update: data, create: data });
  }));

  // === Lead (upsert по id; + organizationId + ownerUserId) ===
  const leadDefs = [
    { id: 'seed-lead-dkozlov',  name: 'Дмитрий Козлов', email: 'dkozlov@gamma.ru',   phone: '+7 999 111-22-33', source: 'site' as const,     status: 'new' as const,       company: 'ООО «Гамма»' },
    { id: 'seed-lead-evolkova', name: 'Елена Волкова',  email: 'elena@mail.ru',       phone: '+7 999 222-33-44', source: 'email' as const,    status: 'new' as const,       company: null },
    { id: 'seed-lead-isidorov', name: 'Иван Сидоров',   email: 'i.sidorov@delta.ru',  phone: '+7 999 333-44-55', source: 'site' as const,     status: 'processed' as const, company: 'АО «Дельта»' },
    { id: 'seed-lead-apetrova', name: 'Анна Петрова',   email: 'a.petrova@yandex.ru', phone: '+7 999 444-55-66', source: 'phone' as const,    status: 'new' as const,       company: null },
    { id: 'seed-lead-sorlov',   name: 'Сергей Орлов',   email: 's.orlov@epsilon.com', phone: '+7 999 555-66-77', source: 'referral' as const, status: 'processed' as const, company: 'Epsilon Group' },
    { id: 'seed-lead-yzayceva', name: 'Юлия Зайцева',   email: 'y.zayceva@zeta.tech', phone: '+7 999 666-77-88', source: 'manual' as const,   status: 'converted' as const, company: null },
  ];
  const leads = await Promise.all(leadDefs.map(l => {
    const data = { name: l.name, email: l.email, phone: l.phone, source: l.source, status: l.status, company: l.company, organizationId: org.id, ownerUserId: owner.id };
    return prisma.lead.upsert({ where: { id: l.id }, update: data, create: { id: l.id, ...data } });
  }));

  // === Opportunity ===
  const qualStage = stages.find(s => s.name === 'qualification')!;
  const propStage = stages.find(s => s.name === 'proposal')!;
  const negStage  = stages.find(s => s.name === 'negotiation')!;
  const wonStage  = stages.find(s => s.name === 'won')!;
  const lostStage = stages.find(s => s.name === 'lost')!;

  const oppDefs = [
    { slug: 'opp-gamma-auto-2026',  title: 'Стенд «Гамма-Авто 2026»',    amount: 1_200_000, stageId: qualStage.id,  customerName: 'ЭкспоФормат',   contactEmail: 'a.ivanova@expofmt.ru',     reasonLost: null, leadEmail: null },
    { slug: 'opp-standart-pitch',   title: 'Презентация для «СтендАрт»', amount:   800_000, stageId: qualStage.id,  customerName: 'СтендАрт',      contactEmail: 'd.petrov@standart.ru',     reasonLost: null, leadEmail: null },
    { slug: 'opp-brandzone-design', title: 'Бренд-зона БрендЗона',       amount: 2_500_000, stageId: propStage.id,  customerName: 'БрендЗона Pro', contactEmail: 'e.sidorova@brandzone.pro', reasonLost: null, leadEmail: null },
    { slug: 'opp-showroom-concept', title: 'Showroom-концепция',         amount: 1_700_000, stageId: negStage.id,   customerName: 'Showroom Lab',  contactEmail: 'm.kozlov@showroomlab.ru',  reasonLost: null, leadEmail: null },
    { slug: 'opp-epsilon-2026',     title: 'Стенд «Epsilon 2026»',       amount: 3_000_000, stageId: wonStage.id,   customerName: 'СтендАрт',      contactEmail: 'd.petrov@standart.ru',     reasonLost: null, leadEmail: 'y.zayceva@zeta.tech' },
    { slug: 'opp-zeta-pavilion',    title: 'Выставочный павильон Zeta',  amount:   950_000, stageId: lostStage.id,  customerName: 'БрендЗона Pro', contactEmail: 'e.sidorova@brandzone.pro', reasonLost: 'Клиент ушёл к конкуренту, бюджет сокращён в 3 раза', leadEmail: null },
  ];
  const opportunities = await Promise.all(oppDefs.map(o => {
    const customer = customers.find(a => a.name === o.customerName)!;
    const contact = contacts.find(c => c.email === o.contactEmail)!;
    const lead = o.leadEmail ? leads.find(l => l.email === o.leadEmail)! : null;
    return prisma.opportunity.upsert({
      where: { id: `seed-${o.slug}` },
      update: { leadId: lead?.id ?? null },
      create: {
        id: `seed-${o.slug}`,
        title: o.title,
        amount: o.amount,
        status: o.stageId === wonStage.id ? 'won' : o.stageId === lostStage.id ? 'lost' : 'open',
        reasonLost: o.reasonLost,
        stageId: o.stageId,
        leadId: lead?.id ?? null,
        accountId: customer.id,
        contactId: contact.id,
        closeDate: o.stageId === wonStage.id || o.stageId === lostStage.id ? TODAY : null,
        organizationId: org.id,
      },
    });
  }));

  // === Activity ===
  const actDefs = [
    { type: 'task' as const, text: 'Согласовать макет с «Гамма-Авто»',         dueOffsetDays: -1, done: false, oppIdx: 0 },
    { type: 'task' as const, text: 'Отправить КП для «БрендЗона»',             dueOffsetDays: -1, done: false, oppIdx: 2 },
    { type: 'task' as const, text: 'Звонок менеджеру «Showroom Lab»',          dueOffsetDays:  0, done: false, oppIdx: 3 },
    { type: 'task' as const, text: 'Подготовить презентацию для «Epsilon»',    dueOffsetDays:  0, done: false, oppIdx: 4 },
    { type: 'task' as const, text: 'Первичный звонок «СтендАрт» (выполнено)',  dueOffsetDays: -7, done: true,  oppIdx: 1 },
    { type: 'task' as const, text: 'Получен бриф от «БрендЗона» (выполнено)',  dueOffsetDays: -3, done: true,  oppIdx: 2 },
    { type: 'note' as const, text: 'Клиент просил увеличить площадь на 15 м²',  dueOffsetDays: null, done: false, oppIdx: 0 },
    { type: 'note' as const, text: 'Согласовано размещение на выставке 12.10', dueOffsetDays: null, done: false, oppIdx: 4 },
  ];
  await Promise.all(actDefs.map((a, i) =>
    prisma.activity.upsert({
      where: { id: `seed-act-${i}` },
      update: {},
      create: {
        id: `seed-act-${i}`,
        type: a.type,
        text: a.text,
        dueDate: offsetDate(a.dueOffsetDays),
        done: a.done,
        opportunityId: opportunities[a.oppIdx].id,
        organizationId: org.id,
      },
    })
  ));

  console.log('Seed: 1 org + 1 owner | 5 stages, 4 customers, 5 contacts, 6 leads, 6 opportunities, 8 activities');
}

main().catch(console.error).finally(() => prisma.$disconnect());