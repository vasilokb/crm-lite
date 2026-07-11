# Phase 4 — Seed контрольных данных · D

> Детальный план для фазы 4 из `../Plan.md` §10. Открывается агентом непосредственно перед фазой 4.
>
> **Контекст для агента (M15):** прочитай `prisma/schema.prisma` + `../Plan.md` §7.3 + [`docs/plans/phase-3-schema.md`](phase-3-schema.md).

## 0. Цель

Детерминированный seed ровно **6 лидов / 4 компании / 5 контактов / 6 сделок / 8 активностей** + **5 стадий**. Seed идемпотентен (через `upsert` по уникальным полям `name`/`email`/`slug`). Все `dueDate` вычисляются от `TODAY = startOfDay(NOW)` в самом начале скрипта (D8).

## 1. Фикстуры

### 1.1 Stage (5 шт., справочник)
```ts
const stages = [
  { name: 'qualification', position: 1 },
  { name: 'proposal',      position: 2 },
  { name: 'negotiation',   position: 3 },
  { name: 'won',           position: 4 },
  { name: 'lost',          position: 5 },
];
```

### 1.2 Account (4 шт.)
```ts
const accounts = [
  { name: 'ЭкспоФормат',  industry: 'events' },     // выставочные стенды
  { name: 'СтендАрт',     industry: 'marketing' },  // рекламные конструкции
  { name: 'БрендЗона Pro', industry: 'design' },     // дизайн пространств
  { name: 'Showroom Lab',  industry: 'production' }, // производство
];
```

### 1.3 Contact (5 шт.: 4 привязаны к Account + 1 «висящий» без account)
```ts
const contacts = [
  { name: 'Анна Иванова',   email: 'a.ivanova@expofmt.ru',   phone: '+7 495 111-22-33', role: 'CFO',           accountIdx: 0 },
  { name: 'Дмитрий Петров',  email: 'd.petrov@standart.ru',   phone: '+7 495 222-33-44', role: 'Marketing Dir.', accountIdx: 1 },
  { name: 'Елена Сидорова',  email: 'e.sidorova@brandzone.pro', phone: '+7 495 333-44-55', role: 'Designer',     accountIdx: 2 },
  { name: 'Михаил Козлов',   email: 'm.kozlov@showroomlab.ru', phone: '+7 495 444-55-66', role: 'Production Mgr.', accountIdx: 3 },
  { name: 'Олег Смирнов',    email: 'o.smirnov@gmail.com',    phone: '+7 495 555-66-77', role: 'Freelance',    accountIdx: null }, // висящий — для теста фильтров
];
```

### 1.4 Lead (6 шт.)
Распределение source: `2×site, 1×email, 1×phone, 1×referral, 1×manual`. Статусы: `3×new, 2×processed, 1×converted`. У лида №3 (Иван Сидоров, индекс 2) есть `.company='АО «Дельта»'` — для теста prefill `accountName` в Convert Lead (D12). У лида №6 (Юлия Зайцева) `status='converted'` — привязан к `opp-epsilon-2026` через `leadId` (P16).
```ts
const leads = [
  { name: 'Дмитрий Козлов',   email: 'dkozlov@gamma.ru',     phone: '+7 999 111-22-33', source: 'site',     status: 'new',       company: 'ООО «Гамма»' },
  { name: 'Елена Волкова',    email: 'elena@mail.ru',         phone: '+7 999 222-33-44', source: 'email',    status: 'new',       company: null },
  { name: 'Иван Сидоров',     email: 'i.sidorov@delta.ru',    phone: '+7 999 333-44-55', source: 'site',     status: 'processed', company: 'АО «Дельта»' }, // company заполнено → prefill в Convert
  { name: 'Анна Петрова',     email: 'a.petrova@yandex.ru',   phone: '+7 999 444-55-66', source: 'phone',    status: 'new',       company: null },
  { name: 'Сергей Орлов',     email: 's.orlov@epsilon.com',   phone: '+7 999 555-66-77', source: 'referral', status: 'processed', company: 'Epsilon Group' },
  { name: 'Юлия Зайцева',     email: 'y.zayceva@zeta.tech',   phone: '+7 999 666-77-88', source: 'manual',   status: 'converted', company: null }, // уже конвертирован (для проверки 409 на повторной конвертации)
];
```

