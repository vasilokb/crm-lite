# CRM-lite: Авторизация (B2B multi-tenant) — Plan — Code — Test

> **Расширение за рамками MVP** (`home-work/Plan.md` §3: «без auth / без multi-tenant» закрыты). Этот план — отдельная дорожка поверх готового CRM-MVP.
> **Активные источники контракта:**
> - [`auth-architecture-v4.md`](../../auth-architecture-v4.md) — архитектура (ЧТО/ПОЧЕМУ).
> - [`auth-implementation.md`](../../auth-implementation.md) — реализация (КАК: целевой `schema.prisma`, SQL, код).
> - [`final-mvp.md`](../../final-mvp.md) — контракт CRM (сценарий приёмки).
> Цель: превратить решения архитектуры в исполнимые фазы по слоям **D** (database) / **B** (backend) / **F** (frontend) с Test-критериями и мини-планами.

---

## 1. Что делаем

Превращаем single-tenant CRM в B2B SaaS: компании-клиенты регистрируются со своими сотрудниками; каждый сотрудник видит только данные своей организации. Изоляция — shared DB + `organizationId`, фильтрация на уровне приложения через централизованный tenant-клиент. Аутентификация — Auth.js v5 (email/пароль, database-session). Подробно — в архитектурном документе v4 (§2–§7), реализация — в `auth-implementation.md` (§2–§8).

**Зафиксированные решения (из v4):** shared-schema · app-level tenant-фильтр (RLS отложен) · Auth.js v5 + database-session · email/пароль (OAuth отложен) · роли owner/member · `Account` → `Customer` · email через Resend.

---

## 2. Активное состояние

Обновляется после каждого шага. После закрытия всех фаз — в архив.

| Фаза | Слой | Статус | Закрыта | Комментарий |
|---|---|---|---|---|
| A1. Миграция: identity + tenancy (новые таблицы) | D | [x] | [x] | 2026-07-10 — 20260710055939_add_identity_and_tenancy |
| A2. Миграция: tenant-scoping бизнес-таблиц (ручной SQL) | D | [x] | [x] | 2026-07-10 — tenant_scope_business (сборка сломана до A8 планово) |
| A3. Миграция: rename таблицы `Account` → `Customer` | D | [x] | [x] | 2026-07-10 — rename_account_to_customer |
| A4. Обновление seed под multi-tenant | D | [x] | [x] | 2026-07-10 — seed multi-tenant (default org + owner + organizationId) |
| A5. Auth.js v5: config + adapter + callbacks | B | [x] | [x] | 2026-07-10 — Auth.js v5 + database-session + getCurrentUser/getCurrentOrgId |
| A6. Контекст сессии: `getCurrentUser`/`getCurrentOrgId` | B | [x] | [x] | 2026-07-10 — см. A5 |
| A7. Tenant-клиент `createTenantPrisma` + ESLint | B | [x] | [x] | 2026-07-10 — createTenantPrisma + ESLint no-restricted-imports |
| A8. Рефакторинг кода: server actions + rename (backend+UI) | B+F | [x] | [x] | 2026-07-10 — server actions на getTenantPrisma() + rename account→customer (code/UI); сборка восстановлена (tsc+lint green) |
| A9. Auth UI: login/register/invite + workspace + guards | F+B | [x] | [x] | 2026-07-10 — login/register/invite UI + switchWorkspace + middleware guard (без переноса роутов) |
| A9b. Команда (members/invites) + профиль-меню + имя | F+B | [x] | [x] | 2026-07-10 — team UI (members/invites) + logout + name + password toggle |
| A10. Приёмка: изоляция 2 org + сценарий final-mvp + lint/build | F+B+D | [x] | [x] | 2026-07-11 — acceptance пройден (см. TEST_REPORT.md) |

**Правило:** после Test-критерия — `[x]`; если не прошло — «⚠ <дата>: <что не прошло>» и корректировка следующих шагов. Не переходить к следующей фазе, пока текущая не `[x]`.

