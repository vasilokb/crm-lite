# CRM-lite — Агентство выставочных стендов

https://crm-lite-azure.vercel.app/dashboard  <-- тут развернуто

> Документ для ревьюера и для нового разработчика: что это за CRM, какой стек, какие правила, что входит в MVP и что нет.
> Главный план — [`Plan.md`](Plan.md). Контракт MVP — [`docs/final-mvp.md`](docs/final-mvp.md) (ред. 7.0). Постановка задачи — [`docs/home-work.md`](docs/home-work.md).

## 1.1 О проекте (легенда агентства выставочных стендов)

CRM-lite — локальное однопользовательское веб-приложение для **агентства выставочных стендов, пространств и бренд-зон**. Агентство получает входящие запросы с сайта, по email, телефону, через рекомендации и вручную от менеджеров. Продажа редко закрывается сразу: менеджер квалифицирует лид, связывает его с компанией (`Account`) и контактом (`Contact`), оценивает бюджет, уточняет площадку, сроки и формат работ, а затем ведёт сделку (`Opportunity`) по стадиям воронки до `won`/`lost`.

Цель — **не терять входящие запросы**, видеть воронку, контролировать просрочки и понимать потенциальную выручку в работе (см. [`docs/final-mvp.md`](docs/final-mvp.md) §1).

**Режим работы:** локальный, один пользователь, без аутентификации, без realtime.

> С A9 — мультитенантность с Auth.js: одна регистрация = одна компания; в неё автоматически добавляются 2 демо-участника (`jane.doe+<orgSlug>@demo.example`, `john.doe+<orgSlug>@demo.example`, пароль `demo1234`) и 2 лида/компании/контакта/сделки/активности. См. `src/lib/stages.ts` (`seedDemoData`). В реальном B2B так делать нельзя — фейковые loginable-юзеры; позже вынести в опцию.

**Обязательные сущности CRM-lite:** `Lead`, `Account`, `Contact`, `Stage`, `Opportunity`, `Activity` (см. [`Plan.md`](Plan.md) §6.1, [`docs/final-mvp.md`](docs/final-mvp.md) §3.1).

## 1.2 Стек

- **Next.js 16.2.10 (App Router)** + **React 19.2.4** + **TypeScript** (strict) + **Tailwind v4**.
- **PostgreSQL** + **Prisma 6.19.3** — `generator client { provider = "prisma-client-js" }`, `datasource db { provider = "postgresql"; url = env("DATABASE_URL") }` в `prisma/schema.prisma`. Версии в `package.json` фиксируются точно: `prisma@6.19.3`, `@prisma/client@6.19.3` (установка через `--save-exact`, без `^`/`~`).
- **Запрещено:** `@prisma/adapter-pg`, `PrismaPg`, `prisma.config.ts` (требование [`docs/final-mvp.md`](docs/final-mvp.md) §2; в `package.json` ничего из этого быть не должно).
- **Zod** — единый источник правил для server actions; серверная валидация обязательна, UI-валидация — только UX.
- **chart.js@4.5.1** + **react-chartjs-2@5.3.1** — дашборд (версии зафиксированы).
- **Локальный режим, без realtime** — Dashboard обновляется через повторный запрос при навигации; websockets, SSE, polling не используются.

### Зафиксированные версии

| Пакет | Версия | Где |
|---|---|---|
| next | 16.2.10 | dependency |
| react | 19.2.4 | dependency |
| react-dom | 19.2.4 | dependency |
| prisma | 6.19.3 | devDependency |
| @prisma/client | 6.19.3 | dependency |
| chart.js | 4.5.1 | dependency |
| react-chartjs-2 | 5.3.1 | dependency |
| zod | ^3.25.76 | dependency |
| tsx | ^4.23.0 | devDependency (для db:seed и smoke-тестов) |

## 1.3 Маршруты

