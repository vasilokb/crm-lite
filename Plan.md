# CRM-lite: выставочное агентство — Plan — Code — Test

> Кейс из [`home-work/docs/home-work.md`](docs/home-work.md) — исходная постановка, 9 фаз приёмки.
> **Главный документ-контракт — [`home-work/docs/final-mvp.md`](docs/final-mvp.md) (ред. 7.0).** Все ссылки на пункты спецификации в этом плане (например, «final-mvp §6.2») ведут в `docs/final-mvp.md`.
> Цель плана: превратить 9 фаз приёмки в исполнимые шаги по слоям **F** (frontend), **B** (backend), **D** (database) с явными Test-критериями.

### Активные источники

| Документ | Роль |
|---|---|
| [`home-work/docs/final-mvp.md`](docs/final-mvp.md) | Контракт MVP (ред. 7.0): модели, Drawer, convert lead, правила won/lost, dashboard, стратегия удаления |
| [`home-work/docs/home-work.md`](docs/home-work.md) | Постановка задания, 9 фаз приёмки, контрольный сценарий, требования к упаковке |
| Этот `Plan.md` | Пошаговый план реализации; ссылается на `final-mvp.md` по § пунктов |

---

## 1. Что из себя представляет приложение

Локальное однопользовательское веб-приложение «CRM-lite для агентства выставочных стендов». Сценарий менеджера: открывает `/dashboard`, видит KPI и диаграммы по текущей базе; переходит на `/leads` (список лидов), фильтрует по `source` и статусу, ищет по имени/компании; кликает по строке — открывается **Drawer-карточка** лида (`/leads/[id]`); в шапке Drawer жмёт `Convert lead` — внутри той же шторки inline-раскрывается Accordion-форма, при успехе лид становится `converted`, в Drawer появляются ссылки на созданные `Account`, `Contact`, `Opportunity`; переходит по ссылке на Opportunity — Drawer заменяется (не наслаивается), URL меняется на `/opportunities/[id]`; в Drawer сделки меняет стадию через прогресс-бар (с проверкой правил `won`/`lost`), добавляет note/task, чекбокс `done` работает по принципу Optimistic UI (мгновенный апдейт → откат при ошибке); возвращается на `/dashboard` — данные пересчитаны через повторный запрос, без realtime.

**Маршруты:**
- `/dashboard` — экран KPI + 2 Chart.js-диаграммы + операционные списки
- `/leads`, `/accounts`, `/contacts`, `/opportunities` — табличные списки
- `/leads/[id]`, `/accounts/[id]`, `/contacts/[id]`, `/opportunities/[id]` — Drawer-карточки (URL-driven, замена содержимого, один активный Drawer)

**Поля и статусы (контракт — final-mvp §3.1):**
- `Lead.source` ∈ `{site, email, phone, referral, manual}`; `Lead.status` ∈ `{new, processed, converted}`
- `Stage` — справочник (`qualification`, `proposal`, `negotiation`, `won`, `lost`); `Opportunity.stageId` FK
- `Opportunity.status` ∈ `{open, won, lost}`; `reasonLost` — опциональный, обязателен для перехода в `lost`
- `Activity.type` ∈ `{note, task}`; для `task` обязательны `dueDate` и `done`

**Стек:** Next.js App Router + React + TypeScript + Tailwind + PostgreSQL + Prisma 6.19.3 (`prisma-client-js`, `env("DATABASE_URL")`, БЕЗ `@prisma/adapter-pg`/`PrismaPg`/`prisma.config.ts`) + Zod (server-side) + chart.js@4.5.1 + react-chartjs-2@5.3.1. Локальный режим, без realtime.

---

## 2. Активное состояние

Обновляется после каждого шага. После закрытия всех фаз — в архив.

| Фаза | Статус | Закрыта | Комментарий |
|---|---|---|---|
| 1. README + легенда + граница MVP + Plan.md | [x] | [x] | 2026-07-04 — README создан: легенда, стек, маршруты, §3/§6 как ссылки, безопасная схема и dev-data; Plan.md финализирован |
| 2. Воспроизводимый локальный запуск (`.env.example`, PostgreSQL, Prisma) | [x] | [x] | 2026-07-04 — Next.js 16 scaffold + .env.example + .gitignore (.env игнорируется, .env.example нет) + package.json (prisma 6.19.3, @prisma/client 6.19.3, chart.js 4.5.1, react-chartjs-2 5.3.1, zod ^3, tsx в devDeps) + db:* скрипты; README §1.4 с bash/PowerShell и установкой PostgreSQL |
| 3. Модель данных Prisma (6 моделей + Stage) + миграция | [x] | [x] | 2026-07-05 — миграция `20260705070823_init_crm_schema` применена к `crm_dev`; 6 моделей (Lead/Account/Contact/Stage/Opportunity/Activity) + 4 enum-а; onDelete: 3 Restrict (Account→Contact, Account→Opportunity, Opportunity→Activity) + 2 SetNull (Opportunity.stage, Lead.opportunity); leadId @unique (D14); prisma.config.ts удалён из init |
| 4. Seed контрольных данных (6/4/5/6/8 + ≥2 просроченных/сегодняшних задач) | [x] | [x] | 2026-07-05 — seed.ts детерминированный, идемпотентный (upsert); counts: 5 stages / 4 accounts / 5 contacts / 6 leads / 6 opportunities / 8 activities (2 overdue / 2 today / 2 closed / 2 notes); Lead upsert по явным slug-id (email без @unique); Account/Contact по @unique; Юлия Зайцева (converted) → opp-epsilon-2026 (D16); дополнительно применена миграция `20260705105901_add_unique_account_name_contact_email` для устранения противоречия с phase-4-seed.md |
| 5. Backend: server actions + Zod-валидация + CRUD | ☐ | ☐ | общий валидатор `lib/validators.ts` |
| 6. Frontend: списки + пагинация + поиск + фильтры | ☐ | ☐ | `?q=`, `?source=`, `?stage=` |
| 7. Drawer-карточки + связи + вложенная навигация | ☐ | ☐ | один активный Drawer, URL-driven |
| 8. Convert Lead: Accordion + `$transaction` + атомарность | ☐ | ☐ | запрет двойной конвертации |
| 9. Воронка сделок: прогресс-бар + правила won/lost | ☐ | ☐ | блокировка переходов без обязательных полей |
| 10. Активности: timeline + Optimistic UI для `done` | ☐ | ☐ | откат при ошибке |
| 11. Dashboard: KPI + 2 Chart.js + операционные списки | ☐ | ☐ | `groupBy/aggregate` на бэке |
| 12. Упаковка к сдаче: README, E2E-сценарий, TEST_REPORT.md | ☐ | ☐ | запуск → seed → лид → convert → сделка → активность → воронка → dashboard |

