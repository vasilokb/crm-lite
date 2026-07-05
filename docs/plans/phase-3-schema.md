# Phase 3 — Модель данных Prisma + миграция · D

> Детальный план для фазы 3 из `../Plan.md` §10. Открывается агентом непосредственно перед фазой 3.
>
> **Контекст для агента (M15):** прочитай `prisma/schema.prisma` (если есть в `home-work/`) + `../Plan.md` §6.1 + [`../../docs/final-mvp.md`](../../docs/final-mvp.md) §3.1.

## 0. Предварительная очистка (D11 — СТРОГИЙ ПОРЯДОК)

НЕ удалять `prisma.config.ts` до удаления зависимостей — иначе сборка упадёт.

```bash
# Шаг 1
npm uninstall @prisma/adapter-pg PrismaPg

# Шаг 2 — должно быть пусто
grep -E "adapter-pg|PrismaPg|prisma.config" package.json

# Шаг 3
rm prisma.config.ts
ls prisma.config.ts 2>/dev/null  # должно быть "No such file"

# Шаг 4 — чистая установка
rm -rf node_modules package-lock.json && npm install
```

## 1. schema.prisma — структура

Файл `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ===== ENUMS =====
enum LeadSource        { site email phone referral manual }
enum LeadStatus        { new processed converted }
enum OpportunityStatus { open won lost }
enum ActivityType      { note task }

// ===== MODELS =====

model Lead {
  id        String     @id @default(cuid())
  name      String                                   // 2–120, trim
  email     String?
  phone     String?
  company   String?
  source    LeadSource
  status    LeadStatus @default(new)
  owner     String?                                  // простая строка, не User
  budget    Float?
  timeline  String?
  comment   String?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  opportunity Opportunity?

  @@index([source])
  @@index([status])
}

model Stage {
  id       String @id @default(cuid())
  name     String @unique                            // qualification|proposal|negotiation|won|lost
  position Int    @unique                            // 1..5

  opportunities Opportunity[]
}

model Account {
  id        String   @id @default(cuid())
  name      String                                  // 2–200, @unique, trim
  website   String?
  industry  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  contacts      Contact[]
  opportunities Opportunity[]
}

model Contact {
  id        String   @id @default(cuid())
  name      String                                  // 2–120, trim
  email     String?
  phone     String?
  role      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  accountId String?
  account   Account? @relation(fields: [accountId], references: [id], onDelete: Restrict)

  // 1-N: один контакт может участвовать в нескольких Opportunity
  opportunities Opportunity[]

  @@index([accountId])
}

model Opportunity {
  id         String            @id @default(cuid())
  title      String                                 // 2–200, trim
  amount     Float?                                 // >0 если задано
  status     OpportunityStatus @default(open)
  reasonLost String?                                // trim; обязателен при lost
  dueDate    DateTime?                              // плановая дата
  closeDate  DateTime?                              // фактическая (при won/lost)
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt

  stageId   String
  stage     Stage   @relation(fields: [stageId], references: [id], onDelete: SetNull)

  leadId String? @unique                            // D14: защита от race в convert lead
  lead   Lead?   @relation(fields: [leadId], references: [id], onDelete: SetNull)

  accountId String?
  account   Account? @relation(fields: [accountId], references: [id], onDelete: Restrict)

  contactId String?
  contact   Contact? @relation(fields: [contactId], references: [id], onDelete: Restrict)

  activities Activity[]

  @@index([stageId])
  @@index([status])
  @@index([accountId])
  @@index([contactId])
}

model Activity {
  id        String       @id @default(cuid())
  type      ActivityType
  text      String                                  // 1–1000, trim
  dueDate   DateTime?                               // обязателен для task (Zod фаза 5.2)
  done      Boolean      @default(false)
  createdAt DateTime     @default(now())

  opportunityId String
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Restrict)

  @@index([opportunityId])
  @@index([done, dueDate])
}
```

## 2. Команды

```bash
# Шаг 5 — создать schema.prisma по шаблону выше

# Шаг 6 — валидация
npx prisma validate
# Ожидание: "The schema at prisma/schema.prisma is valid 🚀"

# Шаг 7 — миграция
npx prisma migrate dev --name init-crm-schema
# Ожидание: создастся prisma/migrations/<timestamp>_init-crm-schema/migration.sql

# Шаг 8 — генерация Client + ESM-проверка
npx prisma generate
tsx -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); await p.\$disconnect();"
# Ожидание: exit 0, без ошибок

# Шаг 9 — статус
npx prisma migrate status
# Ожидание: "Database schema is up to date"
```

## 3. Test-критерии (для отметки [x] в Plan.md §2)

```bash
# Все 4 enum
grep -E "enum LeadSource|enum LeadStatus|enum OpportunityStatus|enum ActivityType" prisma/schema.prisma

# Все 6 моделей
grep -cE "^model " prisma/schema.prisma  # должно быть 6

# @unique на leadId (D14)
grep -E "leadId.*@unique" prisma/schema.prisma

# @unique на position (Stage)
grep -E "position.*@unique" prisma/schema.prisma

# onDelete: Restrict — ровно 3 (Account→Contact, Account→Opportunity, Opportunity.activities→Activity)
# onDelete: SetNull — ровно 2 (Opportunity.stage, Lead.opportunity)
grep -E "onDelete: Restrict" prisma/schema.prisma | wc -l   # 3
grep -E "onDelete: SetNull" prisma/schema.prisma | wc -l    # 2

# Запреты соблюдены
grep -E "adapter-pg|PrismaPg" package.json prisma.config.ts 2>/dev/null  # пусто
ls prisma.config.ts 2>/dev/null  # No such file
ls node_modules/@prisma/adapter-pg 2>/dev/null  # No such file or directory
```

## 4. Коммит после фазы

```bash
git add prisma/ package.json
git rm prisma.config.ts 2>/dev/null || true
git commit -m "feat: Prisma schema CRM-lite (6 моделей, onDelete Restrict/SetNull, init-crm-schema migration)"
```