- `/dashboard` — KPI + 2 Chart.js-диаграммы + операционные списки.
- `/leads`, `/accounts`, `/contacts`, `/opportunities` — табличные списки с пагинацией, поиском и фильтрами.
- `/products` — каталог продуктов организации (таблица с типом Простое/Бандл, базовой ценой, счётчиком сделок); поиск по названию; пагинация; НЕТ кнопки удаления.
- `/products/[id]` — full-page fallback карточки продукта (если открыт не из списка).
- `/leads/[id]`, `/accounts/[id]`, `/contacts/[id]`, `/opportunities/[id]`, `/products/[id]` — Drawer-карточки через **Next.js Intercepting Routes** (parallel slot `@modal` + `(.)<entity>/[id]`). Маркер `(.)` — корректно для Next.js 16.2.10: `@modal` и `<entity>` оба на root level, поэтому `(..)` невозможен. Один активный Drawer; URL-driven, замена содержимого вместо наслоения; Back предсказуем (см. [`Plan.md`](Plan.md) §6.7, [`docs/final-mvp.md`](docs/final-mvp.md) §4–§5).
- `/` — редирект на `/dashboard`.

## 1.4 Как запустить

### Требования

- **Node.js** 20.19+ или 22.13+ (или ≥24).
- **PostgreSQL 13+** (рекомендуется 16), запущенный локально на `localhost:5432`.
- **npm** (или pnpm/yarn — примеры ниже под npm).

#### Установка PostgreSQL (если не установлена)

- **macOS:** `brew install postgresql@16 && brew services start postgresql@16`
- **Linux:** `sudo apt install postgresql postgresql-contrib && sudo systemctl start postgresql`
- **Windows:** скачать установщик с <https://www.postgresql.org/download/windows/>, установить, убедиться, что служба `postgresql-x64-XX` запущена.

После установки создай dev-БД и проверь подключение:

```bash
createdb crm_dev
psql -d crm_dev -c "SELECT 1;"
```

Ожидаемый ответ: `?column?`\n`----------`\n`        1`\n`(1 row)`.

### Запуск проекта

**macOS / Linux (bash):**