> **Важно (окно сломанной сборки A2→A8):** фазы A2–A3 меняют схему (per-tenant unique, rename) так, что существующий код (`convertLead` с `upsert({name})`/`findUnique({name})`, `prisma.account`, тип `Account`) перестаёт компилироваться. Это **плановое** состояние: код адаптируется к новой схеме в фазе **A8**, где и восстанавливается `tsc`/`build`. Поэтому в A2–A7 Test-критерии — scoped (tsx-smoke / DB-проверки), а whole-project `tsc --noEmit` и `npm run lint` становятся гейтом только с A8.

---

## 3. Границы (что НЕ входит — из v4 §12)

- **Без OAuth** сейчас (схема готова — таблица `Account` от Auth.js присутствует).
- **Без RLS** сейчас (Neon pooling + `$transaction`; app-level достаточно). Перспектива — v4 §11.
- **Без ролей выше owner/member** (admin — в перспективе).
- **Без UI удаления Organization** (FK `Cascade` на бизнес-таблицах, но кнопки нет — MVP запрещает удаление).
- **Без audit log, SSO/SAML, биллинга** — перспектива (v4 §11).
- **Не трогать** бизнес-правила CRM из `home-work/Plan.md` §6 (convert lead, won/lost, optimistic UI) — они лишь адаптируются под tenant в фазе A8.

---

## 4. Слои и файлы (кратко — детально в `auth-implementation.md` §7)

**D:** `prisma/schema.prisma`, `prisma/migrations/...`, `prisma/seed.ts`.
**B:** `src/auth.ts`, `src/lib/auth/session.ts`, `src/lib/db.ts` (+`createTenantPrisma`), `src/lib/{leads,customers,contacts,opportunities,activities,convertLead,dashboard,stages}.ts`.
**F:** `src/app/login/`, `src/app/register/`, `src/app/invite/[token]/`, `src/app/(app)/layout.tsx`, `src/app/(app)/actions/workspace.ts`, `src/middleware.ts`, `src/components/NavHeader.tsx` (+switcher), `src/app/customers/` (ex-`/accounts`).

---

## 5. Стек и решения (из v4 §2–§5)

- Auth.js v5 (`next-auth`) + `@auth/prisma-adapter` + `bcryptjs` (Credentials, email/пароль) + `database-session`.
- Изоляция: Prisma client extension `createTenantPrisma(orgId)`; сырой `prisma.*` вне `db.ts`/auth запрещён ESLint-правилом.
- Id-lookups → `findFirst` (not `findUnique`); single `update`/`delete` → find-first-then-update или `updateMany`; `upsert` → compound-unique `organizationId_name`.
- `activeOrganizationId` хранится на `Session` (не на `User`), `ON DELETE SET NULL`; session-callback авто-заполняет его при единственной активной membership (register/invite).
- Email — `resend` (dev-fallback: лог ссылки в консоль при отсутствии `RESEND_API_KEY`).

---

## 6. Контракт авторизации (из v4 §6–§7)

- Регистрация = атомарная `$transaction`: `User` + `Organization` + `Membership(owner,active)`. **Session НЕ создаётся в транзакции** — её создаёт `signIn` через адаптер Auth.js; `activeOrganizationId` выставляется session-callback'ом.
- Приглашение: `InviteToken` (email, role, token, expiresAt) → Resend → `/invite/[token]` → `$transaction`: аннулировать токен, find-or-create `User`, `Membership`; затем `signIn` (session-callback выставит `activeOrganizationId`).
- Переключение workspace: сервер проверяет `Membership(user,org,active)` → `UPDATE Session.activeOrganizationId` → `revalidatePath`. Подмена `organizationId` клиентом невозможна.
- Ни один запрос к бизнес-данным не выполняется без `organizationId`.

---

## 7. Окружение

**Новые deps:** `next-auth`, `@auth/prisma-adapter`, `bcryptjs`, `resend` (+ `@types/bcryptjs` devDep).
**`.env.example` (новые переменные, без секретов):**
```dotenv
AUTH_SECRET="<сгенерировать: openssl rand -base64 32>"
AUTH_URL="http://localhost:3001"
RESEND_API_KEY=""
```
**`.env` (локальный, в .gitignore, не читать ИИ):** реальные `AUTH_SECRET`, `RESEND_API_KEY`, `DATABASE_URL`.
**Скрипты:** `db:reset` (`prisma migrate reset --force && npm run db:seed`) — только после подтверждения пользователя.

