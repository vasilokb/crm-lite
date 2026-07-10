# Phase A3 — Rename `Account` → `Customer` · D

> Детальный план для фазы A3 из [`../../auth-plan.md`](../../auth-plan.md) §9.
> **Контекст для агента:** прочитай [`../../auth-architecture-v4.md`](../../auth-architecture-v4.md) §9.1 + [`../../auth-implementation.md`](../../auth-implementation.md) §3.3. Фаза A2 уже `[x]`.

## 1. Что делаем

Переименовать таблицу `Account` (CRM-домен «компания-заказчик») в `Customer`, чтобы устранить конфликт имён с `Account` от Auth.js. Данные должны сохраниться (НЕ drop+create).

## 2. Артефакты

В `prisma/schema.prisma` модель уже объявлена как `Customer` (см. целевую схему в `auth-implementation.md` §2). Миграция — ручная:

```bash
npx prisma migrate dev --create-only --name rename_account_to_customer
```

`prisma/migrations/<ts>_rename_account_to_customer/migration.sql`:
```sql
ALTER TABLE "Account" RENAME TO "Customer";

-- индексы/констрейнты остались по старым именам (работают); при желании переименовать:
ALTER INDEX IF EXISTS "Account_organizationId_name_key" RENAME TO "Customer_organizationId_name_key";
ALTER INDEX IF EXISTS "Account_organizationId_idx" RENAME TO "Customer_organizationId_idx";
-- FK Contact.accountId / Opportunity.accountId продолжают ссылаться на ту же таблицу (теперь Customer) —
-- Prisma перегенерирует имена при `prisma generate`; связи по значению не меняются.
```

Применить:
```bash
npx prisma migrate dev
npx prisma generate
```

## 3. Порядок
Фаза A3 ПОСЛЕ A2 (per-tenant unique на `Account.name` уже применён к таблице `Account`, переименование сохраняет структуру).

## 4. Test-критерии (только БД — сборка ещё сломана до A8)

- `prisma migrate status` — clean.
- `SELECT to_regclass('public."Customer"');` → не null; `SELECT to_regclass('public."Account"');` → null.
- Данные сохранены: `SELECT count(*) FROM "Customer";` == 4 (seed) / как было.
- Scoped tsx (проверка клиента без компиляции всего проекта):
```bash
npx tsx -e "import { prisma } from './src/lib/db'; const c = await prisma.customer.findFirst(); console.log('Customer ok:', !!c);"
```
- **Whole-project `tsc` НЕ гейт здесь** (он сломан A2→A8): серверный код ещё ссылается на `prisma.account`/тип `Account` — чинится в A8. Здесь — только БД + `prisma generate` отработал и `prisma.customer` доступен.

## 5. Коммит
```bash
git add prisma/migrations/<ts>_rename_account_to_customer/ prisma/schema.prisma
git commit -m "feat(db): rename Account → Customer (конфликт с Auth.js) — фаза A3"
```
После Test — `[x]` в `auth-plan.md` §2 (A3).
