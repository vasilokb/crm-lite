# Реализация авторизации CRM-lite (multi-tenant)

> Документ уровня **КАК**. Дополняет `auth-architecture-v4.md` (ЧТО/ПОЧЕМУ) конкретными артефактами: целевым `schema.prisma`, SQL-миграциями, кодом модулей, командами, affected-surface.
> Обоснования решений здесь **не повторяются** — они в архитектурном документе. Каждая секция ссылается на соответствующий раздел архитектуры (`→ §X arch`).

---

## 1. Инвентаризация «как есть» (`→ §1 arch`)

- **`prisma/schema.prisma`** — 6 моделей (`Lead`, `Account`, `Stage`, `Contact`, `Opportunity`, `Activity`) + 4 enum (`LeadSource`, `LeadStatus`, `OpportunityStatus`, `ActivityType`). Single-tenant.
- **`src/lib/db.ts`** — глобальный синглтон `prisma` (Next.js `globalThis` pattern). Экспортирует только `prisma`.
- **Server actions (`'use server'`)** — 8 файлов в `src/lib/`, все импортируют `prisma` напрямую:
  - `leads.ts` — CRUD; `getLeads` (findMany+count), `getLead` (`findUnique`), `createLead`, `updateLead`.
  - `accounts.ts` — CRUD компаний; `getAccount` (`findUnique`).
  - `contacts.ts`, `opportunities.ts`, `activities.ts`, `stages.ts`, `dashboard.ts`.
  - `convertLead.ts` — единственное место с `$transaction`; внутри: `findUnique({id})`, `account.upsert({name})`, `stage.findUnique({name:'qualification'})`.
- **`prisma/seed.ts`** — создаёт 5/4/5/6/6/8 (Stage/Account/Contact/Lead/Opportunity/Activity).
- **Скрипты `package.json`**: `db:migrate` (`prisma migrate dev`), `db:seed` (`tsx prisma/seed.ts`), `db:reset` (`prisma migrate reset --force && db:seed`).
- **Глобальные unique в текущей схеме**: `Stage.name`, `Stage.position`, `Account.name`, `Contact.email`.
- **Латентный баг**: `Opportunity.stageId` объявлен `NOT NULL`, но `onDelete: SetNull` — противоречие.

---

## 2. Целевой `schema.prisma` (полностью) (`→ §5 arch`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}

// ===== ENUMS =====
enum LeadSource { site email phone referral manual }
enum LeadStatus { new processed converted }
enum OpportunityStatus { open won lost }
enum ActivityType { note task }
enum MembershipRole { owner member }
enum MembershipStatus { active pending }

// ===== IDENTITY (Auth.js v5 Prisma adapter) =====
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  passwordHash  String?                       // Credentials provider
  createdAt     DateTime  @default(now())
  accounts      Account[]
  sessions      Session[]
  memberships   Membership[]
  ownedLeads    Lead[]     @relation("LeadOwner")
}

