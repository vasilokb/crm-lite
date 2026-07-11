# TEST_REPORT — Acceptance фазы A10 (auth + multi-tenant)

**Дата:** 2026-07-11
**Проект:** CRM-lite (A1–A10 закрыт)

## Окружение

| Компонент | Версия |
|---|---|
| Node.js | v22.11 |
| Next.js | 16.2.10 (App Router, Turbopack) |
| React | 19.2.4 |
| Prisma / @prisma/client | 6.19.3 |
| TypeScript | strict |
| PostgreSQL | локальный (localhost:5432, db=crm_dev) |
| next-auth | 5.0.0-beta.31 (`@auth/prisma-adapter@^2.11.2`) |
| strategy | JWT (database-session несовместим с Credentials в Auth.js v5) |

## Часть 1. Автоматические проверки

### 1.1 Сборка

| Команда | Exit | Примечание |
|---|---|---|
| `npx tsc --noEmit` | **0** | clean |
| `npm run lint` | **0** | 0 errors, 18 pre-existing warnings (в т.ч. unused `OpportunityStatusEnum` — из main до A1) |
| `npm run build` | **0** | ✓ Compiled successfully, маршруты: `/`, `/login`, `/register`, `/invite/[token]`, `/team`, `/dashboard`, `/leads`, `/customers`, `/contacts`, `/opportunities`, `/api/auth/[...nextauth]`, все 4 intercept `(.).../[id]`, middleware registered |

### 1.2 Изоляция tenant + защита от подмены `organizationId`

Скрипт: `scripts/verify-isolation.ts`.

**Результат выполнения:**
```
A sees: [ 'ISO-A(2cbb)' ]
B sees: [ 'ISO-B(cmrf)' ]
injection resisted (la org==A): true (lb org==B despite HACK=a.id): true
ISOLATION_OK: true
```

**Интерпретация:**
- `A` (org `2cbb…`) видит только лид `ISO-A`, созданный через её tenant-client.
- `B` (org `cmrf…`) видит только `ISO-B`, созданный через её client.
- При создании через `ta.lead.create({ organizationId: 'HACK' })` extension **перезаписал** подставленный `HACK` на реальный orgId `A` — `la.organizationId === a.id`.
- При создании через `tb.lead.create({ organizationId: a.id })` (явно чужой orgId) extension перезаписал на `B` — `lb.organizationId === b.id`.
- Итог: **`ISOLATION_OK: true`** — оба tenant-клиента изолированы и устойчивы к подмене orgId в payload.

### 1.3 Контрольные счётчики seed (demo-agency)

SQL: `scripts/seed_counts.sql` (см. репо). Выполнено через `psql -h localhost -U postgres -d crm_dev`.

| Сущность | Спецификация (final-mvp §3.2) | Фактически | OK |
|---|---|---|---|
| Lead | 6 | 6 | ✅ |
| Customer | 4 | 4 | ✅ |
| Contact | 5 | 5 | ✅ |
| Opportunity | 6 | 6 | ✅ |
| Activity | 8 | 8 | ✅ |
| Stage | 5 | 5 | ✅ |
| Просроченные task (done=false, dueDate<CURRENT_DATE) | ≥2 | **4** | ✅ |
| Task на сегодня (done=false, dueDate::date=CURRENT_DATE) | ≥2 | **0** | ⚠ |

**Замечание по task'ам:** seed (`prisma/seed.ts`) фиксирует `TODAY` как `new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 12, 0, 0, 0)` — т.е. дату/время момента seed. Seed выполнялся вчера (2026-07-10), поэтому 2 «сегодняшних» task'а по seed-данным датированы 2026-07-10. На момент приёмки (2026-07-11) они перешли в категорию overdue (вместе с двумя «вчерашними» — итого 4). Это не регрессия, а детерминированное поведение seed относительно даты. **Спецификация ≥2 просроченных выполнена.**

Если нужны свежие «на сегодня» — переинициализировать seed (`npm run db:reset`) в тот же день.

## Часть 2. Ручной UI-чеклист (для пользователя)

Отметь `[x]` по мере прохождения:

