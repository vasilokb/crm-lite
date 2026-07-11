# Phase A3 — Rename `Account` → `Customer` + Auth.js `Account` · D

> Детальный план для фазы A3 из [`auth-plan.md`](auth-plan.md) §9.
> **Контекст для агента:** прочитай [`../../auth-architecture-v4.md`](../../auth-architecture-v4.md) §9.1 + [`../../auth-implementation.md`](../../auth-implementation.md) §2, §3.3. Фаза A2 уже `[x]`.

## 1. Что делаем

Две сцепленные задачи в одной фазе (общее имя `Account`):

1. **Переименовать CRM-таблицу `Account` (компания-заказчик) → `Customer`** — устранить конфликт имён с Auth.js; данные сохранить (НЕ drop+create).
2. **Добавить Auth.js-модель `Account` (OAuth-привязки) + `User.accounts`** — её **отложили из A1** именно из-за конфликта; теперь, когда CRM-имя `Account` освобождено rename-ом, добавляем.

> Auth.js `Account` сейчас пустая (OAuth отложен), но нужна `@auth/prisma-adapter` для типов/контракта.

## 2. Артефакты

### 2.1. `prisma/schema.prisma`
- CRM-модель `Account` → переименовать в `Customer` (поля без изменений; `@@unique([organizationId, name])` уже из A2).
- Добавить Auth.js-модель `Account` (пустая, под OAuth на будущее):
```prisma
model Account {                                // Auth.js OAuth-привязки
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
```
- В `User` добавить `accounts Account[]` (в A1 было закомментировано/отложено).

### 2.2. Миграция (ручная правка авто-генерации)
```bash
npx prisma migrate dev --create-only --name rename_account_to_customer
```
Prisma не различает rename и drop+create → сгенерирует `DROP TABLE "Account"` + `CREATE TABLE "Customer"` + `CREATE TABLE "Account"` (Auth.js). **DROP+CREATE для Customer заменяем на `ALTER TABLE RENAME`** (сохранить данные), а `CREATE TABLE "Account"` (Auth.js) оставляем как есть:

```sql
-- 1. Переименовать CRM-таблицу (ДАННЫЕ СОХРАНЯЮТСЯ)
ALTER TABLE "Account" RENAME TO "Customer";
ALTER INDEX IF EXISTS "Account_organizationId_name_key" RENAME TO "Customer_organizationId_name_key";
ALTER INDEX IF EXISTS "Account_organizationId_idx" RENAME TO "Customer_organizationId_idx";

-- 2. Auth.js Account (новая, пустая) — оставить сгенерированное Prisma:
--    CREATE TABLE "Account" (id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, type TEXT, provider TEXT, ...);
--    CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"(provider, "providerAccountId");
--    ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
```

Применить: `npx prisma migrate dev` → `npx prisma generate`.

## 3. Порядок
A3 ПОСЛЕ A2 (per-tenant unique на CRM `Account.name` уже применён). Rename CRM + добавление Auth.js `Account` — в одной миграции: имя `Account` освобождается `ALTER TABLE RENAME` и тут же занимается Auth.js-таблицей.

## 4. Test-критерии (только БД — сборка ещё сломана до A8)

- `prisma migrate status` — clean.
- `SELECT to_regclass('public."Customer"');` → не null; `SELECT to_regclass('public."Account"');` → не null (Auth.js, пустая).
- Данные CRM сохранены: `SELECT count(*) FROM "Customer";` == 4 (seed) / как было.
- `SELECT count(*) FROM "Account";` == 0 (Auth.js, пустая).
- Scoped tsx: `prisma.customer.findFirst()` и `prisma.account.findFirst()` доступны.
- **Whole-project `tsc` НЕ гейт здесь** (сломан A2→A8): серверный код ещё ссылается на `prisma.account`/тип `Account` в смысле CRM — чинится в A8. Здесь — БД + `prisma generate` отработал, оба клиента (`prisma.customer`, `prisma.account`) доступны.

## 5. Коммит
```bash
git add prisma/migrations/<ts>_rename_account_to_customer/ prisma/schema.prisma
git commit -m "feat(db): rename Account→Customer + add Auth.js Account model — фаза A3"
```
После Test — `[x]` в `auth-plan.md` §2 (A3).