model Account {                                // Auth.js OAuth-привязки (пустая сейчас)
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id                   String        @id @default(cuid())
  sessionToken         String        @unique
  userId               String
  expires              DateTime
  activeOrganizationId String?
  organization         Organization? @relation(fields: [activeOrganizationId], references: [id], onDelete: SetNull)
  user                 User          @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

// ===== TENANCY =====
model Organization {
  id            String       @id @default(cuid())
  name          String
  slug          String       @unique
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  memberships   Membership[]
  invites       InviteToken[]
  sessions      Session[]
  customers     Customer[]
  leads         Lead[]
  contacts      Contact[]
  opportunities Opportunity[]
  activities    Activity[]
  stages        Stage[]
}

model Membership {
  id             String           @id @default(cuid())
  userId         String
  organizationId String
  role           MembershipRole   @default(member)
  status         MembershipStatus @default(active)
  createdAt      DateTime         @default(now())
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  @@unique([userId, organizationId])
  @@index([organizationId])
}

model InviteToken {
  id             String         @id @default(cuid())
  organizationId String
  email          String
  role           MembershipRole @default(member)
  token          String         @unique
  expiresAt      DateTime
  createdAt      DateTime       @default(now())
  organization   Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  @@index([organizationId])
}

// ===== BUSINESS =====
model Lead {
  id             String     @id @default(cuid())
  name           String
  email          String?
  phone          String?
  company        String?
  source         LeadSource
  status         LeadStatus @default(new)
  budget         Float?
  timeline       String?
  comment        String?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  ownerUserId    String?
  owner          User?         @relation("LeadOwner", fields: [ownerUserId], references: [id], onDelete: SetNull)

  opportunity    Opportunity?

  @@index([organizationId])
  @@index([source])
  @@index([status])
}

model Stage {
  id             String       @id @default(cuid())
  name           String
  position       Int
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  opportunities  Opportunity[]

  @@unique([organizationId, name])
  @@unique([organizationId, position])
}

model Customer {                               // ex-Account
  id             String       @id @default(cuid())
  name           String
  website        String?
  industry       String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  contacts      Contact[]
  opportunities Opportunity[]

  @@unique([organizationId, name])
  @@index([organizationId])
}

model Contact {
  id             String       @id @default(cuid())
  name           String
  email          String?
  phone          String?
  role           String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  accountId String?
  customer  Customer? @relation(fields: [accountId], references: [id], onDelete: Restrict)

  opportunities Opportunity[]

  @@unique([organizationId, email])
  @@index([organizationId])
  @@index([accountId])
}

model Opportunity {
  id         String            @id @default(cuid())
  title      String
  amount     Float?
  status     OpportunityStatus @default(open)
  reasonLost String?
  dueDate    DateTime?
  closeDate  DateTime?
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  stageId String
  stage   Stage  @relation(fields: [stageId], references: [id], onDelete: Restrict)   // было SetNull — фикс бага

  leadId String? @unique
  lead   Lead?   @relation(fields: [leadId], references: [id], onDelete: SetNull)

  accountId String?
  customer  Customer? @relation(fields: [accountId], references: [id], onDelete: Restrict)

  contactId String?
  contact   Contact?  @relation(fields: [contactId], references: [id], onDelete: Restrict)

  activities Activity[]

  @@index([organizationId])
  @@index([stageId])
  @@index([status])
  @@index([accountId])
  @@index([contactId])
}

model Activity {
  id        String       @id @default(cuid())
  type      ActivityType
  text      String
  dueDate   DateTime?
  done      Boolean       @default(false)
  createdAt DateTime     @default(now())

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  opportunityId String
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Restrict)

  @@index([organizationId])
  @@index([opportunityId])
  @@index([done, dueDate])
}
```

---

## 3. Миграции (SQL) (`→ §8 arch`)

Порядок стадий фиксирован: 1 → 2 → 3 → 4 (зависимости FK).

### 3.1. Стадия 1 — новые таблицы (авто)

```bash
npx prisma migrate dev --name add_identity_and_tenancy
```

Чистая авто-генерация: создаются `User`, `Account`, `Session`, `VerificationToken`, `Organization`, `Membership`, `InviteToken` + 2 enum.

### 3.2. Стадия 2 — tenant-scoping бизнес-таблиц (ручной SQL)

`migrate dev` упадёт на NOT NULL без default → генерируем пустую миграцию и пишем SQL руками:

```bash
npx prisma migrate dev --create-only --name tenant_scope_business
```

Шаблон (повторить для `Lead`, `Account`, `Stage`, `Contact`, `Opportunity`, `Activity`):

```sql
-- 0. дефолтная Organization для backfill (только если в таблицах уже есть данные)
DO $$
DECLARE default_org TEXT;
BEGIN
  SELECT id INTO default_org FROM "Organization" ORDER BY "createdAt" LIMIT 1;
  IF default_org IS NULL THEN
    INSERT INTO "Organization"(id,name,slug,"createdAt","updatedAt")
      VALUES (gen_random_uuid()::text,'Demo Agency','demo-agency',now(),now())
      RETURNING id INTO default_org;
  END IF;
  PERFORM set_config('tmp.default_org', default_org, false);
END $$;

-- 1. Lead: +organizationId, owner→ownerUserId
ALTER TABLE "Lead" ADD COLUMN "organizationId" TEXT;
UPDATE "Lead" SET "organizationId" = current_setting('tmp.default_org');
ALTER TABLE "Lead" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");

ALTER TABLE "Lead" RENAME COLUMN "owner" TO "ownerUserId";
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL;