**Правило обновления:** после Test-критерия, прошедшего проверку, — отметить `[x]`. Если нет — добавить «⚠ <дата>: <что не прошло>» в «Комментарий» и/или скорректировать следующие шаги.

---

## 3. Бизнес-границы (что НЕ входит в MVP)

- Без ролей пользователей (admin/manager/owner) — single-user local CRM.
- Без аутентификации/авторизации (cookie, HMAC, login/register).
- Без realtime, websocket, push, live subscriptions.
- Без удаления сущностей через UI: в Drawer **нет кнопки «Удалить»**, на уровне Prisma — `onDelete: Restrict` для `Account→Contact`, `Account→Opportunity`, `Opportunity→Activity` (см. §6.6).
- Без soft-delete / archive / trash.
- Без email/telegram/SMS-уведомлений.
- Без сложной аналитики (только 4 KPI + 2 диаграммы Chart.js + 3 операционных списка — Recent Leads, Overdue Tasks; `Stuck Deals` опционально по final-mvp §8.3, **сознательно не реализуется в v1**).
- Без вложенных модальных окон — один активный Drawer, замена содержимого вместо наслоения.
- Без мобильной версии (PWA, native app); адаптив ≥1024 px baseline.
- Без многоязычности (только `lang="ru"`).
- Без multi-tenant / нескольких организаций в одной БД.
- Без деплоя / CI/CD / staging — только локальный запуск по README.
- Без `@prisma/adapter-pg`, `PrismaPg`, `prisma.config.ts` (требование final-mvp §1).

---

## 4. Имена файлов и слоёв