---

## 8. Контекстные правила для ИИ-агента

> Прочитай `README.md`, этот `auth-plan.md`, [`../../auth-architecture-v4.md`](../../auth-architecture-v4.md) (контракт решений), [`../../auth-implementation.md`](../../auth-implementation.md) (целевая схема/SQL/код). Найди активную фазу в §2, открой её мини-план из §9. **Бизнес-правила CRM (`home-work/Plan.md` §6) не пересобирай** — только адаптируй под tenant. **Стек-инварианты:** Prisma 6.19.3 без `@prisma/adapter-pg`/`prisma.config.ts`; без realtime. **Не читай `.env`**. **Не выполняй `db:reset`** без подтверждения. После шага — `[x]` в §2, опиши изменения. **Сборка сломана A2→A8 — это планово; не пытайся чинить код в A2–A7.**

**Чек-лист после каждого шага:** Test-критерий из мини-плана → прошёл `[x]` / не прошёл `⚠` → не переходить дальше без `[x]`.
**Новый чат** при засорении контекста (после ~3–4 фаз) — передать README + этот план + `auth-implementation.md`.

---

## 9. Сводный план

> Слой: **D** = database, **B** = backend, **F** = frontend. Test-тип: **DB** = проверка схемы/данных; **smoke** = scoped tsx; **build** = whole-project `tsc`+`lint`.

| № | Фаза | Слой | Артефакты | Test-критерий | Контекст | Мини-план |
|---|---|---|---|---|---|---|
| A1 | Миграция: identity + tenancy | D | 7 новых таблиц + 2 enum | **DB**: `migrate dev` без ошибок; studio видит таблицы | v4 §5.1, impl §3.1 | inline (§10) |
| A2 | Tenant-scoping бизнес-таблиц | D | `organizationId`+FK+индекс+per-tenant unique на 6 таблицах | **DB**: миграция применена; per-tenant unique работает | v4 §5.2, impl §3.2 | [`phase-a2-tenant-scoping.md`](phase-a2-tenant-scoping.md) |
| A3 | Rename таблицы `Account`→`Customer` | D | `ALTER TABLE RENAME`, sync schema | **DB**: `Customer` существует, `Account` нет; данные сохранены | v4 §9.1, impl §3.3 | [`phase-a3-rename.md`](phase-a3-rename.md) |
| A4 | Обновление seed | D | `seed.ts`: default org + owner + `organizationId` | **DB**: `db:reset` → счётчики 5/4/5/6/6/8; все строки имеют `organizationId` | impl §3.4, final-mvp §3.2 | [`phase-a4-seed.md`](phase-a4-seed.md) |
| A5 | Auth.js v5 (+A6) | B | `src/auth.ts`, route handlers, `session.ts` | **smoke**: `authorize` возвращает user; callback выставляет `activeOrganizationId` | v4 §4, impl §4.2–4.3 | [`phase-a5-authjs.md`](phase-a5-authjs.md) |
| A7 | Tenant-клиент + ESLint | B | `db.ts` (+`createTenantPrisma`), `eslint.config.mjs` | **smoke**: extension фильтрует по org; **scoped lint**: raw `prisma` → error | v4 §6.2, impl §4.1, §5 | [`phase-a7-tenant-client.md`](phase-a7-tenant-client.md) |
| A8 | Рефакторинг кода + rename (backend+UI) | B+F | 8 lib-файлов, `accounts.ts`→`customers.ts`, `/accounts`→`/customers`, типы, `convertLead` | **build**: `tsc --noEmit` exit 0; `npm run lint` exit 0 | v4 §9.3, impl §4.5, §7 | [`phase-a8-refactor.md`](phase-a8-refactor.md) |
| A9 | Auth UI + workspace + guards | F+B | `/login`,`/register`,`/invite/[token]`,`(app)/layout.tsx`,`switchWorkspace`,`middleware` | **smoke+UI**: register→owner залогинен; invite принят; switch меняет org; чужая org→403; Drawer не сломан | v4 §7, impl §4.4 | [`phase-a9-ui.md`](phase-a9-ui.md) |
| A10 | Приёмка | F+B+D | `TEST_REPORT` (auth), `README` (auth-раздел) | **build+UI**: изоляция 2 org; сценарий final-mvp под owner; `lint`+`build` чисто | final-mvp §3.2 | inline (§10) |