-- 2. Stage: +organizationId, unique → per-tenant
ALTER TABLE "Stage" ADD COLUMN "organizationId" TEXT;
UPDATE "Stage" SET "organizationId" = current_setting('tmp.default_org');
ALTER TABLE "Stage" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
CREATE INDEX "Stage_organizationId_idx" ON "Stage"("organizationId");
DROP INDEX "Stage_name_key";
DROP INDEX "Stage_position_key";
CREATE UNIQUE INDEX "Stage_organizationId_name_key" ON "Stage"("organizationId","name");
CREATE UNIQUE INDEX "Stage_organizationId_position_key" ON "Stage"("organizationId","position");

-- 3. Account: +organizationId, unique → per-tenant
ALTER TABLE "Account" ADD COLUMN "organizationId" TEXT;
UPDATE "Account" SET "organizationId" = current_setting('tmp.default_org');
ALTER TABLE "Account" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Account" ADD CONSTRAINT "Account_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
CREATE INDEX "Account_organizationId_idx" ON "Account"("organizationId");
DROP INDEX "Account_name_key";
CREATE UNIQUE INDEX "Account_organizationId_name_key" ON "Account"("organizationId","name");

-- 4. Contact: +organizationId, unique → per-tenant
ALTER TABLE "Contact" ADD COLUMN "organizationId" TEXT;
UPDATE "Contact" SET "organizationId" = current_setting('tmp.default_org');
ALTER TABLE "Contact" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
CREATE INDEX "Contact_organizationId_idx" ON "Contact"("organizationId");
DROP INDEX "Contact_email_key";
CREATE UNIQUE INDEX "Contact_organizationId_email_key" ON "Contact"("organizationId","email");

-- 5. Opportunity: +organizationId; stageId SetNull → Restrict
ALTER TABLE "Opportunity" ADD COLUMN "organizationId" TEXT;
UPDATE "Opportunity" SET "organizationId" = current_setting('tmp.default_org');
ALTER TABLE "Opportunity" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
CREATE INDEX "Opportunity_organizationId_idx" ON "Opportunity"("organizationId");
ALTER TABLE "Opportunity" DROP CONSTRAINT "Opportunity_stageId_fkey";
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_stageId_fkey"
  FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE RESTRICT;

-- 6. Activity: +organizationId
ALTER TABLE "Activity" ADD COLUMN "organizationId" TEXT;
UPDATE "Activity" SET "organizationId" = current_setting('tmp.default_org');
ALTER TABLE "Activity" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
CREATE INDEX "Activity_organizationId_idx" ON "Activity"("organizationId");
```

Применить: `npx prisma migrate dev`.

### 3.3. Стадия 3 — rename `Account` → `Customer` (ручной SQL)

```bash
npx prisma migrate dev --create-only --name rename_account_to_customer
```

```sql
ALTER TABLE "Account" RENAME TO "Customer";
-- ограничение/индексы остаются по старым именам (работают); при желании переименовать:
ALTER INDEX IF EXISTS "Account_organizationId_name_key" RENAME TO "Customer_organizationId_name_key";
ALTER INDEX IF EXISTS "Account_organizationId_idx" RENAME TO "Customer_organizationId_idx";
```

В `schema.prisma` модель уже `Customer`. `migrate dev` применит SQL как есть (drop+create не触发ится, т.к. SQL написан вручную).

### 3.4. Стадия 4 — обновление `seed.ts`

Правки в `prisma/seed.ts`:
- Создать `Organization` («Demo Agency», slug `demo-agency`).
- Создать `User` (owner) с `passwordHash = bcrypt.hashSync('demo1234', 10)`.
- Создать `Membership(user, org, owner, active)`.
- Всем `prisma.account.create` → `prisma.customer.create` (+ `organizationId`).
- Всем созданиям Lead/Contact/Opportunity/Activity/Stage добавить `organizationId: org.id`.
- `Stage` — 5 стадий с `organizationId`; имена `qualification/proposal/negotiation/won/lost`.
- `Lead.owner` (строка) → `ownerUserId: ownerUser.id`.

---

## 4. Код ключевых модулей

### 4.1. `src/lib/db.ts` — tenant-клиент (`→ §6.2 arch`)

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { __db?: PrismaClient };
export const prisma =
  globalForPrisma.__db ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
if (process.env.NODE_ENV !== 'production') globalForPrisma.__db = prisma;

const TENANT_MODELS = ['lead', 'customer', 'contact', 'opportunity', 'activity', 'stage'] as const;
const AUTO_WHERE = new Set([
  'findMany', 'findFirst', 'count', 'aggregate', 'groupBy', 'updateMany', 'deleteMany',
]);

// Фабрика: возвращает Prisma-клиент, ограниченный одной организацией.
export function createTenantPrisma(orgId: string) {
  return prisma.$extends({
    name: 'tenant-scope',
    query: Object.fromEntries(
      TENANT_MODELS.map((model) => [
        model,
        {
          async $allOperations({ operation, args, query }: any) {
            if (operation === 'create') {
              args.data = { ...args.data, organizationId: orgId };
            } else if (operation === 'createMany') {
              args.data = Array.isArray(args.data)
                ? args.data.map((d: any) => ({ ...d, organizationId: orgId }))
                : { ...args.data, organizationId: orgId };
            } else if (operation === 'upsert') {
              // where НЕ инжектится — вызывающий код обязан использовать compound-unique
              args.create = { ...args.create, organizationId: orgId };
              args.update = { ...args.update, organizationId: orgId };
            } else if (AUTO_WHERE.has(operation)) {
              args.where = { ...args.where, organizationId: orgId };
            }
            // operation === 'update' | 'delete' (single): НЕ инжектится.
            // Контракт: findFirst({ id, organizationId }) → update({ where: { id } }),
            // либо использовать updateMany/deleteMany (они в AUTO_WHERE).
            return query(args);
          },
        },
      ]),
    ) as any,
  });
}
```