```bash
cp .env.example .env                # затем отредактируй .env, укажи реальный пароль
npm install
npm run db:migrate                  # применить схему + создать БД crm_dev
npm run db:seed                     # контрольные данные 6/4/5/6/8
npm run dev -- -p 3001              # http://localhost:3001 → редирект на /dashboard
```

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env          # затем отредактируй .env, укажи реальный пароль
npm install
npm run db:migrate
npm run db:seed
npm run dev -- -p 3001               # http://localhost:3001 → редирект на /dashboard
```

> **Порт 3001 (не 3000)** — в рабочем окружении порт 3000 занят другим приложением, поэтому dev-сервер стартует на 3001. Чтобы использовать другой порт — замените `3001` на нужный. 
> 
> `npm run db:migrate` сам создаст БД `crm_dev` (если не существует) и применит все миграции из `prisma/migrations/`. `npm run db:seed` идемпотентен (повторный запуск не дублирует данные).

### Безопасное изменение схемы

- **Эволюция схемы:** правишь `prisma/schema.prisma` → `npm run db:migrate` (создаёт новую миграцию и применяет её локально). Миграции лежат в `prisma/migrations/` и идут в комплекте с репозиторием.
- **Воспроизведение на другой машине:** `git clone` → `npm install` → `npm run db:migrate` → `npm run db:seed`. Никакой ручной правки кода под окружение не требуется.
- **Откат:** автоматического rollback в Prisma нет. Если миграция сломала dev-данные — восстанавливать через `npm run db:reset` (см. ниже). `db:reset` удаляет **все** данные — только в dev-контуре и только после явного подтверждения пользователя (см. [`Plan.md`](Plan.md) §7.2).
- **Агент не выполняет `prisma migrate reset` / `npm run db:reset` без явного подтверждения** (см. [`Plan.md`](Plan.md) §7.2).

### Восстановление dev-data

- **Контрольные данные сломались:** `npm run db:reset` — удалит всё, применит миграции, запустит `db:seed`. Гарантированно возвращается к seed-состоянию: 6 лидов / 4 компании / 5 контактов / 6 сделок / 8 активностей (см. [`Plan.md`](Plan.md) §7.3, [`docs/final-mvp.md`](docs/final-mvp.md) §3.2).
- **Начать с нуля (чистая установка):** `rm -rf node_modules package-lock.json && npm install && npm run db:reset`.
- **Seed идемпотентен** (через `upsert` по уникальным полям — `name`/`email`), повторный `npm run db:seed` не дублирует записи.
- **Агент не читает `.env`** ни прямо, ни через `node -e "console.log(process.env.DATABASE_URL)"` или другие обходы; не выводит `DATABASE_URL` в README / коммит / чат (см. [`Plan.md`](Plan.md) §7.2).

## 1.5 Бизнес-правила

Все правила (статусы, стадии, `won`/`lost`, convert lead, Optimistic UI, dashboard-агрегации, валидация, стратегия удаления, drawer-модель) — **контракт в [`Plan.md`](Plan.md) §6**.

Одна точка истины — план. README правил не дублирует. Если README и `Plan.md` расходятся — доверяем `Plan.md`.

Краткая навигация по контракту:

- Статусы и стадии, контакт ↔ сделка — [`Plan.md`](Plan.md) §6.1.
- Convert lead (атомарность, Accordion, блокировка повторной конвертации) — [`Plan.md`](Plan.md) §6.2.
- Жёсткие правила переходов `won`/`lost` — [`Plan.md`](Plan.md) §6.3.
- Optimistic UI для задач — [`Plan.md`](Plan.md) §6.4.
- Согласованность стадии (список ↔ Drawer) — [`Plan.md`](Plan.md) §6.5.
- Стратегия удаления (`onDelete: Restrict` / `SetNull`, нет UI-кнопки «Удалить») — [`Plan.md`](Plan.md) §6.6.
- Drawer-модель и навигация (Intercepting Routes, back-сценарии) — [`Plan.md`](Plan.md) §6.7.
- Валидация и ошибки (Zod + UX-сообщения) — [`Plan.md`](Plan.md) §6.8.

**Каталог продуктов и гибрид `amount`/`discount` (фаза products):**

- `/products` — каталог организации: простые товары и **бандлы** (составные продукты, `ProductComponent`). Режим B: состав собирается в локальном state формы и отправляется ОДНИМ submit в `createProduct`/`updateProduct` (нет отдельных add/remove component actions).
- **Цена бандла = авто-Σ на сервере** (B5-revised): ручного поля цены для бандла в UI нет; цена вычисляется как `Σ(component.price × quantity)` в `$transaction` и сохраняется в `Product.price`. UI показывает блок «Цена бандла (расчётная): {Σ} ₽», который реактивно обновляется при правке состава.
- **Гибрид `Opportunity.amount`:** если у сделки есть позиции (`LineItem`) — авто-режим, `amount = Σ(unitPrice×quantity) − discount`, сервер игнорирует ручной ввод; в форме поле «Сумма» readOnly с хинтом «Сумма рассчитывается из позиций». Если позиций нет — ручной режим: поле «Сумма» редактируемое.
- **Скидка только в авто-режиме** (`Opportunity.discount`): вводится в footer блока «Товары в сделке» (`OpportunityLineItems`), валидируется `0 ≤ discount ≤ Subtotal`. Попытка ввести больше Subtotal → отказ `discount_exceeds_subtotal`. Удаление последней позиции → сервер обнуляет и `amount`, и `discount` (edge-case входа в ручной режим).
- **Снапшот `unitPrice`:** при создании `LineItem` цена товара копируется из `Product.price` в `LineItem.unitPrice`. Изменение `Product.price` в каталоге НЕ влияет на существующие позиции (только на новые).
- **Tenant-изоляция:** все модели (`Product`, `LineItem`, `ProductComponent`) зарегистрированы в `TENANT_MODELS` (camelCase) → авто-фильтр по `organizationId` через `createTenantPrisma`. См. [`docs/plans/products/products-architecture-v3.md`](docs/plans/products/products-architecture-v3.md) §2, §3, §4.

**Контрольные перечисления** (для проверки, что контракт не потерян):

- Статусы лидов: `new`, `processed`, `converted`.
- Источники лида (`Lead.source`): `site`, `email`, `phone`, `referral`, `manual`.
- Стадии сделок (`Stage.name`): `qualification`, `proposal`, `negotiation`, `won`, `lost`.
- Статусы сделок (`Opportunity.status`): `open`, `won`, `lost`.
- Типы активностей (`Activity.type`): `note`, `task`; для `task` обязательны `dueDate` и `done`.

**Быстрые действия:**

- **Convert lead** — кнопка в Drawer лида → inline-Accordion-форма с обязательным `accountName`; одна `prisma.$transaction` создаёт `Account` / `Contact` / опционально `Opportunity` и обновляет `Lead.status = 'converted'`. Повторная конвертация заблокирована.
- **Note / Task** — формы в timeline активностей Drawer сделки; `task` требует `dueDate`.
- **Toggle `done`** — Optimistic UI: мгновенный апдейт чекбокса задачи → server action в фоне → откат + toast «Не удалось завершить задачу, попробуйте позже» при ошибке.
- **Перевод стадии** — прогресс-бар в Drawer сделки; правила `won` (нужны `amount` и `contactId`) и `lost` (нужен `reasonLost`) проверяются на сервере.

**Метрики Dashboard:**

- 4 KPI: всего лидов, открытых сделок, сумма открытых сделок, просроченных задач.
- 2 Chart.js-диаграммы: по стадиям сделок (`Stage`), по статусам лидов (`Lead.status`).
- Списки: **Recent Leads**, **Overdue Tasks**.
- Агрегации считаются на бэке (`prisma.groupBy` / `prisma.aggregate`), клиентские компоненты диаграмм получают готовые `{ labels: string[]; values: number[] }` через props.

## 1.6 Границы MVP (OUT-of-MVP)

Полный список — [`Plan.md`](Plan.md) §3. Кратко одной строкой:

> Без ролей пользователей, без удаления сущностей в UI, без realtime, без мобильной версии, без CI/CD, без multi-tenant, без сложной аналитики.

## 1.7 Авторизация и multi-tenant (фазы A1–A10)

Полный отчёт приёмки — [`TEST_REPORT.md`](TEST_REPORT.md). Главный план — [`docs/plans/auth/auth-plan.md`](docs/plans/auth/auth-plan.md).

### Как запустить локально

В `.env` (в корне `home-work/`) должны быть:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/crm_dev?schema=public"
AUTH_SECRET="<openssl rand -base64 32>"   # обязателен (Auth.js v5)
AUTH_URL="http://localhost:3001"
RESEND_API_KEY=""                          # опционально; без ключа invite-ссылка выводится в console
```