---

## 10. Решение по мини-планам

**Принцип (из методологии Plan–Code–Test + `home-work/Plan.md` M14):** главный план держит только маршрут (одна строка на фазу); детализация — точный SQL, код, Zod-сигнатуры, тест-команды — уходит в мини-план, если фаза **объёмная или рискованная**. Тривиальная фаза остаётся inline.

**Решение по фазам:**

| Фаза | Мини-план? | Основание |
|---|---|---|
| A1 (новые таблицы, авто) | **НЕТ** | авто-миграция, одна команда + `prisma validate` |
| A2 (tenant-scoping, ручной SQL) | **ДА** | высокий риск: NOT NULL + backfill + порядок FK + per-tenant unique |
| A3 (rename таблицы) | **ДА** | подводные: имена констрейнтов/индексов, sync schema |
| A4 (seed) | **ДА** | специфика: default org, ownerUserId, per-org Stage, идемпотентность |
| A5+A6 (Auth.js) | **ДА** | callbacks, авто-заполнение `activeOrganizationId`, Credentials |
| A7 (tenant-клиент) | **ДА** | ядро изоляции; двухуровневая стратегия; ESLint |
| A8 (рефакторинг + rename кода) | **ДА** | точка восстановления сборки; объёмно (8 файлов + UI) |
| A9 (UI + workspace + guards) | **ДА** | экраны + `switchWorkspace` + защита роутов |
| A10 (приёмка) | **НЕТ** | чек-лист проверки |

**Итог: 7 мини-планов** (A2, A3, A4, A5, A7, A8, A9). A1, A10 — inline ниже.

**Шаблон мини-плана** (по образцу `docs/plans/phase-8-convert-lead.md`):
1. Контекст для агента (какие § читать).
2. Точные артефакты (SQL / код / Zod — готовое к выполнению).
3. Пошаговые действия.
4. Test-критерии с исполняемыми командами.
5. Коммит после фазы.

### Inline-фазы

**A1 — Миграция: identity + tenancy**

В `prisma/schema.prisma` добавить **только** identity+tenancy-блок (скопировать из [`auth-implementation.md`](../../auth-implementation.md) §2): модели `User`, `Account` (Auth.js), `Session`, `VerificationToken`, `Organization`, `Membership`, `InviteToken` + enum `MembershipRole`, `MembershipStatus`. **Бизнес-модели НЕ трогать** — `organizationId` на них вешается в A2, rename `Account`→`Customer` в A3.
```bash
npx prisma migrate dev --name add_identity_and_tenancy
```
Test: `npx prisma validate` exit 0; `npx prisma studio` видит `User`, `Organization`, `Membership`, `Session`, `Account`, `VerificationToken`, `InviteToken`.

**A10 — Приёмка**
1. Изоляция: создать 2 org (owner + member), в каждой свои лиды; запросы не пересекаются.
2. Сценарий `final-mvp.md` под owner: dashboard → leads → convert → opportunity → activity → воронка → dashboard.
3. Workspace switch: Org A ↔ Org B меняет данные; чужая org → `FORBIDDEN`.
4. `npm run lint && npm run build` exit 0; `prisma migrate status` clean.

---

## 11. Трассировка: архитектура/реализация → фазы

| v4 arch / impl | Фаза(ы) этого плана |
|---|---|
| v4 §5 модель / impl §2 схема | A1–A4 |
| v4 §8 переход / impl §3 миграции | A1, A2, A3, A4 |
| v4 §4 аутентификация / impl §4.3 | A5, A6 |
| v4 §6.2 tenant-фильтр / impl §4.1 | A7 |
| v4 §9.3 convertLead / impl §4.5 + rename кода | A8 |
| v4 §7 сценарии / impl §4.4 | A9 |
| v4 §11 рост / §12 ограничения | (перспектива, не в этом плане) |

Архитектура = ЧТО/ПОЧЕМУ; `auth-implementation.md` = КАК; этот план = МАРШРУТ по фазам с мини-планами.
