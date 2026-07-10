# Phase A8 — Рефакторинг кода + rename (backend + UI) · B+F

> Детальный план для фазы A8 из [`auth-plan.md`](auth-plan.md) §9.
> **Контекст для агента:** прочитай [`../../auth-architecture-v4.md`](../../auth-architecture-v4.md) §9.3 + [`../../auth-implementation.md`](../../auth-implementation.md) §4.5, §7. Фазы A1–A7 уже `[x]`.
> **Эта фаза — точка восстановления сборки.** Сборка была намеренно сломана с A2 (per-tenant unique) / A3 (rename таблицы). Здесь весь код приводится к финальной схеме + tenant-клиенту, и `tsc`/`lint` снова зелёные.

## 1. Что делаем

Две сцепленные задачи в одной фазе (нельзя разносить — иначе сборка остаётся сломанной):
1. **Rename `Account` → `Customer` в коде** (БД уже переименована в A3): `prisma.account`→`prisma.customer`, тип `Account`→`Customer`, файл `accounts.ts`→`customers.ts`, роут `/accounts`→`/customers`, `NavHeader`, компоненты.
2. **Tenant-рефакторинг** всех 8 server-action файлов: `prisma.*`→`getTenantPrisma()`; `findUnique`→`findFirst`; `upsert`→compound-unique; `convertLead` — 4 грабли.

## 2. Артефакты и правки

### 2.1. Rename (backend + UI)
- `src/lib/accounts.ts` → `src/lib/customers.ts`; внутри — всё из п. 2.2 (tenant + rename).
- `src/app/accounts/` → `src/app/customers/` (роут + page).
- `src/components/NavHeader.tsx`: `/accounts` → `/customers`.
- Все `import { Account } from '@prisma/client'` → `Customer`; типы в карточках/формах (`AccountCard`, `AccountForm`, списки).
- `convertLead.ts`: `account.upsert` → `customer.upsert` (см. 2.3).
- Опц.: редирект `/accounts` → `/customers` в `middleware` или `next.config`.

### 2.2. Шаблон tenant-замены (в каждом `src/lib/*.ts`)
```ts
// ДО
import { prisma } from './db';
const items = await prisma.lead.findMany({ where, ... });
const one  = await prisma.lead.findUnique({ where: { id } });
await prisma.lead.update({ where: { id }, data });

// ПОСЛЕ
import { getTenantPrisma } from '@/lib/auth/session';
const db = await getTenantPrisma();
const items = await db.lead.findMany({ where, ... });            // organizationId авто
const one  = await db.lead.findFirst({ where: { id } });         // findUnique → findFirst
await db.lead.update({ where: { id }, data });                   // только ПОСЛЕ findFirst-проверки tenant
```
**Файлы (8):** `leads.ts`, `customers.ts`(ex-accounts), `contacts.ts`, `opportunities.ts`, `activities.ts`, `stages.ts`, `dashboard.ts`, `convertLead.ts`.

### 2.3. `convertLead.ts` — 4 грабли (полный код — impl §4.5)
1. `findUnique({id})` → `findFirst({where:{id}})` (чужой лид не сконвертируется).
2. `account.upsert({name})` → `customer.upsert({ where: { organizationId_name: { organizationId: lead.organizationId, name } } })`. **`lead.organizationId` гарантированно равен `orgId` сессии** — лид найден через `findFirst` с авто-фильтром (extension), поэтому compound-where согласован с tenant-клиентом.
3. `stage.findUnique({name})` → `stage.findFirst({where:{name}})`.
4. Все `create` получают единый `organizationId` (extension).

## 3. Порядок
A8 ПОСЛЕ A7 (tenant-клиент готов) и A3 (таблица `Customer`). dashboard.ts — агрегации через `db.*` (фильтр автоматически). Особое внимание — `convertLead` (единственная `$transaction`).

## 4. Test-критерии (whole-project — гейт восстановления сборки)

```bash
npx tsc --noEmit   # exit 0  ← впервые зелёный после A2
npm run lint       # exit 0  (все raw-prisma нарушения устранены)
```
- Smoke (tsx, по образцу `../phase-8-convert-lead.md` §4): две org, в каждой свои данные; `getLeads()` в orgA → только лиды orgA.
- `convertLead`: успех → customer/contact/(opportunity); race (Promise.all) → один ok + второй `lead_already_converted`.
- `/customers` открывается, `/accounts` редиректит; типы `Customer` везде.
- Контрольный сценарий `final-mvp.md` (через UI/tsx, без auth-UI — A9) — лиды/сделки/активности работают через tenant-клиент.

## 5. Коммит
```bash
git add src/lib/ src/app/customers/ src/components/NavHeader.tsx
git commit -m "refactor: server actions на getTenantPrisma() + rename account→customer (code/UI) — фаза A8 (сборка восстановлена)"
```
После Test — `[x]` в `auth-plan.md` §2 (A8).
