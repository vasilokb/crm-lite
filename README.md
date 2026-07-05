# CRM-lite — Агентство выставочных стендов

> Документ для ревьюера и для нового разработчика: что это за CRM, какой стек, какие правила, что входит в MVP и что нет.
> Главный план — [`Plan.md`](Plan.md). Контракт MVP — [`docs/final-mvp.md`](docs/final-mvp.md) (ред. 7.0). Постановка задачи — [`docs/home-work.md`](docs/home-work.md).

## 1.1 О проекте (легенда агентства выставочных стендов)

CRM-lite — локальное однопользовательское веб-приложение для **агентства выставочных стендов, пространств и бренд-зон**. Агентство получает входящие запросы с сайта, по email, телефону, через рекомендации и вручную от менеджеров. Продажа редко закрывается сразу: менеджер квалифицирует лид, связывает его с компанией (`Account`) и контактом (`Contact`), оценивает бюджет, уточняет площадку, сроки и формат работ, а затем ведёт сделку (`Opportunity`) по стадиям воронки до `won`/`lost`.

Цель — **не терять входящие запросы**, видеть воронку, контролировать просрочки и понимать потенциальную выручку в работе (см. [`docs/final-mvp.md`](docs/final-mvp.md) §1).

**Режим работы:** локальный, один пользователь, без аутентификации, без realtime.

**Обязательные сущности CRM-lite:** `Lead`, `Account`, `Contact`, `Stage`, `Opportunity`, `Activity` (см. [`Plan.md`](Plan.md) §6.1, [`docs/final-mvp.md`](docs/final-mvp.md) §3.1).

## 1.2 Стек

- **Next.js App Router** + React + TypeScript (strict) + Tailwind.
- **PostgreSQL** + **Prisma 6.19.3** — `generator client { provider = "prisma-client-js" }`, `datasource db { provider = "postgresql"; url = env("DATABASE_URL") }` в `prisma/schema.prisma`. Версии в `package.json` фиксируются точно: `prisma@6.19.3`, `@prisma/client@6.19.3` (установка через `--save-exact`, без `^`/`~`).
- **Запрещено:** `@prisma/adapter-pg`, `PrismaPg`, `prisma.config.ts` (требование [`docs/final-mvp.md`](docs/final-mvp.md) §2; в `package.json` ничего из этого быть не должно).
- **Zod** — единый источник правил для server actions; серверная валидация обязательна, UI-валидация — только UX.
- **chart.js@4.5.1** + **react-chartjs-2@5.3.1** — дашборд (версии зафиксированы).
- **Локальный режим, без realtime** — Dashboard обновляется через повторный запрос при навигации; websockets, SSE, polling не используются.

## 1.3 Маршруты

- `/dashboard` — KPI + 2 Chart.js-диаграммы + операционные списки.
- `/leads`, `/accounts`, `/contacts`, `/opportunities` — табличные списки с пагинацией, поиском и фильтрами.
- `/leads/[id]`, `/accounts/[id]`, `/contacts/[id]`, `/opportunities/[id]` — Drawer-карточки через **Next.js Intercepting Routes** (parallel slot `@modal` + `(..)<entity>/[id]`). Один активный Drawer; URL-driven, замена содержимого вместо наслоения; Back предсказуем (см. [`Plan.md`](Plan.md) §6.7, [`docs/final-mvp.md`](docs/final-mvp.md) §4–§5).
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
createdb crm_lite_dev
psql -d crm_lite_dev -c "SELECT 1;"
```

Ожидаемый ответ: `?column?`\n`----------`\n`        1`\n`(1 row)`.

### Запуск проекта

**macOS / Linux (bash):**

```bash
cp .env.example .env                # затем отредактируй .env, укажи реальный пароль
npm install
npm run db:migrate                  # применить схему (требует prisma/schema.prisma — фаза 3)
npm run db:seed                     # контрольные данные 6/4/5/6/8 (требует prisma/seed.ts — фаза 4)
npm run dev                         # http://localhost:3000  → редирект на /dashboard
```

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env          # затем отредактируй .env, укажи реальный пароль
npm install
npm run db:migrate
npm run db:seed
npm run dev                          # http://localhost:3000 → редирект на /dashboard
```

> **Примечание:** `db:migrate` и `db:seed` заработают только после фаз 3 и 4 (появятся `prisma/schema.prisma` и `prisma/seed.ts`). На время фазы 2 достаточно того, что `.env.example`, `.gitignore`, точные версии и скрипты `db:*` зарегистрированы (см. [`docs/plans/phase-2-env.md`](docs/plans/phase-2-env.md) §6).

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

## 1.7 Известные ограничения

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

---

**Открытые вопросы** по проекту — [`Plan.md`](Plan.md) §13. Перед стартом фазы 2/3 их нужно подтвердить с пользователем.
