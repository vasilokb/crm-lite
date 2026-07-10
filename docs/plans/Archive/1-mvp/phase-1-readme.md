# Phase 1 — README + легенда + граница MVP + Plan.md · F+D

> Детальный план для фазы 1 из `../Plan.md` §10. Открывается агентом непосредственно перед фазой 1.
>
> **Контекст для агента (M15):** прочитай `../Plan.md` целиком + [`../../docs/final-mvp.md`](../../docs/final-mvp.md) §1 (бизнес-контекст) + [`../../docs/home-work.md`](../../docs/home-work.md) §Фаза 1 (критерии приёмки).

## 0. Цель

Зафиксировать рабочую рамку: README с легендой агентства выставочных стендов, состав MVP (из `Plan.md` §3), статусы лидов и стадии сделок (`Plan.md` §6.1), быстрые действия и метрики Dashboard (`Plan.md` §6 + `final-mvp.md` §8), открытые вопросы (`Plan.md` §13). README — это «документ для ревьюера и для нового разработчика»: прочитав его, человек должен понять, что это за CRM, какой у неё стек, какие правила, что входит в MVP и что нет.

## 1. README.md — структура

Содержание `README.md` в корне проекта (по §10 фаза 1 Test-критерий):

### 1.1 О проекте (легенда агентства выставочных стендов)

- Агентство выставочных стендов получает входящие запросы с сайта, email, телефона, рекомендаций и ручного ввода.
- Менеджер квалифицирует лид, связывает с компанией (`Account`) и контактом (`Contact`), ведёт сделку (`Opportunity`) по стадиям воронки до `won`/`lost`.
- Цель — не терять запросы, видеть воронку, контролировать просрочки и потенциальную выручку (final-mvp §1).
- Локальный режим (один пользователь, без аутентификации, без realtime).

### 1.2 Стек

- **Next.js App Router** + React + TypeScript (strict) + Tailwind.
- **PostgreSQL** + **Prisma 6.19.3** (`prisma-client-js` generator, `env("DATABASE_URL")` в `schema.prisma`).
- **Запрещено:** `@prisma/adapter-pg`, `PrismaPg`, `prisma.config.ts` (требование final-mvp §1; в `package.json` ничего из этого не должно быть).
- **Zod** — валидация всех входов server actions.
- **chart.js@4.5.1** + **react-chartjs-2@5.3.1** — дашборд.

### 1.3 Маршруты

- `/dashboard` — KPI + 2 Chart.js-диаграммы + операционные списки.
- `/leads`, `/accounts`, `/contacts`, `/opportunities` — табличные списки.
- `/leads/[id]`, `/accounts/[id]`, `/contacts/[id]`, `/opportunities/[id]` — Drawer-карточки через Next.js Intercepting Routes (slot `@modal` + `(..)<entity>/[id]`). Один активный Drawer.

### 1.4 Как запустить

Placeholder-блок со ссылкой на фазу 2 (детали в `phase-2-env.md` §6). Одной строкой: `cp .env.example .env && npm install && npm run db:migrate && npm run db:seed && npm run dev`. Полная версия — в фазе 2.

#### Безопасное изменение схемы
- **Эволюция схемы:** правишь `prisma/schema.prisma` → `npm run db:migrate` (создаёт новую миграцию + применяет её).
- **Откат:** НЕТ автоматического rollback в Prisma. Если миграция сломала dev-данные, восстановить через `npm run db:reset` (пересоздаёт БД + пересидит seed). **Внимание:** `db:reset` удаляет ВСЕ данные — только в dev-контуре и только после явного подтверждения (Plan.md §7.2).
- **Воспроизведение на другой машине:** `git clone` → `npm install` → `npm run db:migrate` → `npm run db:seed`. Миграции в `prisma/migrations/` идут в комплекте с репозиторием.

#### Восстановление dev-data
- **Если контрольные данные сломались:** `npm run db:reset` (удалит всё, применит миграции, запустит seed). Гарантированно возвращается к 6/4/5/6/8.
- **Если нужно начать с нуля:** `rm -rf node_modules package-lock.json && npm install && npm run db:reset`.
- **Seed идемпотентен** (через `upsert` по уникальным полям — `name`/`email`), повторный `npm run db:seed` не дублирует записи.