### 4.2. `src/lib/auth/session.ts` — контекст сессии (`→ §6.1, §7.4 arch`)

```ts
import { auth } from '@/auth';
import { createTenantPrisma } from '@/lib/db';

export async function getCurrentUser() {
  const s = await auth();
  if (!s?.user) throw new Error('UNAUTHENTICATED');
  return s.user; // { id, email, name, activeOrganizationId }
}

export async function getCurrentOrgId(): Promise<string> {
  const s = await auth();
  if (!s?.user) throw new Error('UNAUTHENTICATED');
  const orgId = (s.user as any).activeOrganizationId as string | null | undefined;
  if (!orgId) throw new Error('NO_ACTIVE_ORG');
  return orgId;
}

export async function getTenantPrisma() {
  return createTenantPrisma(await getCurrentOrgId());
}
```

### 4.3. `src/auth.ts` — Auth.js v5 (`→ §4, §7 arch`)

> **Gotcha:** `activeOrganizationId` лежит на модели `Session`, а не `User`. В callback `session` его нужно подтянуть явно — иначе `getCurrentOrgId()` всегда будет падать с `NO_ACTIVE_ORG`.

```ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const user = await prisma.user.findUnique({
          where: { email: creds!.email as string },
        });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(creds!.password as string, user.passwordHash);
        return ok ? { id: user.id, email: user.email, name: user.name } : null;
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      session.user = { ...session.user, id: user.id };
      // activeOrganizationId — на Session; подтягиваем явно (см. gotcha выше)
      const active = await prisma.session.findFirst({
        where: { userId: user.id, expires: { gt: new Date() } },
        orderBy: { expires: 'desc' },
        select: { activeOrganizationId: true },
      });
      (session.user as any).activeOrganizationId = active?.activeOrganizationId ?? null;
      return session;
    },
  },
});
```

> Альтернатива при нескольких одновременных сессиях: денормализовать `activeOrganizationId` на `User` (обновлять в `switchWorkspace`) — тогда callback читает его из `user` напрямую, без запроса `Session`.

### 4.4. `src/app/(app)/actions/workspace.ts` — переключение (`→ §7.3 arch`)

```ts
'use server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function switchWorkspace(organizationId: string) {
  const user = await getCurrentUser();
  // авторизация: проверить активное членство перед сменой org
  const m = await prisma.membership.findFirst({
    where: { userId: user.id, organizationId, status: 'active' },
  });
  if (!m) throw new Error('FORBIDDEN');
  await prisma.session.updateMany({
    where: { userId: user.id, expires: { gt: new Date() } },
    data: { activeOrganizationId: organizationId },
  });
  revalidatePath('/', 'layout');
}
```