Первый запуск:

```bash
npm run db:reset    # = prisma migrate reset --force && db:seed (создаст demo-agency)
npm run dev         # http://localhost:3001
```

### Тестовые аккаунты

| Сценарий | Email | Пароль | Роль |
|---|---|---|---|
| Seed-owner (demo-agency) | `owner@demo.agency` | `demo1234` | owner |
| Demo-участник новой org | `jane.doe+<orgSlug>@demo.example` (slug — из `/team`) | `demo1234` | member |
| Demo-участник новой org | `john.doe+<orgSlug>@demo.example` | `demo1234` | member |

При регистрации новой компании (`/register`) автоматически создаются: 5 стадий воронки + 2 лида / 2 customer / 2 contact / 2 opportunity / 2 activity + Jane Doe & John Doe с membership `member`. Email демо-членов уникален, потому что включает slug организации.

### Архитектура (кратко)

- **Auth.js v5** (`next-auth@5.0.0-beta.31`, `@auth/prisma-adapter@2.11`).
- **Strategy: JWT** (Credentials-провайдер в Auth.js v5 требует JWT; database-session несовместим).
- **`activeOrganizationId`** хранится в `Session.activeOrganizationId` (БД) и подтягивается в JWT через `jwt`-callback: если у пользователя есть активные `Membership`, но нет Session-row — авто-выбор первой membership (`src/auth.ts`).
- **Tenant-изоляция:** `createTenantPrisma(orgId)` (`src/lib/db.ts`) — Prisma client extension, авто-инжектит `organizationId` в `data` для create/createMany/upsert и авто-фильтрует `where` для findMany/findFirst/count/groupBy/updateMany/deleteMany. Single `update`/`delete` по `id` **не** инжектятся — контракт: `findFirst({id, organizationId})` → `update({where:{id}})`.
- **ESLint** запрещает сырой `prisma` вне `src/lib/db.ts` / `src/lib/auth/**` / `src/auth.ts` / auth-flow директорий (`no-restricted-imports`).
- **Роли:** `owner` / `member` (2 уровня). Owner-only: `invite`/`changeRole`/`removeMember`/`cancelInvite` (`src/app/actions/team.ts`). Owner не может понизить/исключить себя (`CANNOT_CHANGE_SELF`).
- **Middleware** (`src/middleware.ts`) — cookie-presence guard, edge-safe; редирект на `/login?from=...` если нет `authjs.session-token`. Реальная проверка сессии — в server components через `auth()`.
- **Workspace switch:** `switchWorkspace(orgId)` обновляет `activeOrganizationId` во всех живых Session; JWT-callback подхватывает на следующем запросе.
- **Drawer-overlay** (`@modal/(.)<entity>/[id]/page.tsx`) сохранён — не переносили роуты в `(app)`-group.

