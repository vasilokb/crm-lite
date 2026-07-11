# Структура серверного кода CRM-lite (модули и импорты)

> Диаграмма на уровне **фактических файлов** серверной части: кто какой модуль импортирует/вызывает. Раскрывает блоб «Server Actions & Domain» из `architecture-components.md` на конкретные файлы.
> Узлы — реальные файлы; стрелки — импорты/вызовы (`A → B` = A импортирует/вызывает B).

---

## Диаграмма

```plantuml
@startuml
skinparam componentStyle rectangle
skinparam linetype polyline
hide footbox
title CRM-lite — серверный код: файлы и импорты

actor "Запрос\n(браузер)" as Req

package "Presentation (вызывают actions)" {
  component "Public pages\n/login /register /invite" as P_pub
  component "Protected pages\n/dashboard /leads /customers\n/contacts /opportunities /team" as P_pro
  component "Components\nNavHeader · ConvertLeadAccordion\n*Card · *Form · TeamControls" as P_cmp
}

package "Domain actions  (src/lib — tenant-scoped)" {
  component "leads.ts" as L_leads
  component "customers.ts" as L_cust
  component "contacts.ts" as L_cont
  component "opportunities.ts" as L_opp
  component "activities.ts" as L_act
  component "stages.ts\n(seedDefaultStages/seedDemoData)" as L_stages
  component "convertLead.ts\n($transaction)" as L_conv
  component "dashboard.ts" as L_dash
}

package "Identity & team actions  (src/app)" {
  component "register/action.ts" as R_reg
  component "login/action.ts" as R_login
  component "invite/[token]/action.ts" as R_inv
  component "actions/team.ts" as A_team
  component "actions/workspace.ts" as A_ws
}

package "Auth & tenant core" {
  component "src/auth.ts\nAuth.js v5" as C_auth
  component "src/lib/auth/session.ts\ngetCurrentUser / getCurrentOrgId\ngetTenantPrisma" as C_sess
  component "src/lib/db.ts\nprisma + createTenantPrisma" as C_db
}

package "Utils (src/lib)" {
  component "validators.ts\n(Zod)" as U_zod
  component "labels.ts" as U_lab
  component "types.ts" as U_typ
  component "revalidate.ts" as U_rev
}

component "@prisma/client" as D_cli
database "PostgreSQL" as D_db
cloud "Resend" as D_res
component "bcryptjs" as D_bcrypt

' === запрос → pages ===
Req --> P_pub
Req --> P_pro
P_pro --> P_cmp : рендер компонентов

' === pages/components → actions (кто что вызывает) ===
P_pub  --> R_reg
P_pub  --> R_login
P_pub  --> R_inv
P_pro  --> L_leads
P_pro  --> L_cust
P_pro  --> L_cont
P_pro  --> L_opp
P_pro  --> L_act
P_pro  --> L_dash
P_pro  --> A_team
P_cmp  --> L_conv
P_cmp  --> A_ws

' === domain actions → session (getTenantPrisma) + utils ===
L_leads --> C_sess
L_cust  --> C_sess
L_cont  --> C_sess
L_opp   --> C_sess
L_act   --> C_sess
L_stages--> C_sess
L_conv  --> C_sess
L_dash  --> C_sess
L_leads --> U_zod
L_cust  --> U_zod
L_cont  --> U_zod
L_opp   --> U_zod
L_conv  --> U_zod
L_leads --> U_rev
L_conv  --> U_rev
L_leads --> U_typ
L_cust  --> U_typ
L_dash  --> U_lab

' === identity/team → raw prisma + session + auth + внешнее ===
R_reg   --> C_db
R_reg   --> C_auth
R_reg   --> L_stages
R_reg   --> D_bcrypt
R_login --> C_auth
R_inv   --> C_db
R_inv   --> C_auth
R_inv   --> D_bcrypt
A_team  --> C_sess
A_team  --> C_db
A_ws    --> C_sess
A_ws    --> C_db
A_ws    --> D_res

' === core chain ===
C_sess --> C_auth
C_sess --> C_db
C_auth --> C_db
C_db   --> D_cli
D_cli  --> D_db

note bottom of L_conv
  <b>Главное правило:</b>
  domain-actions (src/lib) импортируют ТОЛЬКО getTenantPrisma() из session.ts —
  НИКОГДА db.ts напрямую (ESLint forbids). Изоляция идёт через extension.
  Identity/team-actions — исключение: они работают с User/Org/Membership/Session
  (не tenant-scoped), поэтому берут сырой prisma из db.ts.
end note
@enduml
```

---

## Как читать

- **Верх → низ = направление вызовов:** Запрос → страницы/компоненты → actions → auth/tenant-core → Prisma → PostgreSQL.
- **Две разные «траектории» к данным** (ключевое):
  - **Domain actions** (жёлтые, `src/lib`) → `session.ts::getTenantPrisma()` → tenant-extension → БД с фильтром по `organizationId`. Это все CRUD лидов/компаний/контактов/сделок/активностей + `convertLead` + `dashboard`.
  - **Identity & team actions** (`src/app/...`) → **сырой `prisma` из `db.ts`** + `session.ts` (`getCurrentUser/OrgId`) + `auth.ts` (`signIn`). Они трогают `User/Org/Membership/Session/InviteToken` — не бизнес-данные org.
- **`session.ts` — узловая точка:** и domain-actions (через `getTenantPrisma`), и identity/team (через `getCurrentUser/OrgId`), и `auth.ts` (adapter) сходятся к `db.ts`.
- **Внешние:** `Resend` (только `workspace.ts::createInvite`), `bcryptjs` (register/invite — хеш пароля).
- **`middleware.ts`** здесь не показан — он edge, не импортирует ничего из приложения (только проверка cookie); см. `architecture.md`.

---

## Файлы по каталогам (шпаргалка)

| Каталог | Файлы | Роль |
|---|---|---|
| `src/lib/` | `db.ts`, `auth/session.ts` | infra: Prisma-синглтон, `createTenantPrisma`, контекст сессии |
| `src/lib/` | `leads/customers/contacts/opportunities/activities/stages/convertLead/dashboard.ts` | domain-actions (tenant-scoped) |
| `src/lib/` | `validators/labels/types/revalidate.ts` | утилиты (Zod, лейблы, типы, revalidate) |
| `src/auth.ts` | Auth.js v5 config (Credentials, adapter, **JWT** + jwt/session-callbacks) | |
| `src/app/` | `register/login/invite` action.ts; `actions/team.ts`, `actions/workspace.ts` | identity & team actions (raw prisma) |
| `src/app/**`, `src/components/**` | pages + components | Presentation (вызывают actions) |
| `prisma/schema.prisma` | → `@prisma/client` → PostgreSQL | данные |