### 4.5. `src/lib/convertLead.ts` — переписанная транзакция (`→ §9.3 arch`)

```ts
'use server';
import { Prisma } from '@prisma/client';
import { getTenantPrisma } from '@/lib/auth/session';
import { safeRevalidate } from '@/lib/revalidate';
import { convertLeadSchema, type ConvertLeadInput } from '@/lib/validators';

export async function convertLead(leadId: string, rawInput: unknown) {
  const parsed = convertLeadSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  const input: ConvertLeadInput = parsed.data;

  try {
    const db = await getTenantPrisma();
    return await db.$transaction(async (tx) => {
      // (1) findFirst вместо findUnique — чужой лид не сконвертируется
      const lead = await tx.lead.findFirst({ where: { id: leadId } });
      if (!lead) return { ok: false as const, error: 'lead_not_found' };
      if (lead.status === 'converted') return { ok: false as const, error: 'lead_already_converted' };

      // (2) upsert по compound-unique [organizationId, name]
      const customer = await tx.customer.upsert({
        where: { organizationId_name: { organizationId: lead.organizationId, name: input.accountName } },
        update: {},
        create: { name: input.accountName }, // organizationId инжектится extension-ом
      });

      // (3) contact.create получает organizationId от extension
      const contact = await tx.contact.create({
        data: { name: input.contactName, email: input.contactEmail || null, phone: input.contactPhone || null, accountId: customer.id },
      });

      let opportunity: { id: string } | null = null;
      if (input.createOpportunity && input.opportunityTitle) {
        // (4) stage.findFirst — квалификация в рамках org
        const stage = await tx.stage.findFirst({ where: { name: 'qualification' } });
        if (!stage) throw new Error('Stage "qualification" not found — выполните npm run db:seed');
        opportunity = await tx.opportunity.create({
          data: { title: input.opportunityTitle, amount: input.opportunityAmount ?? null, accountId: customer.id, contactId: contact.id, leadId: lead.id, stageId: stage.id },
        });
      }

      await tx.lead.update({ where: { id: leadId }, data: { status: 'converted' } });
      safeRevalidate('/leads'); safeRevalidate(`/leads/${leadId}`); safeRevalidate('/dashboard');
      return { ok: true as const, accountId: customer.id, contactId: contact.id, opportunityId: opportunity?.id ?? null };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { ok: false as const, error: 'lead_already_converted' };
    }
    throw err;
  }
}
```

---

## 5. Реализационные gotchas (`→ §9 arch`)

1. **`findUnique` несовместим с tenant-фильтром.** `WhereUniqueInput` принимает только уникальный селектор; инжект `organizationId` → type-error. Все id-lookups → `findFirst`.
2. **`update`/`delete` по одиночному id не авто-фильтруются.** Либо `findFirst({id, organizationId})` → `update({where:{id}})` (есть 404 через P2025), либо `updateMany`/`deleteMany` (атомарны, но молча возвращают `{count:0}` — нет 404). Выбор зависит от нужной семантики ошибок.
3. **`upsert` требует compound-unique в `where`.** Глобальный `upsert({name})` ломается на per-tenant unique → `where: { organizationId_name: { organizationId, name } }`. В extension `where` для upsert НЕ инжектится намеренно.
4. **`activeOrganizationId` на `Session`, не на `User`.** Без явного подтягивания в callback `session` — `getCurrentOrgId()` всегда падает (см. §4.3).
5. **Neon pooling + будущий RLS.** `SET LOCAL` работает только внутри `$transaction`; при включении RLS все server actions придется оборачивать. Сейчас RLS отложен.
6. **`Set-Cookie` / `revalidate` в server actions.** `safeRevalidate` глушит ошибку Next вне request-context (используется в smoke-тестах).

---

## 6. Порядок выполнения (команды)