### 1.5 Opportunity (6 шт. по стадиям)
Распределение: `2×qualification, 1×proposal, 1×negotiation, 1×won (с amount+contactId), 1×lost (с reasonLost)`. Каждая привязана к Account + Contact из массивов выше.
```ts
const opportunities = [
  { slug: 'opp-gamma-auto-2026',     title: 'Стенд «Гамма-Авто 2026»',     amount: 1_200_000, stage: 'qualification', accountIdx: 0, contactIdx: 0, reasonLost: null },
  { slug: 'opp-standart-pitch',      title: 'Презентация для «СтендАрт»', amount:   800_000, stage: 'qualification', accountIdx: 1, contactIdx: 1, reasonLost: null },
  { slug: 'opp-brandzone-design',    title: 'Бренд-зона БрендЗона',       amount: 2_500_000, stage: 'proposal',      accountIdx: 2, contactIdx: 2, reasonLost: null },
  { slug: 'opp-showroom-concept',    title: 'Showroom-концепция',         amount: 1_700_000, stage: 'negotiation',   accountIdx: 3, contactIdx: 3, reasonLost: null },
  { slug: 'opp-epsilon-2026',        title: 'Стенд «Epsilon 2026»',       amount: 3_000_000, stage: 'won',           accountIdx: 1, contactIdx: 1, reasonLost: null, leadEmail: 'y.zayceva@zeta.tech' }, // E2E для won + привязка к converted-лиду (P16)
  { slug: 'opp-zeta-pavilion',       title: 'Выставочный павильон Zeta',  amount:   950_000, stage: 'lost',          accountIdx: 2, contactIdx: 2, reasonLost: 'Клиент ушёл к конкуренту, бюджет сокращён в 3 раза' }, // E2E для lost
];
```

### 1.6 Activity (8 шт.)
- **2 task** `dueDate = YESTERDAY`, `done = false` (просроченные)
- **2 task** `dueDate = TODAY`, `done = false` (на сегодня)
- **2 task** `done = true` (закрытые)
- **2 note** (без `dueDate`)

```ts
const activities = [
  // Просроченные task
  { type: 'task', text: 'Согласовать макет с «Гамма-Авто»',          dueOffsetDays: -1, done: false, oppIdx: 0 },
  { type: 'task', text: 'Отправить КП для «БрендЗона»',               dueOffsetDays: -1, done: false, oppIdx: 2 },
  // На сегодня task
  { type: 'task', text: 'Звонок менеджеру «Showroom Lab»',           dueOffsetDays:  0, done: false, oppIdx: 3 },
  { type: 'task', text: 'Подготовить презентацию для «Epsilon»',     dueOffsetDays:  0, done: false, oppIdx: 4 },
  // Закрытые task (для разнообразия timeline)
  { type: 'task', text: 'Первичный звонок «СтендАрт» (выполнено)',  dueOffsetDays: -7, done: true,  oppIdx: 1 },
  { type: 'task', text: 'Получен бриф от «БрендЗона» (выполнено)',  dueOffsetDays: -3, done: true,  oppIdx: 2 },
  // Notes
  { type: 'note', text: 'Клиент просил увеличить площадь на 15 м²',   dueOffsetDays: null, done: false, oppIdx: 0 },
  { type: 'note', text: 'Согласовано размещение на выставке 12.10',  dueOffsetDays: null, done: false, oppIdx: 4 },
];
```

## 2. Полный `prisma/seed.ts`

```ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // === D8: фиксированные даты ===
  const NOW      = new Date();
  const TODAY    = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 12, 0, 0, 0);
  const YESTERDAY = new Date(TODAY.getTime() - 86_400_000);
  const offsetDate = (n: number | null) =>
    n == null ? null : new Date(TODAY.getTime() + n * 86_400_000);

  // === Очистка в правильном порядке (FK) ===
  await prisma.activity.deleteMany({});
  await prisma.opportunity.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.stage.deleteMany({});

  // === Stage (upsert по уникальному name) ===
  const stages = await Promise.all([
    { name: 'qualification', position: 1 },
    { name: 'proposal',      position: 2 },
    { name: 'negotiation',   position: 3 },
    { name: 'won',           position: 4 },
    { name: 'lost',          position: 5 },
  ].map(s => prisma.stage.upsert({ where: { name: s.name }, update: { position: s.position }, create: s })));

  // === Account (upsert по уникальному name) ===
  const accounts = await Promise.all([
    { name: 'ЭкспоФормат',   industry: 'events' },
    { name: 'СтендАрт',      industry: 'marketing' },
    { name: 'БрендЗона Pro', industry: 'design' },
    { name: 'Showroom Lab',  industry: 'production' },
  ].map(a => prisma.account.upsert({ where: { name: a.name }, update: { industry: a.industry }, create: a })));

  // === Contact (upsert по уникальному email) ===
  const contactDefs = [
    { name: 'Анна Иванова',    email: 'a.ivanova@expofmt.ru',     phone: '+7 495 111-22-33', role: 'CFO',            accountName: 'ЭкспоФормат' },
    { name: 'Дмитрий Петров',  email: 'd.petrov@standart.ru',     phone: '+7 495 222-33-44', role: 'Marketing Dir.', accountName: 'СтендАрт' },
    { name: 'Елена Сидорова',  email: 'e.sidorova@brandzone.pro', phone: '+7 495 333-44-55', role: 'Designer',       accountName: 'БрендЗона Pro' },
    { name: 'Михаил Козлов',   email: 'm.kozlov@showroomlab.ru',  phone: '+7 495 444-55-66', role: 'Production Mgr.', accountName: 'Showroom Lab' },
    { name: 'Олег Смирнов',    email: 'o.smirnov@gmail.com',      phone: '+7 495 555-66-77', role: 'Freelance',      accountName: null }, // висящий
  ];
  const contacts = await Promise.all(contactDefs.map(async c => {
    const account = c.accountName ? accounts.find(a => a.name === c.accountName)! : null;
    return prisma.contact.upsert({
      where: { email: c.email },
      update: { name: c.name, phone: c.phone, role: c.role, accountId: account?.id ?? null },
      create: { name: c.name, email: c.email, phone: c.phone, role: c.role, accountId: account?.id ?? null },
    });
  }));

  // === Lead (upsert по email) ===
  const leadDefs = [
    { name: 'Дмитрий Козлов', email: 'dkozlov@gamma.ru',   phone: '+7 999 111-22-33', source: 'site' as const,     status: 'new' as const,       company: 'ООО «Гамма»' },
    { name: 'Елена Волкова',  email: 'elena@mail.ru',       phone: '+7 999 222-33-44', source: 'email' as const,    status: 'new' as const,       company: null },
    { name: 'Иван Сидоров',   email: 'i.sidorov@delta.ru',  phone: '+7 999 333-44-55', source: 'site' as const,     status: 'processed' as const, company: 'АО «Дельта»' },
    { name: 'Анна Петрова',   email: 'a.petrova@yandex.ru', phone: '+7 999 444-55-66', source: 'phone' as const,    status: 'new' as const,       company: null },
    { name: 'Сергей Орлов',   email: 's.orlov@epsilon.com', phone: '+7 999 555-66-77', source: 'referral' as const, status: 'processed' as const, company: 'Epsilon Group' },
    { name: 'Юлия Зайцева',   email: 'y.zayceva@zeta.tech', phone: '+7 999 666-77-88', source: 'manual' as const,   status: 'converted' as const, company: null },
  ];
  const leads = await Promise.all(leadDefs.map(l =>
    prisma.lead.upsert({
      where: { email: l.email },
      update: { name: l.name, phone: l.phone, source: l.source, status: l.status, company: l.company },
      create: { name: l.name, email: l.email, phone: l.phone, source: l.source, status: l.status, company: l.company },
    })
  ));

  // === Opportunity ===
  const qualStage  = stages.find(s => s.name === 'qualification')!;
  const propStage  = stages.find(s => s.name === 'proposal')!;
  const negStage   = stages.find(s => s.name === 'negotiation')!;
  const wonStage   = stages.find(s => s.name === 'won')!;
  const lostStage  = stages.find(s => s.name === 'lost')!;

  const oppDefs = [
    { slug: 'opp-gamma-auto-2026',     title: 'Стенд «Гамма-Авто 2026»',    amount: 1_200_000, stageId: qualStage.id,  accountName: 'ЭкспоФормат',   contactEmail: 'a.ivanova@expofmt.ru',     reasonLost: null,             leadEmail: null },
    { slug: 'opp-standart-pitch',      title: 'Презентация для «СтендАрт»', amount:   800_000, stageId: qualStage.id,  accountName: 'СтендАрт',      contactEmail: 'd.petrov@standart.ru',     reasonLost: null,             leadEmail: null },
    { slug: 'opp-brandzone-design',    title: 'Бренд-зона БрендЗона',       amount: 2_500_000, stageId: propStage.id,  accountName: 'БрендЗона Pro', contactEmail: 'e.sidorova@brandzone.pro', reasonLost: null,             leadEmail: null },
    { slug: 'opp-showroom-concept',    title: 'Showroom-концепция',         amount: 1_700_000, stageId: negStage.id,   accountName: 'Showroom Lab',  contactEmail: 'm.kozlov@showroomlab.ru',  reasonLost: null,             leadEmail: null },
    { slug: 'opp-epsilon-2026',        title: 'Стенд «Epsilon 2026»',       amount: 3_000_000, stageId: wonStage.id,   accountName: 'СтендАрт',      contactEmail: 'd.petrov@standart.ru',     reasonLost: null,             leadEmail: 'y.zayceva@zeta.tech' },
    { slug: 'opp-zeta-pavilion',       title: 'Выставочный павильон Zeta',  amount:   950_000, stageId: lostStage.id,  accountName: 'БрендЗона Pro', contactEmail: 'e.sidorova@brandzone.pro', reasonLost: 'Клиент ушёл к конкуренту, бюджет сокращён в 3 раза', leadEmail: null },
  ];
  const opportunities = await Promise.all(oppDefs.map(o => {
    const account = accounts.find(a => a.name === o.accountName)!;
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
        accountId: account.id,
        contactId: contact.id,
        closeDate: o.stageId === wonStage.id || o.stageId === lostStage.id ? TODAY : null,
      },
    });
  }));

  // === Activity ===
  const actDefs = [
    { type: 'task' as const, text: 'Согласовать макет с «Гамма-Авто»',           dueOffsetDays: -1, done: false, oppIdx: 0 },
    { type: 'task' as const, text: 'Отправить КП для «БрендЗона»',                dueOffsetDays: -1, done: false, oppIdx: 2 },
    { type: 'task' as const, text: 'Звонок менеджеру «Showroom Lab»',            dueOffsetDays:  0, done: false, oppIdx: 3 },
    { type: 'task' as const, text: 'Подготовить презентацию для «Epsilon»',      dueOffsetDays:  0, done: false, oppIdx: 4 },
    { type: 'task' as const, text: 'Первичный звонок «СтендАрт» (выполнено)',   dueOffsetDays: -7, done: true,  oppIdx: 1 },
    { type: 'task' as const, text: 'Получен бриф от «БрендЗона» (выполнено)',   dueOffsetDays: -3, done: true,  oppIdx: 2 },
    { type: 'note' as const, text: 'Клиент просил увеличить площадь на 15 м²',    dueOffsetDays: null, done: false, oppIdx: 0 },
    { type: 'note' as const, text: 'Согласовано размещение на выставке 12.10',   dueOffsetDays: null, done: false, oppIdx: 4 },
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
      },
    })
  ));

  console.log('Seed: 5 stages, 4 accounts, 5 contacts, 6 leads, 6 opportunities, 8 activities');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

## 3. Test-критерии

```bash
tsx prisma/seed.ts
# Ожидание: "Seed: 5 stages, 4 accounts, 5 contacts, 6 leads, 6 opportunities, 8 activities"