### 1.5 Бизнес-правила

- Ссылка на `../Plan.md` §6 (контракт). Одна точка истины — план. Никаких дублирований правил в README.
- В README только короткое summary: «Все правила (статусы, стадии, won/lost, convert lead, Optimistic UI, dashboard-агрегации) — в `Plan.md` §6».

### 1.6 Границы MVP (OUT-of-MVP)

- Ссылка на `../Plan.md` §3. Перечислить 1 строкой: «Без ролей, без удаления в UI, без realtime, без мобильной версии, без CI/CD, без multi-tenant».

### 1.7 Известные ограничения

- Без ролей / аутентификации (single-user local CRM).
- Без удаления сущностей в UI (onDelete: Restrict в схеме).
- Без realtime / push — Dashboard обновляется через повторный запрос.
- Без email / telegram уведомлений.
- Без мобильной версии — адаптив ≥1024 px baseline.
- Без CI/CD, деплоя, multi-tenant.

## 2. Контрольные перечисления в README (для §10 Test-критерия)

README должен явно содержать:

- **6 обязательных сущностей CRM-lite:** `Lead`, `Account`, `Contact`, `Stage`, `Opportunity`, `Activity` (Plan.md §6.1).
- **Статусы лидов:** `new`, `processed`, `converted` (Plan.md §6.1).
- **Источники лида:** `site`, `email`, `phone`, `referral`, `manual` (Plan.md §6.1).
- **Стадии сделок:** `qualification`, `proposal`, `negotiation`, `won`, `lost` (Plan.md §6.1).
- **Быстрые действия** (по final-mvp §4):
  - convert lead (Accordion-форма внутри Drawer),
  - добавление note/task (timeline в Drawer сделки),
  - toggle `done` (Optimistic UI),
  - перевод стадии через прогресс-бар (правила won/lost).
- **Метрики Dashboard** (final-mvp §8):
  - 4 KPI: всего лидов, открытых сделок, сумма открытых, просроченных задач.
  - 2 Chart.js-диаграммы: по стадиям сделок, по статусам лидов.
  - Списки: Recent Leads, Overdue Tasks.

## 3. Открытые вопросы (Plan.md §13)

README ссылается на `../Plan.md` §13 как на реестр открытых вопросов. **Перед стартом фазы 2** агент должен:

1. Открыть `Plan.md` §13.
2. Если есть вопросы без ответа, требующие решения пользователя — вывести их в чат для подтверждения (например, Q1 «Какой набор стадий воронки использовать?», Q2 «Нужен ли отдельный User/Owner?»).
3. Без подтверждения не начинать фазу 2 (фаза 2 не зависит от этих решений, но фаза 3 — да, потому что схема должна быть финальной).

## 4. Test-критерии (для отметки [x])

```bash
# README содержит все 5 ключевых блоков
grep -E "Легенда|Стек|Маршруты|Бизнес-правила|OUT-of-MVP" README.md
# Ожидание: все 5 найдены

# Перечислены обязательные сущности
grep -E "Lead|Account|Contact|Stage|Opportunity|Activity" README.md
# Ожидание: все 6 найдены

# Статусы лидов и стадии сделок зафиксированы
grep -E "new.*processed.*converted" README.md
grep -E "qualification.*proposal.*negotiation.*won.*lost" README.md
# Ожидание: оба найдены

# Ссылки на Plan.md есть
grep -E "Plan\.md.*§3|Plan\.md.*§6" README.md
# Ожидание: обе ссылки найдены

# Стек без адаптеров
grep -E "Prisma 6.19.3|chart\.js@4\.5\.1|react-chartjs-2@5\.3\.1" README.md
# Ожидание: все 3 упоминания
```

## 5. Коммит после фазы

```bash
git add README.md
git commit -m "docs: README с легендой агентства, стеком, маршрутами, OUT-of-MVP"
```