```bash
# 0. ветка
git switch -c feat/multi-tenant-auth

# 1. зависимости
npm i next-auth @auth/prisma-adapter bcryptjs resend && npm i -D @types/bcryptjs

# 2. применить схему + миграции (стадии 1→3)
npx prisma migrate dev            # стадия 1 (авто)
# стадия 2: --create-only, вписать SQL из §3.2, затем:
npx prisma migrate dev
# стадия 3: --create-only, вписать SQL из §3.3, затем:
npx prisma migrate dev

# 3. обновить seed.ts (§3.4) и пересобрать данные
npm run db:reset

# 4. код модулей (§4), рефакторинг server actions (§7), UI (§7 affected)

# 5. проверки (§8)
npm run lint && npm run build
```

---

## 7. Affected surface (файлы) (`→ §12 arch`)

**Создаются:**
- `src/auth.ts` — Auth.js v5 config.
- `src/app/api/auth/[...nextauth]/route.ts` — `export { GET, POST } from '@/auth'` handlers.
- `src/lib/auth/session.ts` — `getCurrentUser`/`getCurrentOrgId`/`getTenantPrisma`.
- `src/app/login/page.tsx`, `src/app/register/page.tsx`.
- `src/app/invite/[token]/page.tsx`.
- `src/app/(app)/layout.tsx` — guard (если нет сессии → redirect `/login`).
- `src/app/(app)/actions/workspace.ts` — `switchWorkspace`.
- `src/middleware.ts` (опц.) — редирект неавторизованных.

**Переименовываются:**
- `src/lib/accounts.ts` → `src/lib/customers.ts` (`prisma.account.*` → `prisma.customer.*`).
- `src/app/accounts/` → `src/app/customers/`.

**Правятся:**
- `prisma/schema.prisma`, `prisma/seed.ts` (§2, §3.4).
- `src/lib/db.ts` — `+createTenantPrisma`.
- `src/lib/{leads,customers,contacts,opportunities,activities,stages,dashboard,convertLead}.ts` — `prisma.*` → `getTenantPrisma()`; `findUnique` → `findFirst`; `upsert` → compound-unique.
- `src/components/NavHeader.tsx` — `/accounts` → `/customers`; + переключатель workspace.
- `eslint.config.mjs` — `no-restricted-imports` (запрет `{ prisma }` из `@/lib/db` вне `db.ts`/`auth`).
- `package.json` — зависимости (§6).

**Не трогаются:** `src/lib/{labels,types,validators,revalidate}.ts`, UI-компоненты кроме `NavHeader`.

---

## 8. Критерии приёмки (проверка)

| Что | Команда / действие | Ожидаемый результат |
|---|---|---|
| Миграции | `prisma migrate dev` на свежей и существующей dev-БД | без ошибок |
| Seed | `npm run db:reset` | счётчики 5/4/5/6/6/8 (Stage/Customer/Contact/Lead/Opportunity/Activity); ≥2 просроченные + ≥2 на сегодня задачи |
| Tenant-поля | `prisma studio` | каждая бизнес-строка имеет `organizationId`; `Lead.ownerUserId` → owner User |
| Per-tenant unique | две org со стадией `qualification` и клиентом «ООО Ромашка» | создаются без конфликта |
| Auth | `/register` → owner залогинен; `/login` с неверным паролем | сессия создана / отклонена |
| Изоляция | две org, запрос лидов в каждой | данные не пересекаются |
| convertLead | контрольный сценарий `final-mvp.md` | лид → customer/contact/opportunity, статус `converted` |
| Workspace | переключатель org | данные переключаются; переключение на чужую org → `FORBIDDEN` |
| Lint/Build | `npm run lint && npm run build` | чисто |

---

## 9. Связь с архитектурным документом

| Реализация (этот документ) | Архитектура (`auth-architecture-v4.md`) |
|---|---|
| §2 целевой `schema.prisma` | §5 целевая модель данных |
| §3 SQL-миграции | §8 стратегия перехода |
| §4.1 `createTenantPrisma` | §6.2 двухуровневая tenant-фильтрация |
| §4.3 Auth.js + callback | §4 аутентификация, §7.4 запрос к данным |
| §4.5 `convertLead` | §9.3 критичная транзакция |
| §5 gotchas | §9 конфликты и узкие места |
| §7 affected surface | §12 (если есть) / реализационная деталь |

Архитектура говорит «**что** и **почему**»; этот документ — «**как**». При изменении стека (Prisma→Drizzle, Auth.js→Clerk) архитектурный документ остаётся, этот переписывается.
