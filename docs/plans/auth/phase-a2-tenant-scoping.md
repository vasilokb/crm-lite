# Phase A2 — Tenant-scoping бизнес-таблиц (ручной SQL) · D

> Детальный план для фазы A2 из [`../../auth-plan.md`](../../auth-plan.md) §9. Открывается перед стартом фазы.
> **Контекст для агента:** прочитай [`../../auth-architecture-v4.md`](../../auth-architecture-v4.md) §5.2 + [`../../auth-implementation.md`](../../auth-implementation.md) §3.2. Фаза A1 (новые таблицы) уже `[x]`.

## 1. Что делаем

Добавить `organizationId` (NOT NULL + FK + индекс) на 6 бизнес-таблицах и перевести глобальные unique в per-tenant. `prisma migrate dev` упадёт на NOT NULL без default → миграция ручная.

## 2. Артефакты — SQL миграции

```bash
npx prisma migrate dev --create-only --name tenant_scope_business
```

Открыть сгенерированный `prisma/migrations/<ts>_tenant_scope_business/migration.sql` и вписать (см. полный SQL в `auth-implementation.md` §3.2). Ключевые шаги на каждую таблицу (`Lead`, `Account`, `Stage`, `Contact`, `Opportunity`, `Activity`):

```sql
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

-- паттерн (повторить для каждой бизнес-таблицы):
ALTER TABLE "Lead" ADD COLUMN "organizationId" TEXT;
UPDATE "Lead" SET "organizationId" = current_setting('tmp.default_org');
ALTER TABLE "Lead" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");
```

**Специфика по таблицам:**
- `Lead`: ещё `RENAME COLUMN "owner" TO "ownerUserId"` + FK → `User` `ON DELETE SET NULL`.
- `Stage`: `DROP INDEX "Stage_name_key"`, `DROP INDEX "Stage_position_key"` → `CREATE UNIQUE INDEX "Stage_organizationId_name_key"`, `"..._position_key"`.
- `Account`: `DROP INDEX "Account_name_key"` → `CREATE UNIQUE INDEX "Account_organizationId_name_key"`.
- `Contact`: `DROP INDEX "Contact_email_key"` → `CREATE UNIQUE INDEX "Contact_organizationId_email_key"`.
- `Opportunity`: ещё пересоздать `Opportunity_stageId_fkey` с `ON DELETE RESTRICT` (было `SetNull` — баг NOT NULL+SetNull).
- `Activity`: только `+organizationId`.

## 3. Порядок критичен
`Organization` (фаза A1) должна существовать ДО NOT NULL `organizationId`. Все FK → `Organization` `ON DELETE CASCADE` (v4 §12).

> **Плановая поломка сборки:** после A2 `Account.name` перестаёт быть глобально-уникальным → `convertLead` (`upsert({where:{name}})`/`findUnique({name})`) и любой lookup по имени перестают компилироваться. Это нормально — код адаптируется в A8. В A2–A7 Test = только DB-проверки; whole-project `tsc` — гейт с A8.

## 4. Test-критерии

```bash
# применить миграцию
npx prisma migrate dev
# на пустой БД — без ошибок
npx prisma migrate reset --force && npx prisma migrate dev
```
- `prisma studio`: на каждой бизнес-таблице есть `organizationId NOT NULL`, FK, индекс.
- per-tenant unique: вставить две строки с одинаковым `[organizationId=X, name]` → ошибка P2002; с разными `organizationId` — ок.
- `Lead.ownerUserId` существует, `Lead.owner` нет.
- `Opportunity.stageId` FK → `RESTRICT` (проверить в `prisma migrate status` / DDL).

## 5. Коммит
```bash
git add prisma/migrations/<ts>_tenant_scope_business/ prisma/schema.prisma
git commit -m "feat(db): tenant-scoping бизнес-таблиц (organizationId + per-tenant unique) — фаза A2"
```
После прохождения Test — отметить `[x]` в `auth-plan.md` §2 (A2).
