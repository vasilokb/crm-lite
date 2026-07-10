# Phase 5 — Backend: server actions + Zod + CRUD · B

> Детальный план для фазы 5 из `../Plan.md` §10. Открывается агентом непосредственно перед фазой 5.
>
> **Контекст для агента (M15):** прочитай `prisma/schema.prisma` + `../Plan.md` §6 + [`docs/plans/phase-3-schema.md`](phase-3-schema.md).

## 0. Цель

Серверная логика CRM: singleton `PrismaClient`, 7 Zod-схем, 6 server-action файлов с типизированным `Result<T>`, единая точка валидации (без дублирования). После фазы — `npx tsc --noEmit` exit 0 и smoke-тесты на каждый action.

## 1. `src/lib/db.ts` — singleton

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { __db?: PrismaClient };

export const prisma =
  globalForPrisma.__db ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.__db = prisma;

// Graceful shutdown
const shutdown = async () => { await prisma.$disconnect(); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

`src/types/global.d.ts`:
```ts
declare global {
  var __db: import('@prisma/client').PrismaClient | undefined;
}
export {};
```

## 2. `src/lib/validators.ts` — 7 Zod-схем

### 2.1 Базовые helpers
```ts
import { z } from 'zod';

const trimmed = (max: number) => z.string().trim().min(1).max(max);
const optTrimmed = (max: number) => trimmed(max).optional().or(z.literal(''));
const id = z.string().regex(/^[a-z0-9-]+$/).min(1).max(50);  // A15: cuid и slug-id
const LeadSourceEnum = z.enum(['site', 'email', 'phone', 'referral', 'manual']);
const LeadStatusEnum = z.enum(['new', 'processed', 'converted']);
const OpportunityStatusEnum = z.enum(['open', 'won', 'lost']);
const ActivityTypeEnum = z.enum(['note', 'task']);
```

### 2.2 Схемы
```ts
export const leadInputSchema = z.object({
  name:    trimmed(120),
  email:   z.string().trim().email().optional().or(z.literal('')),
  phone:   optTrimmed(40),
  company: optTrimmed(200),
  source:  LeadSourceEnum,
  status:  LeadStatusEnum.optional(),
  budget:  z.number().positive().optional().or(z.literal('')),
  timeline:optTrimmed(200),
  comment: optTrimmed(2000),
});
export type LeadInput = z.infer<typeof leadInputSchema>;

export const leadUpdateSchema = leadInputSchema.partial();
export type LeadUpdate = z.infer<typeof leadUpdateSchema>;

export const accountInputSchema = z.object({
  name:     trimmed(200),
  website:  z.string().trim().url().optional().or(z.literal('')),
  industry: optTrimmed(100),
});
export type AccountInput = z.infer<typeof accountInputSchema>;

export const contactInputSchema = z.object({
  name:     trimmed(120),
  email:    z.string().trim().email().optional().or(z.literal('')),
  phone:    optTrimmed(40),
  role:     optTrimmed(100),
  accountId: cuid.optional().or(z.literal('')),
});
export type ContactInput = z.infer<typeof contactInputSchema>;

export const opportunityInputSchema = z.object({
  title:     trimmed(200),
  amount:    z.number().positive().optional(),
  stageId:   cuid,
  accountId: cuid.optional(),
  contactId: cuid.optional(),
  dueDate:   z.string().datetime().optional(),
});
export type OpportunityInput = z.infer<typeof opportunityInputSchema>;

export const opportunityStageUpdateSchema = z.object({
  opportunityId: cuid,
  newStageId:    cuid,
  reasonLost:    optTrimmed(500),
});

export const convertLeadSchema = z.object({
  accountName:        trimmed(200),       // D12 — ОБЯЗАТЕЛЬНОЕ
  contactName:        trimmed(120),
  contactEmail:       z.string().trim().email().optional().or(z.literal('')),
  contactPhone:       optTrimmed(40),
  createOpportunity:  z.boolean(),
  opportunityTitle:   optTrimmed(200),    // required-if createOpportunity=true
  opportunityAmount:  z.number().positive().optional(),
}).superRefine((v, ctx) => {
  if (v.createOpportunity && !v.opportunityTitle) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['opportunityTitle'], message: 'opportunityTitle обязателен при createOpportunity=true' });
  }
});
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;

export const activityInputSchema = z.object({
  opportunityId: cuid,
  type:          ActivityTypeEnum,
  text:          trimmed(1000),
  dueDate:       z.string().datetime().optional(),
}).superRefine((v, ctx) => {
  if (v.type === 'task' && !v.dueDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dueDate'], message: 'dueDate обязателен для task' });
  }
});
export type ActivityInput = z.infer<typeof activityInputSchema>;

export const toggleDoneSchema = z.object({        // D3
  id:   cuid,
  done: z.boolean(),
});
export type ToggleDoneInput = z.infer<typeof toggleDoneSchema>;
```

## 3. `src/lib/types.ts` — Result<T>

```ts
export type Result<T> =
  | { ok: true;  data: T }
  | { ok: false; fieldErrors?: Record<string, string[]>; message?: string };

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ListFilters = {
  q?: string;
  page?: number;
  limit?: number;
};
```

## 4. Server actions (6 файлов)

Все actions: `revalidatePath` для затронутых URL, `revalidatePath('/dashboard')` для D13.

### 4.1 `src/lib/leads.ts`
```ts
'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import { leadInputSchema, leadUpdateSchema, type LeadInput, type LeadUpdate, type Result, type Paginated, type ListFilters } from './validators';
import type { Lead } from '@prisma/client';

export async function createLead(input: LeadInput): Promise<Result<Lead>> {
  const p = leadInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  const lead = await prisma.lead.create({ data: p.data });
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  return { ok: true, data: lead };
}

export async function updateLead(id: string, input: LeadUpdate): Promise<Result<Lead>> {
  const p = leadUpdateSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  const lead = await prisma.lead.update({ where: { id }, data: p.data });
  revalidatePath('/leads');
  revalidatePath(`/leads/${id}`);
  revalidatePath('/dashboard');
  return { ok: true, data: lead };
}

export async function getLead(id: string): Promise<Lead | null> {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      opportunity: { include: { account: true, contact: true } },
    },
  });
}

export async function getLeads(f: ListFilters & { source?: string; status?: string } = {}): Promise<Paginated<Lead>> {
  const { q, source, status, page = 1, limit = 50 } = f;
  const where = {
    AND: [
      q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { company: { contains: q, mode: 'insensitive' as const } }] } : {},
      source ? { source: source as any } : {},
      status ? { status: status as any } : {},
    ],
  };
  const [items, total] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.lead.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
```

### 4.2 `src/lib/accounts.ts`
```ts
'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import { accountInputSchema, type AccountInput, type Result, type Paginated, type ListFilters } from './validators';
import type { Account } from '@prisma/client';

export async function createAccount(input: AccountInput): Promise<Result<Account>> { /* … */ }
export async function updateAccount(id: string, input: AccountInput): Promise<Result<Account>> { /* … */ }

export async function getAccount(id: string) {
  return prisma.account.findUnique({
    where: { id },
    include: {
      contacts:      { orderBy: { name: 'asc' } },
      opportunities: { orderBy: { createdAt: 'desc' }, include: { stage: true } },
    },
  });
}

export async function getAccounts(f: ListFilters = {}): Promise<Paginated<Account>> {
  const { q, page = 1, limit = 50 } = f;
  const where = q ? { name: { contains: q, mode: 'insensitive' as const } } : {};
  const [items, total] = await Promise.all([
    prisma.account.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit,
      include: { _count: { select: { contacts: true, opportunities: true } } } }),
    prisma.account.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
```

### 4.3 `src/lib/contacts.ts`
```ts
'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import { contactInputSchema, type ContactInput, type Result, type Paginated, type ListFilters } from './validators';
import type { Contact } from '@prisma/client';

export async function createContact(input: ContactInput): Promise<Result<Contact>> { /* … */ }
export async function updateContact(id: string, input: ContactInput): Promise<Result<Contact>> { /* … */ }

export async function getContact(id: string) {
  return prisma.contact.findUnique({
    where: { id },
    include: {
      account:       true,
      opportunities: { include: { stage: true }, orderBy: { createdAt: 'desc' } },
    },
  });
}

export async function getContacts(f: ListFilters & { accountId?: string } = {}): Promise<Paginated<Contact>> {
  // … аналогично §4.2, фильтр по accountId опционально
}
```

### 4.4 `src/lib/opportunities.ts`
```ts
'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import { opportunityInputSchema, type OpportunityInput, type Result, type Paginated, type ListFilters } from './validators';
import type { Opportunity } from '@prisma/client';

export async function getOpportunity(id: string) {
  return prisma.opportunity.findUnique({
    where: { id },
    include: {
      account:    true,
      contact:    true,
      stage:      true,
      activities: { orderBy: { createdAt: 'desc' } },
    },
  });
}

export async function getOpportunities(f: ListFilters & { stageId?: string; status?: string } = {}): Promise<Paginated<Opportunity>> {
  const { q, stageId, status, page = 1, limit = 50 } = f;
  const where = {
    AND: [
      q ? { title: { contains: q, mode: 'insensitive' as const } } : {},
      stageId ? { stageId } : {},
      status ? { status: status as any } : {},
    ],
  };
  // …
}

export async function updateOpportunityStage(opportunityId: string, newStageId: string, reasonLost?: string): Promise<Result<Opportunity>> {
  // правила §6.3 — см. phase-9-funnel.md для полной реализации
  // (вынесена в фазу 9, здесь только signature)
}
```

### 4.5 `src/lib/activities.ts`
```ts
'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import { activityInputSchema, toggleDoneSchema, type ActivityInput, type ToggleDoneInput, type Result } from './validators';
import type { Activity } from '@prisma/client';

export async function createActivity(input: ActivityInput): Promise<Result<Activity>> {
  const p = activityInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  const activity = await prisma.activity.create({
    data: {
      opportunityId: p.data.opportunityId,
      type:          p.data.type,
      text:          p.data.text,
      dueDate:       p.data.dueDate ? new Date(p.data.dueDate) : null,
    },
  });
  revalidatePath(`/opportunities/${p.data.opportunityId}`);
  revalidatePath('/dashboard');
  return { ok: true, data: activity };
}

export async function toggleActivityDone(input: ToggleDoneInput): Promise<Result<Activity>> {  // D3/D4
  const p = toggleDoneSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  const activity = await prisma.activity.update({
    where: { id: p.data.id },
    data: { done: p.data.done },
    include: { opportunity: { select: { id: true } } },
  });
  if (activity.opportunity) {
    revalidatePath(`/opportunities/${activity.opportunity.id}`);
  }
  revalidatePath('/dashboard');
  return { ok: true, data: activity };
}

export async function getActivities(opportunityId: string) {
  return prisma.activity.findMany({
    where: { opportunityId },
    orderBy: { createdAt: 'desc' },
  });
}
```

### 4.6 `src/lib/convertLead.ts` — см. [`docs/plans/phase-8-convert-lead.md`](phase-8-convert-lead.md) §2 (полная реализация).

## 5. Smoke-тесты `scripts/smoke-actions.ts`

```ts
import { createLead, updateLead, getLead, getLeads } from '../src/lib/leads';
import { createAccount, getAccount, getAccounts } from '../src/lib/accounts';
import { createContact, getContact, getContacts } from '../src/lib/contacts';
import { createOpportunity, updateOpportunity, getOpportunity, getOpportunities } from '../src/lib/opportunities';
import { createActivity, toggleActivityDone, getActivities } from '../src/lib/activities';
import { prisma } from '../src/lib/db';

async function run() {
  // Lead — позитивный (все обязательные поля заполнены валидно)
  const l = await createLead({
    name: 'Test Lead',
    source: 'site',
    status: 'new',
    email: 'test@example.com',
    phone: '',
    company: '',
    budget: '',
    timeline: '',
    comment: ''
  });
  console.assert(l.ok === true, 'createLead valid');

  // Lead — негативный (name='' → fieldErrors.name)
  const lBad = await createLead({
    name: '',
    source: 'site',
    status: 'new',
    email: '',
    phone: '',
    company: '',
    budget: '',
    timeline: '',
    comment: ''
  });
  console.assert(lBad.ok === false && lBad.fieldErrors?.name, 'createLead invalid name → fieldErrors.name');

  // Activity toggle Zod (D3)
  const t = await toggleActivityDone({ id: 'x' as any, done: 'yes' as any });
  console.assert(t.ok === false && t.fieldErrors?.done, 'toggleActivityDone Zod');

  // Очистка
  await prisma.activity.deleteMany({});
  await prisma.lead.deleteMany({});
  console.log('Smoke: все action возвращают ожидаемые структуры');
}
run().catch(console.error).finally(() => prisma.$disconnect());
```

## 6. Test-критерии

```bash
npx tsc --noEmit                          # exit 0
tsx scripts/smoke-actions.ts              # "Smoke: все action возвращают ожидаемые структуры"
```

## 7. Коммит после фазы

```bash
git add src/lib/
git commit -m "feat: server actions + Zod-валидаторы для всех сущностей (D3/D4 toggle без route handler)"
```