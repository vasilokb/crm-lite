-- ===== A3: Rename CRM Account -> Customer (ДАННЫЕ СОХРАНЯЮТСЯ) =====
ALTER TABLE "Account" RENAME TO "Customer";

-- Переименовать констрейнты/индексы под префикс Customer (иначе drift в shadow-DB):
ALTER TABLE "Customer" RENAME CONSTRAINT "Account_pkey" TO "Customer_pkey";
ALTER TABLE "Customer" RENAME CONSTRAINT "Account_organizationId_fkey" TO "Customer_organizationId_fkey";
ALTER INDEX IF EXISTS "Account_organizationId_name_key" RENAME TO "Customer_organizationId_name_key";
ALTER INDEX IF EXISTS "Account_organizationId_idx" RENAME TO "Customer_organizationId_idx";
-- FK Contact.accountId и Opportunity.accountId продолжают ссылаться на таблицу (теперь Customer);
-- их констрейнты ("Contact_accountId_fkey", "Opportunity_accountId_fkey") не трогаем —
-- Prisma именует их по колонке accountId, имена совпадают со схемой.

-- ===== A3: Создать Auth.js Account (новая, пустая; OAuth отложен) =====
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;