tsx -e "
import { prisma } from './src/lib/db';
console.log({
  stages:        await prisma.stage.count(),
  accounts:      await prisma.account.count(),
  contacts:      await prisma.contact.count(),
  leads:         await prisma.lead.count(),
  opportunities: await prisma.opportunity.count(),
  activities:    await prisma.activity.count(),
  overdueTasks:  await prisma.activity.count({ where: { type: 'task', done: false, dueDate: { lt: new Date(new Date().setHours(0,0,0,0)) } } }),
  todayTasks:    await prisma.activity.count({ where: { type: 'task', done: false, dueDate: { gte: new Date(new Date().setHours(0,0,0,0)), lt: new Date(new Date().setHours(23,59,59,999)) } } }),
  closedTasks:   await prisma.activity.count({ where: { type: 'task', done: true } }),
  notes:         await prisma.activity.count({ where: { type: 'note' } }),
});
"
# Ожидание:
# { stages: 5, accounts: 4, contacts: 5, leads: 6, opportunities: 6, activities: 8,
#   overdueTasks: 2, todayTasks: 2, closedTasks: 2, notes: 2 }

# Идемпотентность: повторный запуск
npm run db:seed
# Ожидание: тот же результат (upsert), без дубликатов
```

## 4. Коммит после фазы

```bash
git add prisma/seed.ts
git commit -m "feat: детерминированный seed (5 stages, 4 accounts, 5 contacts, 6 leads, 6 opportunities, 8 activities)"
```