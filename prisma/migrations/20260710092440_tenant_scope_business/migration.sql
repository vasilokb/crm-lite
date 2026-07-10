-- 0. Гарантировать наличие Organization для backfill (для existing seed-данных)
INSERT INTO "Organization"(id,name,slug,"createdAt","updatedAt")
SELECT gen_random_uuid()::text,'Demo Agency','demo-agency',now(),now()
WHERE NOT EXISTS (SELECT 1 FROM "Organization");
-- (если локальный PG <13 и gen_random_uuid недоступен — заменить на md5(random()::text||clock_timestamp()::text))

-- ===== Lead =====
ALTER TABLE "Lead" ADD COLUMN "organizationId" TEXT;
UPDATE "Lead" SET "organizationId" = (SELECT id FROM "Organization" ORDER BY "createdAt" LIMIT 1);
ALTER TABLE "Lead" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");
-- owner String? -> ownerUserId (DROP старой строки + ADD новой; НЕ rename — иначе FK-нарушение на seed-данных)
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "owner";
ALTER TABLE "Lead" ADD COLUMN "ownerUserId" TEXT;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL;
CREATE INDEX "Lead_ownerUserId_idx" ON "Lead"("ownerUserId");

-- ===== Stage =====
ALTER TABLE "Stage" ADD COLUMN "organizationId" TEXT;
UPDATE "Stage" SET "organizationId" = (SELECT id FROM "Organization" ORDER BY "createdAt" LIMIT 1);
ALTER TABLE "Stage" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
CREATE INDEX "Stage_organizationId_idx" ON "Stage"("organizationId");
DROP INDEX IF EXISTS "Stage_name_key";
DROP INDEX IF EXISTS "Stage_position_key";
CREATE UNIQUE INDEX "Stage_organizationId_name_key" ON "Stage"("organizationId","name");
CREATE UNIQUE INDEX "Stage_organizationId_position_key" ON "Stage"("organizationId","position");

-- ===== Account (CRM; rename -> Customer в A3) =====
ALTER TABLE "Account" ADD COLUMN "organizationId" TEXT;
UPDATE "Account" SET "organizationId" = (SELECT id FROM "Organization" ORDER BY "createdAt" LIMIT 1);
ALTER TABLE "Account" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Account" ADD CONSTRAINT "Account_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
CREATE INDEX "Account_organizationId_idx" ON "Account"("organizationId");
DROP INDEX IF EXISTS "Account_name_key";
CREATE UNIQUE INDEX "Account_organizationId_name_key" ON "Account"("organizationId","name");

-- ===== Contact =====
ALTER TABLE "Contact" ADD COLUMN "organizationId" TEXT;
UPDATE "Contact" SET "organizationId" = (SELECT id FROM "Organization" ORDER BY "createdAt" LIMIT 1);
ALTER TABLE "Contact" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
CREATE INDEX "Contact_organizationId_idx" ON "Contact"("organizationId");
DROP INDEX IF EXISTS "Contact_email_key";
CREATE UNIQUE INDEX "Contact_organizationId_email_key" ON "Contact"("organizationId","email");

-- ===== Opportunity =====
ALTER TABLE "Opportunity" ADD COLUMN "organizationId" TEXT;
UPDATE "Opportunity" SET "organizationId" = (SELECT id FROM "Organization" ORDER BY "createdAt" LIMIT 1);
ALTER TABLE "Opportunity" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
CREATE INDEX "Opportunity_organizationId_idx" ON "Opportunity"("organizationId");
-- фикс бага NOT NULL + SetNull -> Restrict
ALTER TABLE "Opportunity" DROP CONSTRAINT IF EXISTS "Opportunity_stageId_fkey";
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_stageId_fkey"
  FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE RESTRICT;

-- ===== Activity =====
ALTER TABLE "Activity" ADD COLUMN "organizationId" TEXT;
UPDATE "Activity" SET "organizationId" = (SELECT id FROM "Organization" ORDER BY "createdAt" LIMIT 1);
ALTER TABLE "Activity" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
CREATE INDEX "Activity_organizationId_idx" ON "Activity"("organizationId");