- [ ] Регистрация новой компании → владелец залогинен → `/dashboard` непустой (демо-данные: 2 лида, 2 компании, 2 контакта, 2 сделки, 2 активности)
- [ ] `/team` новой org: 3 участника (владелец + Jane Doe + John Doe, оба `member`, пароль `demo1234`)
- [ ] Вход под демо-членом (`jane.doe+<slug>@demo.example` / `demo1234`) → role `member` → `/team` **read-only** (без «+ Пригласить», «Исключить», роле-селекторов)
- [ ] Сценарий final-mvp под владельцем: dashboard → `/leads` → открыть лид → конвертировать (accountName, contactName, createOpportunity) → сделка появилась в `/opportunities` → активность в карточке → воронка отображается
- [ ] Won/Lost: перевести сделку в `won`/`lost` → `closeDate` ставится, dashboard обновляется (openOpportunitiesAmount → 0 для won-стадии)
- [ ] Workspace switch: зарегистрировать 2-ю компанию → в шапке переключатель `ORG:` → данные меняются; попытка `switchWorkspace` на чужую org → `FORBIDDEN`
- [ ] Изоляция визуально: лид/сделка из org A не видны в org B
- [ ] Приглашение: owner создаёт инвайт → ссылка в терминале (dev) → открыть `/invite/<token>` → задать имя+пароль → участник появился в `/team`
- [ ] Профиль-меню: «Выйти» → редирект `/login`; повторный вход ок
- [ ] Неавторизованный запрос `/dashboard` → редирект `/login` (middleware cookie-presence guard)
- [ ] Drawer-overlay для leads/customers/contacts/opportunities работает (клик из списка → overlay; refresh → full-page)
- [ ] Кнопка «+ Новая сделка» видна в новой org (5 дефолтных стадий заинлачены при регистрации)

## Найденные проблемы / регрессии

**Нет блокирующих регрессий.**

Замечания неблокирующие (для бэклога):

1. **Seed timestamp drift:** `prisma/seed.ts` фиксирует TODAY/NOW при выполнении seed. При приёмке через день даты «task на сегодня» смещаются в overdue. Решение (по желанию): параметризовать seed через `seed_today=` аргумент.
2. **Pre-existing lint warnings (18):** `OpportunityStatusEnum unused` (из main до A1) и т.п. — не от A1–A10, не блокеры.
3. **Middleware vs Proxy (Next.js 16 deprecation):** `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.` — A9 использовал `middleware.ts` по спецификации; миграция на `proxy.ts` — задача для следующего этапа (не A10).
4. **Hydration warning на `<body>`:** dev-only quirk Next.js 16 + Turbopack (атрибут `__processed_<uuid>__` инжектируется dev-overlay). Применён `suppressHydrationWarning`; в `next build` атрибут не появляется.

## Итог

**A10 acceptance:**
- 1.1 ✅ все exit 0
- 1.2 ✅ `ISOLATION_OK: true` (изоляция + защита от подмены orgId)
- 1.3 ✅ счётчики 6/4/5/6/8/5 совпадают; просроченных 4 (≥2 ✅)
- 1.3 ⚠ task на сегодня 0 (зависит от даты seed; не регрессия)

**Гейт приёмки:** автоматические проверки пройдены. UI-чеклист — на пользователя.

---

## Приложение A. Лог-фрагменты для воспроизведения

```
# 1.1 build gates
$ npx tsc --noEmit
TSC_EXIT: 0
$ npm run lint
✖ 18 problems (0 errors, 18 warnings)
LINT_EXIT: 0
$ npm run build
✓ Compiled successfully
BUILD_EXIT: 0

# 1.2 isolation
$ npx tsx scripts/verify-isolation.ts
A sees: [ 'ISO-A(2cbb)' ]
B sees: [ 'ISO-B(cmrf)' ]
injection resisted (la org==A): true (lb org==B despite HACK=a.id): true
ISOLATION_OK: true

# 1.3 demo-agency counts
$ psql ... -c '...'
 lead | customer | contact | opportunity | activity | stage | overdue_tasks | today_tasks
------+----------+---------+-------------+----------+-------+---------------+-------------
    6 |        4 |       5 |           6 |        8 |     5 |             4 |           0
```