### Маршруты auth

- `/login` — вход (`signIn('credentials')`)
- `/register` — регистрация компании (создаёт User + Org + 5 Stages + demo-data + 2 demo-члена + Membership, затем `signIn`)
- `/invite/[token]` — приём приглашения (`acceptInviteAction` создаёт/обновляет User + Membership, аннулирует токен)
- `/team` — owner: управление командой (приглашение, роли, исключение); member: read-only
- `/api/auth/[...nextauth]` — Auth.js handlers

---

## 1.8 Известные ограничения

- Без ролей / аутентификации (single-user local CRM).
- Без удаления сущностей в UI (на уровне Prisma — `onDelete: Restrict` для `Account→Contact`, `Account→Opportunity`, `Opportunity→Activity`; см. [`Plan.md`](Plan.md) §6.6).
- Без realtime / push — Dashboard обновляется через повторный запрос при навигации.
- Без email / telegram / SMS-уведомлений.
- Без мобильной версии — адаптив ≥1024 px baseline.
- Без CI/CD, деплоя, multi-tenant.
- Без сложной аналитики: только 4 KPI + 2 диаграммы Chart.js + 3 операционных списка (Recent Leads, Overdue Tasks). `Stuck Deals` опционально по [`docs/final-mvp.md`](docs/final-mvp.md) §8.3 — **сознательно не реализуется в v1**.
- Без вложенных модальных окон — один активный Drawer, замена содержимого вместо наслоения.
- Без многоязычности — только `lang="ru"`.
- Без `@prisma/adapter-pg` / `PrismaPg` / `prisma.config.ts` (требование [`docs/final-mvp.md`](docs/final-mvp.md) §2).
- **ID-формат (см. [`Plan.md`](Plan.md) §14 A15):** seed-данные используют slug-id (`seed-opp-*`, `seed-lead-*`, `seed-account-*`, `seed-contact-*`, `seed-act-*`); новые записи через UI получают cuid (генерируется Prisma). Оба формата валидны для server actions — Zod-схемы в `src/lib/validators.ts` принимают и cuid, и slug. Это позволяет тестировать UI на seed-данных без расхождений по id.

---

**Открытые вопросы** по проекту — [`Plan.md`](Plan.md) §13. Перед стартом фазы 2/3 их нужно подтвердить с пользователем.

---

## 1.9 Документация (карта)

> **Порядок чтения для нового разработчика/архитектора:** этот `README.md` → [`docs/architecture.md`](docs/architecture.md) → [`docs/architecture-code.md`](docs/architecture-code.md). **Авторитетно:** README + код; design-документы ниже могут отставать (особенно по стратегии сессии — см. [`architecture.md`](docs/architecture.md) §4).

| Документ | Что внутри |
|---|---|
| `README.md` | entry-point: проект, стек+версии, запуск, тестовые аккаунты, бизнес-правила, auth-кратко, ограничения |
| `docs/architecture.md` | контейнерная диаграмма + потоки + модель данных + auth (**JWT**) — текущая архитектура |
| `docs/architecture-components.md` | компонентная диаграмма (слои) |
| `docs/architecture-code.md` | серверный код: реальные файлы и импорты |
| `docs/auth-architecture-v4.md` | дизайн-обоснование auth/multi-tenant (design-time; стратегия сессии устарела — см. architecture.md §4) |
| `docs/auth-implementation.md` | спецификация реализации (schema/SQL/код; design-time) |
| `docs/final-mvp.md` | контракт CRM-MVP (бизнес-требования) |
| `Plan.md` | главный план CRM-MVP (бизнес-правила §6) |
| `docs/plans/auth/auth-plan.md` + `phase-*.md` | пофазный план auth (A1–A10) |
| `TEST_REPORT.md` | отчёт приёмки auth |
| `DEPLOY-GUIDE.md` | деплой (Vercel/Neon) |