**Корень проекта:** `F:\Practicum\vibe-projects\crm\home-work\`. Внутри: `README.md`, `TEST_REPORT.md`, `Plan.md` (этот файл), `prisma/`, `src/`, `scripts/`, `.env.example`, `.gitignore`, `docs/` (задание `home-work.md`, контракт `final-mvp.md`, мини-планы в `docs/plans/`).

**Prisma:** `prisma/schema.prisma`, `prisma/migrations/...`, `prisma/seed.ts`.

**Серверная логика (`src/lib/` и server actions):**
- `src/lib/db.ts` — singleton `PrismaClient` (через `globalThis.__db` для hot-reload)
- `src/lib/validators.ts` — Zod-схемы: `leadInputSchema`, `leadUpdateSchema`, `accountInputSchema`, `contactInputSchema`, `opportunityInputSchema`, `convertLeadSchema`, `activityInputSchema`
- `src/lib/leads.ts` — server actions лидов
- `src/lib/accounts.ts` — server actions компаний
- `src/lib/contacts.ts` — server actions контактов
- `src/lib/opportunities.ts` — server actions сделок (включая переходы стадий)
- `src/lib/activities.ts` — server actions активностей (включая toggle `done`)
- `src/lib/convertLead.ts` — атомарная транзакция конвертации (`prisma.$transaction`)
- `src/lib/dashboard.ts` — агрегации через `prisma.groupBy` / `prisma.aggregate`
- `src/lib/stages.ts` — справочник стадий (заполнение при первом запуске)

**API-роуты:** не используются. Весь CRUD, включая Optimistic UI для `Activity.done`, идёт через server actions (см. A7).

**Страницы (`src/app/`):**
- `src/app/page.tsx` — редирект на `/dashboard`
- `src/app/dashboard/page.tsx` — Dashboard (server component, передаёт `labels[]/values[]` клиентским диаграммам)
- `src/app/leads/page.tsx` — список лидов + фильтры
- `src/app/leads/[id]/page.tsx` — Drawer-карточка лида
- `src/app/accounts/page.tsx` + `[id]/page.tsx`
- `src/app/contacts/page.tsx` + `[id]/page.tsx`
- `src/app/opportunities/page.tsx` — список сделок + воронка
- `src/app/opportunities/[id]/page.tsx` — Drawer-карточка сделки

**Компоненты (`src/components/`):**
- `Drawer.tsx`, `DrawerHeader.tsx`, `DrawerSection.tsx`, `DrawerRelatedList.tsx`
- `Badge.tsx` (бейджи статусов и стадий)
- `LeadCard.tsx`, `AccountCard.tsx`, `ContactCard.tsx`, `OpportunityCard.tsx`
- `LeadForm.tsx`, `AccountForm.tsx`, `ContactForm.tsx`, `OpportunityForm.tsx`, `CreateOpportunityForm.tsx` (быстрое создание сделки на `/opportunities`)
- `ConvertLeadAccordion.tsx` — inline-форма конвертации
- `StageProgressBar.tsx` — прогресс-бар стадий сделки
- `ActivityTimeline.tsx`, `ActivityForm.tsx`, `TaskCheckbox.tsx` (Optimistic UI)
- `KpiCard.tsx`, `ChartCard.tsx`, `RecentLeadsList.tsx`, `OverdueTasksList.tsx`
- `LeadsChart.tsx`, `StagesChart.tsx` — **«тупые»** клиентские компоненты (`labels[]/values[]` через props, без выборок)
- `SearchInput.tsx`, `FilterBar.tsx`, `Pagination.tsx`
- `EmptyState.tsx`, `FieldError.tsx`, `Toast.tsx`

**Прочее:** `src/lib/utils.ts` (`cn()`), `src/types/global.d.ts` (декларация `globalThis.__db`).

---

## 5. Стек и архитектурные решения

- **Next.js App Router** + React + TypeScript (strict). Server Components по умолчанию, client components — только для интерактивных форм, чекбоксов задач, диаграмм Chart.js.
- **Tailwind** для стилей. Бейджи статусов: `won` — зелёный, `lost` — красный, `open` — синий/нейтральный. Просроченные задачи — отдельная подсветка.
- **Zod** — единый источник правил для server actions. Все текстовые поля через `.trim()`. Серверная валидация обязательна (UI-валидация — только UX, не security).
- **Prisma 6.19.3** — `generator client { provider = "prisma-client-js" }`, `datasource db { provider = "postgresql"; url = env("DATABASE_URL") }`. **Запрещено:** `@prisma/adapter-pg`, `PrismaPg`, `prisma.config.ts`. Версии в `package.json` — точные (`"6.19.3"`, без `^`/`~`), установка через `--save-exact`.
- **Атомарность convert lead** — `prisma.$transaction(async (tx) => { ... })` создаёт `Account`, `Contact`, `Opportunity`, обновляет `Lead.status = 'converted'`. При любом throw — Prisma откатывает все изменения.
- **Optimistic UI для задач** — клиент сразу меняет локальное состояние `done`, вызывает server action `toggleActivityDone({ id, done: !prev })` через `useOptimistic` + `useTransition`; при ошибке — откат + toast «Не удалось завершить задачу, попробуйте позже».
- **Dashboard-агрегации** — только server-side через `prisma.groupBy({ by: ['stageId'] })`, `prisma.lead.groupBy({ by: ['status'] })`, `prisma.lead.groupBy({ by: ['source'] })`, `prisma.opportunity.aggregate({ where: { status: 'open' }, _sum: { amount: true } })`, `prisma.activity.count({ where: { done: false, dueDate: { lt: today } } })`. Клиентские компоненты `LeadsChart`/`StagesChart` получают `{ labels: string[]; values: number[] }` через props.
- **Без realtime** — Dashboard обновляется при навигации через повторный запрос; никаких websockets, SSE, polling.
- **Drawer-модель** — Next.js Intercepting Routes (modal поверх списка, не отдельная страница): slot `@modal` + `(..)<entity>/[id]` intercepting route; root layout принимает `{children, modal}`. Back закрывает Drawer в intercepted-режиме. Детали — [`docs/plans/phase-7-drawers.md`](docs/plans/phase-7-drawers.md).
- **Без удаления** — в схеме `onDelete: Restrict` для всех FK, перечисленных в §3. В Drawer-формах нет кнопки «Удалить» (контракт final-mvp §9.1).

---

## 6. Бизнес-правила (контракт)

> Эти правила — единственный источник истины для UI и API. Покрыты тестами в TEST_REPORT.md.

### 6.1 Статусы и стадии
- **Lead.status** ∈ `{new, processed, converted}`. После успешной конвертации — `converted`, дальнейшие изменения через Convert Lead заблокированы.
- **Stage.name** ∈ `{qualification, proposal, negotiation, won, lost}`. Фиксированный справочник, заполняется при первом `npm run db:seed`.
- **Opportunity.status** ∈ `{open, won, lost}`. Сделка на стадии `won` или `lost` имеет соответствующий `status`. `open` — для всех остальных стадий.
- **Activity.type** ∈ `{note, task}`. Для `task` обязательны `dueDate` (Date) и `done` (boolean, default `false`).
- **Связь Contact ↔ Opportunity — 1-N** через `Opportunity.contactId String?` (final-mvp §3.1: «контакт может участвовать в нескольких Opportunity»). Не join-таблица, не M-N. Схема — `Contact.opportunities Opportunity[]` (обратная сторона).

### 6.2 Convert Lead — атомарность и блокировки
- Из Drawer лида (`/leads/[id]`) — кнопка `Convert lead` (видна только если `Lead.status !== 'converted'`).
- При клике inline-раскрывается Accordion-форма (без перехода на новый экран) с полями: **`accountName` — ОБЯЗАТЕЛЬНОЕ (1–200 chars, D12)**, в UI предзаполняется из `Lead.company` если есть (defaultValue, редактируемое); `contactName` (обяз.), `contactEmail?`, `contactPhone?`, `createOpportunity` (checkbox), `opportunityTitle?`, `opportunityAmount?`. **Никаких fallback вида «Лид #<id>»** — пустое/мусорное имя компании недопустимо.
- Серверная функция `convertLead(leadId, input)` — **одна** `prisma.$transaction`:
  1. Найти `Lead`; если `status === 'converted'` → return `{ ok: false, error: 'lead_already_converted' }` со статусом 409 (**UX-проверка**, не защита от race — см. D14).
  2. Найти/создать `Account` по `accountName` (обязательное поле, upsert).
  3. Создать `Contact` с `accountId`.
  4. Если `createOpportunity` — создать `Opportunity` с `accountId`, `contactId`, `leadId` (unique), `stageId = qualification`.
  5. Обновить `Lead.status = 'converted'`, `Lead.opportunity = created?.id ?? null`.
- При любом throw — Prisma откатывает транзакцию. Клиенту возвращается `{ ok: false, error }`, в Accordion показывается сообщение, данные лида не меняются.

### 6.3 Жёсткие правила переходов won/lost
- Перевод сделки в стадию `won` (`updateOpportunityStage`):
  - **Запрещён** если `opportunity.amount == null` → 400 `amount_required`.
  - **Запрещён** если `opportunity.contactId == null` → 400 `contact_required`.
  - При успехе: `stageId = won-stage`, `status = 'won'`, `closeDate = now()`.
- Перевод сделки в стадию `lost`:
  - **Запрещён** если `opportunity.reasonLost == null || trim() === ''` → 400 `reason_lost_required`.
  - При успехе: `stageId = lost-stage`, `status = 'lost'`, `closeDate = now()`.
- При нарушении: форма прогресс-бара остаётся открытой, проблемное поле подсвечивается (`aria-invalid="true"`), выводится явное сообщение.

### 6.4 Optimistic UI для задач
- В Drawer сделки — timeline активностей; для каждого `task` — чекбокс `done`.
- При клике:
  1. **Сразу** обновляется локальное состояние компонента (`useOptimistic` или локальный state).
  2. `await toggleActivityDone({ id, done: !prev })` (server action через `useTransition`) отправляется в фоне.
  3. На 200 — состояние подтверждается.
  4. На ошибку — откат к предыдущему `done`, toast «Не удалось завершить задачу, попробуйте позже».

### 6.5 Согласованность стадии
- Стадия в списке `/opportunities` и в Drawer `/opportunities/[id]` — всегда одно и то же значение.
- Прогресс-бар в Drawer инициирует смену; после успешного server action — revalidatePath(`/opportunities`) и `/opportunities/[id]`.

### 6.6 Стратегия удаления
- **Нет UI-кнопки «Удалить»** в Drawer (для `Account`, `Contact`, `Opportunity`, `Activity`).
- На уровне Prisma — `onDelete: Restrict` для FK:
  - `Account.contacts` → `Contact`
  - `Account.opportunities` → `Opportunity`
  - `Opportunity.activities` → `Activity`
- `Opportunity.stage` → `Stage` использует **`SetNull`** (D9 — Stage — справочник, удаление не предусмотрено UI; `Restrict` здесь избыточен и мешает эволюции справочника). Аналогично `Lead.opportunity` → `Opportunity` — `SetNull`.
- «Закрытие» сущности — через статусы (`Lead.status = 'converted'`, `Opportunity.status = 'won'/'lost'`, `Activity.done = true`).

### 6.7 Drawer-модель и навигация (Next.js Intercepting Routes)
- Drawer — **modal поверх списка** (final-mvp §4.1 «боковые шторки»), не отдельная страница с master-detail.
- Реализация — **Next.js Intercepting Routes**: root layout принимает parallel slot `@modal`; `src/app/@modal/(..)<entity>/[id]/page.tsx` перехватывает навигацию со списка; `src/app/<entity>/[id]/page.tsx` — «настоящая» страница для refresh/share-link.
- **URL обновляется** при любой навигации внутри Drawer (final-mvp §5.2). **Back** предсказуем: в intercepted-режиме (из списка) — закрывает Drawer; между Drawer'ами — возвращает к предыдущему Drawer; в прямом URL — к предыдущей странице браузера.
- Детали файловой структуры `@modal`, root layout, back-сценарии — [`docs/plans/phase-7-drawers.md`](docs/plans/phase-7-drawers.md).

### 6.8 Валидация и ошибки
- Все формы — Zod-схема на сервере + UX-валидация на клиенте.
- При 400 — ошибки раскладываются по полям (`fieldErrors[name]`), проблемные поля подсвечиваются.
- При 500 (или сетевой ошибке) — внизу Drawer или toast: **«Не удалось сохранить изменения, попробуйте позже»**. Форма не зависает в `Loading`.
- При ошибке конвертации лида — сообщение в зоне Accordion, данные лида не меняются.

---

## 7. Окружение: .env.example / seed / reset / запреты

### 7.1 `.env.example`
```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/crm_dev?schema=public"
```
Реальный пароль — **только** в локальном `.env`, который в `.gitignore`.

### 7.2 Запреты для ИИ-агента
- Не читать `.env` ни прямо, ни через `node -e "console.log(process.env.DATABASE_URL)"` или другие обходы.
- Не выполнять `prisma migrate reset` / `npm run db:reset` без явного подтверждения пользователя.
- Не устанавливать `@prisma/adapter-pg`, `PrismaPg`, не создавать `prisma.config.ts` (явный запрет final-mvp §1).
- Не выводить `DATABASE_URL` в чат / README / коммит.

### 7.3 Seed (контрольные данные — final-mvp §3.2)
`prisma/seed.ts` детерминированно создаёт:
- **6 лидов** с разными `source` (`site`, `email`, `phone`, `referral`, `manual` × …) и статусами (`new`, `processed`, `converted`).
- **4 компании** (`Account`).
- **5 контактов**, привязанных к компаниям и участвующих в сделках.
- **6 сделок** (`Opportunity`), распределённых по стадиям `qualification`, `proposal`, `negotiation`, `won`, `lost`.
- **8 активностей** (`Activity`), итого:
  - **≥2 task** с `dueDate < today` и `done = false` (просроченные) — обязательно по final-mvp §3.2.
  - **≥2 task** с `dueDate = today` и `done = false` (на сегодня) — обязательно по final-mvp §3.2.
  - **Остаток до 8** — любая комбинация: `note` без `dueDate`, закрытые `task` (`done = true`), дополнительные task для разнообразия timeline.
  - Seed **идемпотентен** через `upsert` по уникальному ключу (`(opportunityId, type, text)` или явному `id` — на выбор исполнителя).
- **5 стадий** (`Stage`): `qualification`, `proposal`, `negotiation`, `won`, `lost`.

Команда: `npm run db:seed` (через `tsx prisma/seed.ts`).

### 7.4 Reset
```bash
# Только в dev-контуре и только после явного подтверждения пользователя
npx prisma migrate reset
# или
npm run db:reset
```
Скрипт `db:reset` в `package.json`: `prisma migrate reset --force && npm run db:seed`.

### 7.5 Версии (фиксированы точно)
- `prisma@6.19.3` (devDependency, `--save-exact`)
- `@prisma/client@6.19.3` (dependency, `--save-exact`)
- `chart.js@4.5.1`
- `react-chartjs-2@5.3.1`
- `zod@^3` (последняя стабильная, не зафиксировано жёстко)

---

## 8. Контекстные правила для ИИ-агента

Преамбула для каждого шага (или один раз в начале сессии):

> Прочитай `README.md`, `Plan.md` и активные файлы `prisma/schema.prisma`, `src/lib/*`. Найди активную фазу в §2, текущий шаг в §10. **Бизнес-правила в §6 — контрактные**, не пересобирай их без подтверждения пользователя. **Стек-инварианты:** Prisma 6.19.3 через `env("DATABASE_URL")` без `@prisma/adapter-pg`/`PrismaPg`/`prisma.config.ts`; chart.js@4.5.1 + react-chartjs-2@5.3.1; без realtime; без удаления. **Не читай `.env`** ни прямо, ни через терминал. **Не выполняй `db:reset`** без явного подтверждения. После выполнения шага — отметь `[x]` в §2 и §10, обнови комментарии, опиши изменения.

**Правило «новый чат при засорении контекста»:** после 6–7 фаз активное контекстное окно ИИ-агента заполняется обсуждениями, правками и diff'ами. Для фаз 11 (Dashboard) и 12 (упаковка) — открыть **новый чат** и передать ему: `README.md`, `Plan.md`, актуальный `prisma/schema.prisma`, список закрытых фаз. Без этого есть риск, что модель начнёт забывать правила §6.2 (атомарность `$transaction`), §6.3 (won/lost), §6.4 (Optimistic UI) и отступать от них в технических деталях.

**Чек-лист после каждого шага:**
1. Запустить Test-критерий из колонки «Test» в §10.
2. Если прошёл — поставить `[x]` в §10 и в §2 для соответствующей фазы.
3. Если нет — добавить «⚠ <дата>: <что не прошло>» в «Комментарий» §2.
4. Не переходить к следующей фазе, пока текущая не `[x]`.

---

## 9. Сводный план

> Легенда слоя: **F** = frontend, **B** = backend, **D** = database.

| № | Фаза | Слой | Артефакты | Test-критерий (упрощённо) |
|---|---|---|---|---|
| 1 | README + легенда + граница MVP + Plan.md | F+D | `README.md`, `Plan.md`, список открытых вопросов в §13 | README содержит стек, маршруты, §6 как ссылку; §3 явно перечисляет OUT-of-MVP |
| 2 | Воспроизводимый локальный запуск | D | `.env.example`, `.gitignore`, `package.json` с точными версиями Prisma | `cat .env.example` безопасен; `package.json` содержит `"prisma": "6.19.3"`, `"@prisma/client": "6.19.3"`; нет `@prisma/adapter-pg`, нет `PrismaPg`, нет `prisma.config.ts`; `.env` в `.gitignore` |
| 3 | Модель данных Prisma + миграция | D | `prisma/schema.prisma`, `prisma/migrations/...` | `npx prisma validate` — exit 0; `npx prisma migrate dev --name init-crm-schema` применён локально; 6 моделей (`Lead`, `Account`, `Contact`, `Stage`, `Opportunity`, `Activity`) + `onDelete: Restrict` для указанных FK |
| 4 | Seed контрольных данных | D | `prisma/seed.ts`, скрипт `db:seed` | `npm run db:seed` создаёт ровно 6 лидов, 4 компании, 5 контактов, 6 сделок, 8 активностей; ≥2 просроченные задачи (`dueDate < today`), ≥2 на сегодня (`dueDate = today`); лиды/сделки распределены по нескольким статусам/стадиям |
| 5 | Backend: server actions + Zod + CRUD | B | `src/lib/validators.ts`, `src/lib/leads.ts`, `accounts.ts`, `contacts.ts`, `opportunities.ts`, `activities.ts` | Server actions создают/обновляют/читают сущности; невалидные данные → 400 с `fieldErrors`; Zod применяется ко всем входам |
| 6 | Frontend: списки + пагинация + поиск + фильтры | F | страницы `/leads`, `/accounts`, `/contacts`, `/opportunities`, `SearchInput`, `FilterBar`, `Pagination`, `Badge` | Пагинация 50 записей на страницу; поиск по имени/компании/названию работает; фильтры по `source`/`status` для лидов и по `stage`/`status` для сделок; данные из БД, не из моков |
| 7 | Drawer-карточки + связи + вложенная навигация | F+B | `src/app/[entity]/[id]/page.tsx`, `Drawer`, `DrawerHeader`, `DrawerRelatedList`, клинкабельные бейджи-счётчики | Открытие строки списка → Drawer; в карточке компании видны контакты и сделки; в карточке сделки — компания, контакт, стадия, активности; переход по связанной сущности заменяет Drawer, URL обновляется |
| 8 | Convert Lead: Accordion + $transaction | B+F | `src/lib/convertLead.ts`, `ConvertLeadAccordion.tsx` | Конвертация создаёт Account, Contact, (опц.) Opportunity; статус лида → `converted`; повторная конвертация того же лида → 409; частичный сбой (например, дубликат имени) — откат всех изменений; UI показывает ссылки на созданные сущности |
| 9 | Воронка сделок + правила won/lost | F+B | `StageProgressBar.tsx`, `updateOpportunityStage` action | Прогресс-бар в Drawer сделки и список показывают одну стадию; переход в `won` без `amount` или без `contact` → 400 + подсветка; переход в `lost` без `reasonLost` → 400 + подсветка |
| 10 | Активности: timeline + Optimistic UI | F+B | `ActivityTimeline.tsx`, `TaskCheckbox.tsx`, server action `toggleActivityDone` | Чекбокс задачи: мгновенный апдейт → откат + toast при ошибке; note и task визуально различимы; просроченные задачи подсвечены |
| 11 | Dashboard: KPI + 2 Chart.js + операционные списки | F+B | `src/lib/dashboard.ts`, `src/app/dashboard/page.tsx`, `KpiCard`, `LeadsChart`, `StagesChart`, `RecentLeadsList`, `OverdueTasksList` | 4 KPI (всего лидов, открытых сделок, сумма открытых, просроченных задач); 2 диаграммы Chart.js (по стадиям сделок и по статусам лидов); `labels[]/values[]` вычислены на бэке через `groupBy/aggregate`; компоненты диаграмм — «тупые» (без выборок); summary по source (`site/email/phone/referral/manual`); Recent Leads и Overdue Tasks |
| 12 | Упаковка к сдаче | F+B+D | `README.md`, `TEST_REPORT.md`, `Plan.md` финализирован | E2E-сценарий из home-work.md пройден UI-проверкой: запуск → seed → лид → convert → сделка → активность → воронка → dashboard; `npx prisma migrate status` — clean; `npm run build` — exit 0 |

### Трассировка `home-work.md` → `Plan.md`

| Фаза `home-work.md` | Название | Покрыто фазами `Plan.md` | Критерий `home-work.md` |
|---|---|---|---|
| 1 | Зафиксировать легенду, границу MVP и план | **1** | Легенда в README, сущности, статусы/стадии, KPI, Plan.md |
| 2 | Подготовить воспроизводимый локальный запуск | **2** | `.env.example`, Prisma 6.19.3, без adapter-pg/PrismaPg/prisma.config.ts, миграции, seed/reset |
| 3 | Модель данных и контрольные данные | **3, 4** | Lead/Account/Contact/Opportunity/Stage/Activity, source enum, note/task, dueDate/done, seed 6/4/5/6/8 + просрочки |
| 4 | Списки, карточки и CRUD | **5, 6, 7** | Списки, карточки, создание/редактирование, Zod-валидация, ошибки backend видны |
| 5 | Связи, поиск и фильтры | **6, 7** | Связи в карточках, поиск, фильтры по source/status/stage, данные из БД |
| 6 | Convert lead | **8** | Inline Accordion, `$transaction`, блокировка повторной конвертации, ссылки на созданные сущности |
| 7 | Воронка сделок, правила, активности | **9, 10** | Прогресс-бар стадий, won/lost правила, быстрое создание, note/task, Optimistic UI done |
| 8 | Dashboard | **11** | Отдельный экран, 4 KPI, 2 Chart.js, summary, Recent Leads/Overdue Tasks, агрегации на бэке, без realtime |
| 9 | Упаковка к сдаче | **12** | E2E-сценарий, README, TEST_REPORT, без секретов/мусора, фиксация в репозитории |

---

## 10. Фазы и шаги

> **M14 — двухуровневая модель плана (методология Plan-Code-Test):** §10 содержит **только маршрут проекта** (одна строка на фазу: цель, слой, артефакты, Test-критерий, ссылка на мини-план). Детальные шаги, точные SQL, Zod-сигнатуры, имена файлов и тестовые команды вынесены в **мини-планы** в `home-work/docs/plans/`. Перед стартом фазы агент открывает соответствующий мини-план — это и есть «ровно то, что нужно для следующего шага» (методология).
>
> **M15 — контекст для агента в колонке «Вход»:** указан не абстрактный §, а конкретные файлы для чтения перед шагом.

| № | Фаза | Слой | Артефакты | Test-критерий (упрощённо) | Контекст для агента (M15) | Мини-план |
|---|---|---|---|---|---|---|
| 1 | README + легенда + граница MVP + Plan.md | F+D | `README.md`, `Plan.md` (этот файл), §13 фиксирует открытые вопросы | README содержит стек, маршруты, §6 как ссылку; §3 явно перечисляет OUT-of-MVP | прочитай `Plan.md` целиком; §6 — контракт | [`docs/plans/phase-1-readme.md`](docs/plans/phase-1-readme.md) |
| 2 | Воспроизводимый локальный запуск | D | `.env.example`, `.gitignore`, `package.json` с точными версиями Prisma/Chart.js, `tsx`; `npm run db:*` скрипты | `cat .env.example` безопасен; `"prisma": "6.19.3"`, `"@prisma/client": "6.19.3"`, `"chart.js": "4.5.1"`, `"react-chartjs-2": "5.3.1"`, `"tsx"` в `package.json`; нет `@prisma/adapter-pg`/`PrismaPg`/`prisma.config.ts`; `.env` в `.gitignore` | прочитай `package.json` (если есть) + `Plan.md` §7 | [`docs/plans/phase-2-env.md`](docs/plans/phase-2-env.md) |
| 3 | Модель данных Prisma + миграция | D | `prisma/schema.prisma`, `prisma/migrations/<ts>_init-crm-schema/migration.sql`, `prisma/migrations/<ts>_add_unique_account_name_contact_email/migration.sql` | `npx prisma validate` — exit 0; `npx prisma migrate dev --name init-crm-schema` применён; 6 моделей (`Lead`, `Account`, `Contact`, `Stage`, `Opportunity`, `Activity`) + `Account.name @unique`, `Contact.email? @unique`, `Opportunity.leadId? @unique` (D14); `Lead.email БЕЗ @unique`; `onDelete: Restrict` × 3 (Account→Contact, Account→Opportunity, Opportunity.activities→Activity) + `onDelete: SetNull` × 2 (Opportunity.stage, Lead.opportunity) | прочитай `prisma/schema.prisma` (если есть) + `Plan.md` §6.1 + **финал-mvp.md** §3.1 | [`docs/plans/phase-3-schema.md`](docs/plans/phase-3-schema.md) |
| 4 | Seed контрольных данных | D | `prisma/seed.ts`, скрипт `db:seed` (`tsx prisma/seed.ts`) | `npm run db:seed` создаёт ровно 6/4/5/6/8 (Lead/Account/Contact/Opportunity/Activity); ≥2 task `dueDate=YESTERDAY` `done=false`; ≥2 task `dueDate=TODAY` `done=false`; детерминирован через `TODAY = startOfDay(NOW)` (D8) | прочитай `prisma/seed.ts` (если есть) + `Plan.md` §7.3 + **final-mvp.md** §3.2 | [`docs/plans/phase-4-seed.md`](docs/plans/phase-4-seed.md) |
| 5 | Backend: server actions + Zod + CRUD | B | `src/lib/db.ts`, `src/lib/validators.ts`, `src/lib/{leads,accounts,contacts,opportunities,activities}.ts` | Server actions создают/читают/обновляют; невалидные данные → 400 с `fieldErrors`; Zod на всех входах; `npx tsc --noEmit` — exit 0 | прочитай `prisma/schema.prisma` + `Plan.md` §6 + мини-план §4 | [`docs/plans/phase-5-backend.md`](docs/plans/phase-5-backend.md) |
| 6 | Frontend: списки + пагинация + поиск + фильтры | F | `src/app/{leads,accounts,contacts,opportunities}/page.tsx`, `SearchInput`, `FilterBar`, `Pagination`, `Badge` | Пагинация 50/page; поиск по имени/компании/названию; фильтры `?source=`, `?status=`, `?stage=`; данные из БД | прочитать `Plan.md` §6 + мини-план §5 | [`docs/plans/phase-6-lists.md`](docs/plans/phase-6-lists.md) |
| 7 | Drawer-карточки + связи + вложенная навигация | F+B | `src/app/{leads,accounts,contacts,opportunities}/[id]/page.tsx` + `src/app/@modal/(..)<entity>/[id]/page.tsx` + `src/app/layout.tsx` (slot `@modal`); `Drawer`, `DrawerHeader`, `DrawerRelatedList`, `LeadForm`, `AccountForm`, `ContactForm`, `OpportunityForm` | Клик из списка → Drawer overlay (intercepted); refresh на URL — full page; переход между Drawer'ами — back возвращает к предыдущему Drawer; related list в каждом Drawer | прочитай **финал-mvp.md** §4–§5 + `Plan.md` §6.7 | [`docs/plans/phase-7-drawers.md`](docs/plans/phase-7-drawers.md) |
| 8 | Convert Lead: Accordion + `$transaction` | B+F | `src/lib/convertLead.ts`, `src/components/ConvertLeadAccordion.tsx` | Конвертация создаёт Account/Contact/(опц.) Opportunity; `accountName` обязателен (D12); `status === 'converted'` после; параллельная конвертация → один `ok`, второй `409 lead_already_converted` (через P2002, D14) | прочитай **финал-mvp.md** §6 + `Plan.md` §6.2 | [`docs/plans/phase-8-convert-lead.md`](docs/plans/phase-8-convert-lead.md) |
| 9 | Воронка сделок + правила won/lost | F+B | `src/components/StageProgressBar.tsx`, `CreateOpportunityForm.tsx`, action `updateOpportunityStage` | Прогресс-бар (5 шагов) ↔ список показывают одну стадию; `won` без `amount`/`contact` → 400; `lost` без `reasonLost` → 400; `revalidatePath` для консистентности | прочитать **финал-mvp.md** §7.3 + `Plan.md` §6.3, §6.5 | [`docs/plans/phase-9-funnel.md`](docs/plans/phase-9-funnel.md) |
| 10 | Активности: timeline + Optimistic UI | F+B | `src/components/{ActivityTimeline,ActivityForm,TaskCheckbox}.tsx`, server action `toggleActivityDone` с Zod-схемой `toggleDoneSchema` | Чекбокс: мгновенный апдейт `done` → откат + toast при ошибке; note/task визуально различимы; просроченные подсвечены | прочитать **финал-mvp.md** §7.4 + `Plan.md` §6.4 | [`docs/plans/phase-10-activities.md`](docs/plans/phase-10-activities.md) |
| 11 | Dashboard: KPI + 2 Chart.js + операционные списки | F+B | `src/lib/dashboard.ts`, `src/app/dashboard/page.tsx`, `KpiCard`, `LeadsChart`, `StagesChart`, `RecentLeadsList`, `OverdueTasksList` | 4 KPI; 2 Chart.js; `stagesChart` всегда 5 столбцов (D5); `kpis.openOpportunitiesAmount ?? 0` (D6); `revalidatePath('/dashboard')` во всех мутирующих actions (D13); без realtime | прочитать **финал-mvp.md** §8 + `Plan.md` §5 | [`docs/plans/phase-11-dashboard.md`](docs/plans/phase-11-dashboard.md) |
| 12 | Упаковка к сдаче | F+B+D | `README.md` (финал), `TEST_REPORT.md` (граничные кейсы + E2E), `Plan.md` (все `[x]`) | E2E-сценарий: `install → migrate → seed → dashboard → leads → convert → opportunity → activity → funnel → dashboard` пройден; `prisma migrate status` clean; `npm run build` exit 0 | прочитать **home-work.md** §9 + `Plan.md` §11 | [`docs/plans/phase-12-testing.md`](docs/plans/phase-12-testing.md) |

> **K19** — `CreateOpportunityForm` упомянут в §4 (строка компонентов) и в фазе 9 (мини-план phase-9-funnel.md, шаг 9.5).
> **K18** — модель `Activity` полностью описана в фазе 3.4 (мини-план phase-3-schema.md).
> **M17** — Q5 (server vs client) перенесён в §14 как A8 (см. §14).

### 10.1 Подробные мини-планы

Все детальные шаги, SQL, Zod-сигнатуры и тестовые команды вынесены в `home-work/docs/plans/`:
- [`phase-1-readme.md`](docs/plans/phase-1-readme.md) — README с легендой, стеком, маршрутами, OUT-of-MVP; фиксированные перечисления сущностей и статусов
- [`phase-2-env.md`](docs/plans/phase-2-env.md) — `.env.example`, `.gitignore`, точные версии Prisma/Chart.js/tsx, npm-скрипты `db:*`, удаление `prisma.config.ts` (D11)
- [`phase-3-schema.md`](docs/plans/phase-3-schema.md) — модели Prisma, enum-ы, onDelete, миграция
- [`phase-4-seed.md`](docs/plans/phase-4-seed.md) — фикстуры 5 stages / 4 accounts / 5 contacts / 6 leads / 6 opportunities / 8 activities; идемпотентный upsert; `TODAY`/`YESTERDAY` для просрочек
- [`phase-5-backend.md`](docs/plans/phase-5-backend.md) — `db.ts` singleton + 7 Zod-схем + 6 server-action файлов с типизированным `Result<T>` + smoke-тесты
- [`phase-6-lists.md`](docs/plans/phase-6-lists.md) — 4 таблицы, `SearchInput`/`FilterBar`/`Pagination`/`Badge`, debounce через `useTransition`
- [`phase-7-drawers.md`](docs/plans/phase-7-drawers.md) — Next.js Intercepting Routes, файловая структура `@modal`, back-поведение
- [`phase-8-convert-lead.md`](docs/plans/phase-8-convert-lead.md) — `convertLead` сигнатура, `$transaction`, race-test (`Promise.all`)
- [`phase-9-funnel.md`](docs/plans/phase-9-funnel.md) — `updateOpportunityStage` правила, прогресс-бар, `CreateOpportunityForm`
- [`phase-10-activities.md`](docs/plans/phase-10-activities.md) — `toggleActivityDone`, `useOptimistic` + `useTransition`
- [`phase-11-dashboard.md`](docs/plans/phase-11-dashboard.md) — `getDashboardData`, `_sum.amount ?? 0`, `stage.findMany(_count)`
- [`phase-12-testing.md`](docs/plans/phase-12-testing.md) — шаблон `TEST_REPORT.md` (5 граничных кейсов + 13-шаговый E2E)

---

## 11. Целевое состояние проекта

### 11.1 Файловая структура

```
home-work/
├── README.md                          # стек, маршруты, запуск, бизнес-правила, OUT-of-MVP
├── TEST_REPORT.md                     # пройденные Test-критерии + E2E
├── Plan.md                            # этот план (отражает реальное состояние)
├── package.json                       # точные версии Prisma 6.19.3, chart.js 4.5.1, react-chartjs-2 5.3.1
├── package-lock.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.example                       # DATABASE_URL без реального пароля
├── .gitignore                         # .env, node_modules, .next
├── prisma/
│   ├── schema.prisma                  # 6 моделей + Stage, onDelete Restrict
│   ├── seed.ts                        # детерминированный seed
│   └── migrations/
│       └── <timestamp>_init-crm-schema/
│           └── migration.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx                       # root: принимает slots {children, modal}
│   │   ├── page.tsx                          # редирект на /dashboard
│   │   ├── dashboard/page.tsx
│   │   ├── leads/page.tsx
│   │   ├── leads/[id]/page.tsx
│   │   ├── accounts/page.tsx
│   │   ├── accounts/[id]/page.tsx
│   │   ├── contacts/page.tsx
│   │   ├── contacts/[id]/page.tsx
│   │   ├── opportunities/page.tsx
│   │   ├── opportunities/[id]/page.tsx
│   │   ├── @modal/                           # parallel route slot (D1)
│   │   │   ├── (..)leads/[id]/page.tsx       # intercepting → Drawer overlay
│   │   │   ├── (..)accounts/[id]/page.tsx
│   │   │   ├── (..)contacts/[id]/page.tsx
│   │   │   └── (..)opportunities/[id]/page.tsx
│   │   └── (нет api/ — всё через server actions)
│   ├── components/                    # все компоненты из §4
│   ├── lib/
│   │   ├── db.ts                      # singleton PrismaClient
│   │   ├── validators.ts              # Zod-схемы
│   │   ├── leads.ts, accounts.ts, contacts.ts, opportunities.ts, activities.ts
│   │   ├── convertLead.ts             # $transaction
│   │   ├── dashboard.ts               # groupBy/aggregate
│   │   ├── stages.ts                  # справочник
│   │   └── utils.ts                   # cn()
│   └── types/global.d.ts              # globalThis.__db
└── scripts/                           # (опц.) smoke-тесты
```

### 11.2 E2E-сверка через UI

Каждый пункт из home-work.md §9 «Как зафиксировать результат для проверки» покрывается E2E из фазы 12.3:

| Пункт home-work.md | Покрывается шагом |
|---|---|
| исходный код CRM-lite | `src/` дерево |
| README.md | фаза 1.1, 12.1 |
| .env.example без настоящего .env | фаза 2.1–2.3 |
| Prisma schema и migrations | фаза 3 |
| команда подготовки контрольных данных | фаза 4 |
| созданный сид | фаза 4 |
| нет node_modules, .next, секретов | фаза 12.6 |

### 11.3 Шаблон `TEST_REPORT.md` (K20)

Шаблон `TEST_REPORT.md` с граничными кейсами (convertLead, race, won/lost, toggle-done, stagesChart, openOpportunitiesAmount) и полным E2E-сценарием из `home-work.md` §9 — см. [`docs/plans/phase-12-testing.md`](docs/plans/phase-12-testing.md).

### 11.4 Известные ограничения (фиксируются в README)

- Без ролей / аутентификации — single-user local CRM.
- Без удаления сущностей в UI (onDelete: Restrict в схеме).
- Без realtime / push — Dashboard обновляется через повторный запрос.
- Без email / telegram уведомлений.
- Без мобильной версии — адаптив ≥1024 px baseline.
- Без CI/CD, деплоя, multi-tenant.
- Без сложной аналитики (только 4 KPI + 2 диаграммы + 3 списка: Recent Leads, Overdue Tasks; `Stuck Deals` опционально по final-mvp §8.3 — не реализуется в v1).

---

## 12. Жизненный цикл плана

1. **В работе** — план живёт в `home-work/Plan.md`; §2 обновляется после каждого шага; §10 — после каждой фазы.
2. **Завершение** — все 12 фаз `[x]` в §2; §13 закрыт; §14 зафиксирован. План переходит в статус «готов».
3. **Архивирование** — после сдачи проекта план переносится в `.kilo/plans/tasks/` рядом с `case-1` и `case-2`, добавляется префикс даты.
4. **Новый цикл** — если после сдачи потребуется расширение MVP (роли, удаление, аналитика) — новый план v2, ссылается на этот как на v1.

---

## 13. Открытые вопросы

| # | Вопрос | Текущее допущение | Влияние на план |
|---|---|---|---|
| Q1 | Какой конкретно набор стадий воронки использовать? | `qualification`, `proposal`, `negotiation`, `won`, `lost` (5 шт.) — из final-mvp §3.1 «например, …». | Seed и Stage-прогресс-бар фиксированы на этом наборе. Если нужно другое — поменять seed и список в `StageProgressBar` (фаза 9.2). |
| Q2 | Нужен ли отдельный `Owner` / `User` для `Lead.owner`? | final-mvp §3.1 упоминает «ответственный» как поле лида. | В v1 оставляем `owner String?` (просто строка), без отдельной модели User. Если потребуется — это новая сущность и фаза 13. |
| Q3 | Показывать ли в Drawer сделки поле `expectedCloseDate` / `dueDate` отдельно от `closeDate`? | Используем `dueDate` (плановая дата закрытия) и `closeDate` (фактическая, выставляется при won/lost). | Оба поля присутствуют в `Opportunity`. |
| Q4 | Нужен ли «быстрый фильтр» по статусу лида на `/leads` отдельной кнопкой? | Используем обычный `select` в `FilterBar` (фаза 6.1). | Если нужны chip-кнопки — косметика, не сломает план. |
| Q5 | Какой минимальный seed для «won» сделки, чтобы пройти E2E? | В seed 1 сделка на стадии `won`, `amount` обязательно заполнен, `contactId` есть, `status = 'won'`. | Достаточно для проверки правил §6.3. |
| Q6 | Нужна ли «корзина» / soft-delete? | Нет — финальный MVP не включает. | Если потребуется — отдельная фаза после 12. |

---

## 14. Допущения (assumptions)

| # | Допущение | Что может оказаться неверным | Какие фазы править |
|---|---|---|---|
| A1 | `migrate dev` создаёт **новые** миграции при изменении схемы; `db:reset` пересоздаёт БД с нуля. Идемпотентность контрольных данных обеспечивает `seed.ts` через `upsert`, а не миграции | При первом запуске после изменения `schema.prisma` нужно либо `db:reset`, либо `db:migrate` (создаст новую миграцию) | Фаза 4.5, шаг 12.4 — корректная последовательность: `db:reset` для dev-контура, `db:migrate` для эволюции схемы. Seed идемпотентен через `upsert` |
| A2 | Локальный PostgreSQL уже запущен у ревьюера на 5432 | Ревьюер работает на нестандартном порту или использует managed PostgreSQL | Фаза 2.7 (README) — добавить секцию «Как поднять PostgreSQL локально» |
| A3 | `chart.js@4.5.1` и `react-chartjs-2@5.3.1` совместимы с React 19 | Если React 19 в Next 15 не совместим — нужна версия вниз | Фаза 2.4, фаза 11.3/11.4 |
| A4 | `prisma-client-js` generator + `provider = "postgresql"` + `url = env("DATABASE_URL")` — стандартный Prisma 6-контур, **по определению работает без driver adapters**. `@prisma/adapter-pg`/`PrismaPg`/`prisma.config.ts` не требуются и явно запрещены final-mvp §1 | Если в Prisma 6.19.x обнаружится регрессия, нарушающая это — это будет breaking change самой Prisma, выход за рамки плана | Не править; при регрессии — зафиксировать в Plan.md §13 как блокер и сообщить пользователю |
| A5 | `React.useOptimistic` доступен в React 19 (Next.js 15) | Если версия React ниже 19 — fallback на ручной `useState` с rollback | Фаза 10.4 — добавить условие на версию React |
| A6 | Zod-схемы покрывают все невалидные кейсы из §6 | Если всплывёт поле, не покрытое Zod | Фаза 5.2 — дополнить схемы, регенерировать валидацию |
| A7 | Server actions в Next.js 15 достаточно для всего CRUD, включая Optimistic UI (через `useOptimistic` + `useTransition`); **отдельные `POST /api/...` endpoint'ы не нужны** | Если для revalidatePath понадобится API endpoint — добавить (не ожидается) | Фазы 5, 10 |
| A8 | **Server Components по умолчанию.** Client — минимально: интерактивные формы (`LeadForm`/`AccountForm`/`ContactForm`/`OpportunityForm`/`CreateOpportunityForm`/`ConvertLeadAccordion`/`ActivityForm`), `TaskCheckbox` (Optimistic UI), `Chart*` (Chart.js — клиентский), `SearchInput`/`FilterBar` (debounce 300 мс через `useTransition`), `Toast`. Все остальное — server (включая `Drawer` shell). | Если окажется, что нужен клиентский state в других местах — добавить | Фазы 6, 7, 10, 11. Детали — в мини-планах [`phase-6-lists.md`](docs/plans/phase-6-lists.md) §4, [`phase-7-drawers.md`](docs/plans/phase-7-drawers.md) §1, [`phase-10-activities.md`](docs/plans/phase-10-activities.md) §4. |
| A9 | **Drawer реализуется через Next.js Intercepting Routes**: `@modal` parallel route slot + `(..)<entity>/[id]` intercepting route — overlay поверх списка, URL-driven, back закрывает Drawer | Если intercepting routes окажутся нестабильны в Next.js 15 — fallback на `?drawer=` query + client overlay | Фаза 7 — структура `src/app/@modal/(..)<entity>/[id]/page.tsx` |
| A10 | Seed-данные после `db:reset` детерминированы: `TODAY` фиксируется в начале `seed.ts`, все `dueDate` вычисляются от `TODAY ± N дней` | Если seed использует `Date.now()` напрямую (а не через переменную) — сценарий становится нестабильным | Фаза 4 — все даты через `TODAY`, зафиксированную в начале |
| A11 | Корень проекта — `F:\Practicum\vibe-projects\crm\home-work\`. Все артефакты (код, схема, seed, README, .env) создаются здесь. | Не применимо | Не применимо |
| A12 | «Воронка сделок» интерпретируется как **таблица** `/opportunities` с бейджами стадий (по final-mvp §7.1), **НЕ kanban-board** | Если ревьюер курса ожидает kanban-board (pipeline-view) — потребуется новая фаза 13 | Фаза 9 — таблица с бейджами + фильтр `?stage=`; опциональный board-view в фазе 13 |

---

**Конец плана.** Версия: v1. Следующий шаг — финализация пользователем, перенос в репозиторий, начало работы по фазам 1–2.
