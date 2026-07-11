# Компонентная структура CRM-lite

> Внутреннее устройство контейнера **Next.js Application** (уровень компонентов/модулей). Дополняет `architecture.md` (там — контейнерный обзор; здесь — из чего собрано приложение и кто от кого зависит).
> Диаграмма отражает **реализованную** структуру (после A1–A9b).

---

## 1. Компонентная диаграмма (по слоям)

```plantuml
@startuml
skinparam componentStyle rectangle
skinparam linetype polyline
hide footbox
title CRM-lite — Компонентная структура (слои)

actor "Запрос\n(браузер)" as Req

package "Presentation" {
  component "Public pages\n/login · /register · /invite\n(Form + action)" as Public
  component "Protected pages\n/dashboard · /leads · /customers\n/contacts · /opportunities · /team" as Pages
  component "@modal/(.)<entity>/[id]\nDrawer-overlay (intercept)" as Intercept
  component "Shared UI\nNavHeader · Drawer · *Card · *Form\nTeamControls · PasswordInput" as UI
  component "app/layout.tsx\n(root: NavHeader + @modal slot)" as Layout
}

package "Server Actions & Domain" {
  component "Entity actions (src/lib)\nleads · customers · contacts · opportunities\nactivities · stages · convertLead · dashboard" as Entity
  component "Identity & Team actions\nregister · login · invite · team.ts · workspace.ts" as Identity
}

package "Auth & Tenant infra" {
  component "auth.ts\nAuth.js v5" as AuthJs
  component "middleware.ts\n(cookie-guard, edge)" as MW
  component "session.ts\ngetCurrentUser / getCurrentOrgId\ngetTenantPrisma" as Sess
  component "db.ts\nprisma + createTenantPrisma" as Db
}

package "Utils" {
  component "validators (Zod)\nlabels · types · revalidate" as UtilKit
}

component "@prisma/client" as Client
database "PostgreSQL (Neon)" as DB
cloud "Resend" as Resend

' === точка входа ===
Req --> MW : каждый запрос
Req --> Layout : рендер

' === Presentation: кто кого вызывает ===
MW --> Public : редирект /login (нет cookie)
MW --> Pages : пропуск (cookie есть)
Layout --> UI : NavHeader
Layout --> AuthJs : auth() для NavHeader
Pages --> Intercept : soft-nav → overlay
Pages --> Entity : данные списков
Pages --> UI : карточки/формы
Intercept --> Entity : getLead/getCustomer/...
Intercept --> UI : Drawer
UI --> Entity : ConvertLeadAccordion → convertLead
UI --> Identity : NavHeader → switchWorkspace

' === Public → actions/auth ===
Public --> Identity : register/invite actions
Public --> AuthJs : signIn (login)

' === Actions → infra ===
Entity --> Sess : getTenantPrisma()
Entity --> UtilKit : Zod / лейблы
Identity --> Db : raw prisma (User/Org/Membership/Session)
Identity --> Sess : getCurrentUser / getCurrentOrgId
Identity --> AuthJs : signIn
Identity --> Resend : createInvite

' === Infra → data ===
Sess --> Db : createTenantPrisma(orgId)
AuthJs --> Db : Prisma adapter (User/Session)
Db --> Client
Client --> DB

note right of Entity
  <b>Правило:</b> entity-действия — ТОЛЬКО через
  getTenantPrisma(); сырой prisma запрещён (ESLint).
  Identity/Team — исключение: работают с
  не-tenant-scoped таблицами (User/Org/Membership/...).
end note
@enduml
```

> Если всё ещё шире, чем хочется — рендери с `left to right direction` (слои встанут колонками слева направо, диаграмма станет выше и у́же). Но с объединёнными узлами и `linetype polyline` обычно укладывается компактно сверху вниз.

---

## 2. Слои и их ответственность

| Слой | Что входит | Ответственность |
|---|---|---|
| **Presentation** | `src/app/**` (маршруты + `layout.tsx`), `src/components/**` | RSC-страницы, клиентские формы/компоненты, Drawer-overlay (`@modal`), `NavHeader` |
| **Server Actions & Domain** | `src/lib/*.ts` (entity CRUD, `convertLead`, `dashboard`) + `src/app/actions/*.ts` (`team`, `workspace`) + действия в папках маршрутов (`register`/`login`/`invite`) | Бизнес-логика; две подкатегории — **tenant-scoped** (через `getTenantPrisma`) и **identity/tenancy** (сырой `prisma`) |
| **Auth & Tenant infra** | `src/auth.ts`, `src/middleware.ts`, `src/lib/auth/session.ts`, `src/lib/db.ts` | Auth.js v5, guard, контекст сессии, tenant-extension, Prisma-синглтон |
| **Utils** | `src/lib/{validators,labels,types,revalidate}.ts` | Zod-схемы, типы, лейблы, revalidate-хелпер |
| **Data** | `prisma/schema.prisma` → `@prisma/client` → PostgreSQL (Neon) | Хранилище |

---

## 3. Ключевые архитектурные правила (инварианты)

1. **Два класса server-actions:**
   - **Entity CRUD** (`leads/customers/contacts/opportunities/activities/stages`, `convertLead`, `dashboard`) — **только через `getTenantPrisma()`**. Изоляция гарантируется extension-ом.
   - **Identity & Team** (`register`/`login`/`invite` accept, `team.ts`, `workspace.ts`) — работают с **не-tenant-scoped** таблицами (`User`, `Organization`, `Membership`, `Session`, `InviteToken`) → **сырой `prisma`** напрямую (разрешено).
2. **Сырой `prisma` запрещён** в entity-слое и в компонентах (ESLint `no-restricted-imports`: `import { prisma } from '@/lib/db'`). Разрешён только в `db.ts`, `auth/*` и identity/team действиях.
3. **`getTenantPrisma()`** = `createTenantPrisma(await getCurrentOrgId())`. `getCurrentOrgId` читает `activeOrganizationId` из `session.user` (стратегия **JWT**: токен подписывает Auth.js ключом `AUTH_SECRET`, обогащается в `jwt`-callback из `Session.activeOrganizationId` в БД, копируется в `session.user` в `session`-callback). Единая точка tenant-изоляции.
4. **Точка входа запроса:** браузер → `middleware` (cookie-presence, edge) → маршрут; параллельно `layout.tsx` тянет сессию для `NavHeader`. Public-маршруты (`/login`/`/register`/`/invite`) middleware пропускает.
5. **`convertLead`** — единственная кросс-сущностная `$transaction` через tenant-клиент (`tx` наследует extension): создаёт customer/contact/opportunity в одной org.

---

## 4. Поток зависимостей (направление)

```
Запрос → Presentation → Server Actions & Domain → Auth & Tenant infra → @prisma/client → PostgreSQL
```

Слои не пропускаются: Presentation не лезет в `db.ts`/`prisma` напрямую — только через actions; actions не знают про cookie/headers — только через `getCurrentUser/OrgId`. Утилиты (`validators`, `labels`) — точечные зависимости любого слоя.

---

## 5. Связь с другими документами

- `architecture.md` — контейнерный обзор (Web Client / Next.js / Neon / Resend) и потоки аутентификации/изоляции.
- `auth-architecture-v4.md` — обоснование решений (почему shared-schema, почему extension, роли и т.д.).
- `auth-implementation.md` — код-уровень (целевой `schema.prisma`, SQL-миграции, код `createTenantPrisma`/`convertLead`).
- Здесь — **из чего собрано приложение** (модули и их зависимости).
