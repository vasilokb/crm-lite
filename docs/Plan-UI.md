# CRM-lite Post-MVP: Mobile + Performance + Финализация — Plan — Code — Test

> Продолжение `home-work/Plan.md` v1 (все 12 фаз `[x]`, MVP принят ревьюером, задеплоен на Vercel + Neon).
> Контекст: MVP функционально завершён, но UI рассчитан на десктоп ≥1024 px. Цель цикла — очистка пакета сдачи, мобильная адаптация, завершение performance-цикла и финализация артефактов (DEPLOY-GUIDE, TEST_REPORT `[DELIVERED]`, dev-скрипт с портом 3001).
> **Без новых сущностей, без новых полей в БД, без изменений бизнес-логики.** Только Tailwind-классы, баг-фиксы, конфигурация и документация.
> Главный контракт — [`home-work/docs/final-mvp.md`](../../home-work/docs/final-mvp.md) (ред. 7.0). Исходный план — [`home-work/Plan.md`](../../home-work/Plan.md).
>
> **Ревизия 2** — incorporates frontend reviewer feedback (2026-07-07): Phase 0 cleanup, NavHeader text-white bug, Phase 7 narrowing, chart a11y, DEPLOY ordering.

---

## 1. Что из себя представляет цикл

Пост-MVP доработка CRM-lite (Next.js 16 + Prisma + PostgreSQL). Проект деплоен на `https://crm-lite-azure.vercel.app/dashboard`. Цели цикла:

1. **Очистка пакета сдачи** — удалить устаревший `docs/mvp.md`, исправить ложную строку в TEST_REPORT, убрать debug-артефакты.
2. **Мобильная адаптация** — все экраны корректно отображаются на 375 / 768 / 1280 px без горизонтального скролла. NavHeader получает burger-меню, формы складываются в одну колонку на узких экранах, таблицы скроллятся, Drawer раскрывается на весь экран на мобильном.
3. **Завершение performance-цикла** — dashboard с `force-dynamic` → `revalidate=30` (остальные 4 страницы уже ISR), `dashboard/loading.tsx`, `postinstall: prisma generate`. Neon pooling и `directUrl` **уже настроены** в `schema.prisma`.
4. **Финализация артефактов** — dev-скрипт с портом 3001, `DEPLOY-GUIDE.md`, заполнение `[DELIVERED]` в `TEST_REPORT.md`, фикс бага активной ссылки в NavHeader.

**Стек (без изменений):** Next.js 16.2.10 + React 19.2.4 + TypeScript strict + Tailwind v4 + PostgreSQL + Prisma 6.19.3 + Zod v3 + chart.js@4.5.1 + react-chartjs-2@5.3.1.

---

## 2. Активное состояние

Обновляется после каждого шага. После закрытия всех фаз — в архив.

| Фаза | Статус | Закрыта | Комментарий |
|---|---|---|---|
| 0. Очистка пакета: mvp.md, TEST_REPORT:341, tmp-dbg.html | ☐ | ☐ | Блокер формальной сдачи по home-work.md §9 критерий 8 |
| 1. Quick fixes: dev-скрипт, postinstall, DEPLOY-GUIDE, NavHeader color | ☐ | ☐ | |
| 2. NavHeader: burger-меню для мобильного | ☐ | ☐ | Включает фикс text-white на активной ссылке |
| 3. Формы: grid-cols-2 → responsive (1 col на mobile) | ☐ | ☐ | ConvertLeadAccordion, CreateLeadForm, LeadForm |
| 4. Таблицы/списки: overflow-x-auto + hidden secondary columns | ☐ | ☐ | 4 list pages; amount НЕ скрывается |
| 5. Drawer: full-screen на мобильном, touch-friendly | ☐ | ☐ | |
| 6. Dashboard: верификация адаптива + touch targets + chart a11y | ☐ | ☐ | Уже grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 |
| 7. Завершение performance: dashboard ISR + loading.tsx | ☐ | ☐ | 4/5 страниц уже revalidate=30; Neon pooling уже в schema.prisma |
| 8. Финальный QA + Lighthouse + обновление TEST_REPORT.md | ☐ | ☐ | viewport 375/768/1280, Lighthouse ≥95, tsc, build |

**Правило обновления:** после Test-критерия, прошедшего проверку, — отметить `[x]`. Если нет — добавить «⚠ <дата>: <что не прошло>» в «Комментарий».

---

## 3. Бизнес-границы (что НЕ входит в этот цикл)

- Без изменения бизнес-логики, server actions, Zod-схем.
- Без PWA / native app / offline.
- Без аутентификации / ролей.
- Без канбан-доски сделок.
- Без редизайна / изменения цветовой палитры (исключение — баг-фикс невидимой активной ссылки в NavHeader, см. Фазу 1.4).
- Без обновления локализации (labels.ts) — только Tailwind-классы.
- Без изменения структуры маршрутов / Intercepting Routes.
- Без новых npm-зависимостей (burger через чистый React).
- Playwright автотесты — опциональный шаг в Фазе 8.5 (инфраструктура не настроена; при желании — отдельный цикл).

> **Примечание:** `schema.prisma` уже корректно настроен для Neon (`url = env("POSTGRES_PRISMA_URL")` + `directUrl = env("POSTGRES_URL_NON_POOLING")`) — трогать его НЕ нужно.

---

## 4. Имена файлов и слоёв

**Корень проекта:** `F:\Practicum\vibe-projects\crm\home-work\`.
**Корень репо (выше):** `F:\Practicum\vibe-projects\crm\` (здесь `tmp-dbg.html` — debug-артефакт, не часть `home-work/`).

**Файлы, затрагиваемые в цикле:**

| Файл | Фаза | Что меняется |
|---|---|---|
| `docs/mvp.md` | 0 | **Удалить** (устаревший черновик ред. 6.0; `final-mvp.md` ред. 7.0 прямо объявляет его устаревшим) |
| `TEST_REPORT.md` | 0, 8 | Фаза 0: исправить строку 341 (ложное «mvp.md НЕ существует»); Фаза 8: `[DELIVERED]` + секция mobile QA |
| `tmp-dbg.html` (в корне `crm/`) | 0 | Удалить debug-артефакт |
| `package.json` | 1 | `"dev": "next dev -p 3001"`; `"postinstall": "prisma generate"` |
| `DEPLOY-GUIDE.md` | 1 | Новый файл: гайд по деплою на Vercel + Neon |
| `src/components/NavHeader.tsx` | 1, 2 | Фаза 1: фикс `text-white` → `text-violet-600` (lines 32-34). Фаза 2: burger-меню |
| `src/components/ConvertLeadAccordion.tsx` | 3 | `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` (lines 182, 202) |
| `src/components/CreateLeadForm.tsx` | 3 | `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` (lines 332, 429, 461) |
| `src/components/LeadForm.tsx` | 3 | `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` (lines 268, 341) |
| `src/app/leads/page.tsx` | 4 | `overflow-x-auto` wrapper + `hidden sm:table-cell` для второстепенных колонок |
| `src/app/accounts/page.tsx` | 4 | Аналогично |
| `src/app/contacts/page.tsx` | 4 | Аналогично (email/phone → `hidden sm:table-cell`) |
| `src/app/opportunities/page.tsx` | 4 | `overflow-x-auto` wrapper (**amount НЕ скрывается** — ключевое поле) |
| `src/components/Drawer.tsx` | 5 | `w-full max-w-xl` → `w-full sm:max-w-xl` (line 61); padding `p-4 sm:p-6` |
| `src/app/dashboard/page.tsx` | 6, 7 | Фаза 6: chart a11y + touch targets; Фаза 7: `force-dynamic` → `revalidate = 30` |
| `src/app/dashboard/loading.tsx` | 7 | Новый файл (skeleton loader для dashboard) |
| `src/components/StagesChart.tsx`, `LeadsChart.tsx` | 6 | `aria-label` на canvas-контейнер или скрытый `<table>` для скринридеров |

> **Уже сделано (не трогать):** `schema.prisma` (directUrl ✅), `.env.example` (3 env vars ✅), `leads/accounts/contacts/opportunities/page.tsx` (`revalidate = 30` ✅), `leads/accounts/contacts/opportunities/loading.tsx` (✅).

---

## 5. Стек и архитектурные решения

- **Tailwind v4** (`@tailwindcss/postcss`). Адаптив через стандартные брейкпоинты: `sm:` (640px), `md:` (768px), `lg:` (1024px). Целевые viewport'ы: 375 (iPhone SE), 768 (iPad), 1280 (desktop).
- **Mobile-first подход:** базовые классы — для мобильного, `sm:`/`md:`/`lg:` — для больших экранов.
- **Burger-меню** — чистый React `useState` + Tailwind `hidden`/`block`. `NavHeader.tsx` уже `'use client'` (line 1) — mounted gate НЕ нужен (в отличие от `Drawer.tsx`, который обращается к `document.body` через Portal).
- **Drawer на мобильном** — `w-full` базово, `sm:max-w-xl` для tablet+. Backdrop остаётся в DOM, но на мобильном полностью перекрыт aside `w-full`.
- **Таблицы** — приоритет `overflow-x-auto`. Второстепенные колонки (`owner`, `email`, `phone`) скрываются через `hidden sm:table-cell`. **Ключевые данные** (`amount` в `/opportunities`) НЕ скрываются — `overflow-x-auto` обеспечивает скролл.
- **Performance:** `export const revalidate = 30` заменяет `force-dynamic` **только на dashboard** (4 списка уже ISR). Мутирующие server actions по-прежнему вызывают `safeRevalidate('/dashboard')` для мгновенной инвалидации.
- **Neon pooling — уже настроено:** `schema.prisma` lines 9-12 (`url = env("POSTGRES_PRISMA_URL")` + `directUrl = env("POSTGRES_URL_NON_POOLING")`). `.env.example` документирует все 3 env vars. В Vercel — проверить, что env vars заданы корректно.
- **Chart a11y** — `<canvas>` через Chart.js невидим для скринридеров. Решение: `aria-label` на контейнер canvas с текстовым описанием данных, ИЛИ скрытый `<table>`/`<ul>` (`class="sr-only"`) с дублированием `labels[]/values[]`. Данные уже приходят через props — дублирование тривиально.

---

## 6. Технические контракты

### 6.1 Брейкпоинты и viewport'ы

| Viewport | Ширина | Цель |
|---|---|---|
| Mobile | 375 px | iPhone SE / минимальная ширина. Одна колонка, burger-меню, формы в 1 col. |
| Tablet | 768 px | iPad. 2 колонки где уместно, horizontal nav видна (`md:flex`). |
| Desktop | 1280 px | Базовый дизайн (текущий). `max-w-6xl` контейнер, `max-w-xl` Drawer. |

### 6.2 Запреты

- Не использовать `@media` в CSS-файлах — только Tailwind-классы (`sm:`, `md:`, `lg:`).
- Не добавлять новые npm-зависимости.
- Не менять `lang="ru"`, не добавлять i18n.
- Не менять server actions, Zod-схемы, Prisma schema (уже корректно настроена).
- Не удалять существующие функциональные классы — только добавлять responsive-префиксы.
- Не скрывать ключевые данные (`amount`, `title`, `name`) в таблицах — использовать `overflow-x-auto`.

### 6.3 Touch targets

- Минимальный размер кликабельной области — 44×44 px (WCAG 2.5.5 Target Size).
- Применяется к: nav links, burger button, checkbox в TaskCheckbox, кнопки в StageProgressBar, pagination buttons, close button в Drawer.

---

## 7. Окружение

### 7.1 Локальная разработка

- Порт: **3001** (3000 занят). `npm run dev` → `next dev -p 3001`.
- PostgreSQL локально. Env vars: `DATABASE_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` — все указывают на один локальный URL (без pooling). **Важно:** `schema.prisma` требует `POSTGRES_PRISMA_URL` и `POSTGRES_URL_NON_POOLING` — без них `npm run dev` упадёт с `Environment variable not found` (fallback на `DATABASE_URL` не работает, несмотря на комментарий в `schema.prisma:7-8`). Убедиться, что локальный `.env` содержит все 3 ключа (скопировать из `.env.example`).
- `.env` — в `.gitignore`, не читать через терминал.

### 7.2 Продакшн (Vercel + Neon)

- URL: `https://crm-lite-azure.vercel.app/dashboard`
- Vercel env vars (проверить в dashboard): **`POSTGRES_PRISMA_URL`** (Neon, pooled с `?pgbouncer=true` — обязателен) и **`POSTGRES_URL_NON_POOLING`** (Neon, прямой — обязателен для миграций). `DATABASE_URL` — **опциональный** (приложение его не читает; нужен только для `prisma studio` / удобства локальной разработки).
- `schema.prisma` в рантайме читает **только** `POSTGRES_PRISMA_URL` + `POSTGRES_URL_NON_POOLING`. `DATABASE_URL` не используется приложением. **Уже настроено.**
- `postinstall: prisma generate` — добавить в `package.json`.

### 7.3 Канал сдачи

- Два git remote: `origin` → `github.com/vasilokb/crm-lite.git`, `sourcecraft` → `ssh://ssh.sourcecraft.dev/v4sil-burkin/bvm-3-7-1.git`.
- Официальный канал курса — **SourceCraft** (slug `bvm-3-7-1`). GitHub — зеркало для Vercel deploy.
- `[DELIVERED]` в TEST_REPORT должен зафиксировать **SourceCraft** как канал сдачи.

### 7.4 Запреты для ИИ-агента

- Не читать `.env` / `.env.local` / `.env.vercel` ни прямо, ни через терминал.
- Не выполнять `prisma migrate reset` / `db:reset` без подтверждения.
- Не деплоить на Vercel без подтверждения (только локальные правки + push в git).

---

## 8. Контекстные правила для ИИ-агента

> Прочитай `home-work/Plan.md` (контракт MVP), `home-work/docs/final-mvp.md` (ред. 7.0), и этот план. Найди активную фазу в §2. **Все Tailwind-правки — mobile-first:** базовый класс для mobile, `sm:`/`md:`/`lg:` для больших экранов. **Не меняй бизнес-логику** — только className-строки, баг-фиксы и конфигурацию. После выполнения шага — отметь `[x]` в §2 и §10, запусти Test-критерий.

**Чек-лист после каждого шага:**
1. `npx tsc --noEmit` — exit 0.
2. `npm run build` — exit 0 (в конце каждой фазы).
3. Ручная проверка в DevTools на viewport 375 / 768 / 1280 — нет горизонтального скролла.

---

## 9. Сводный план

> Легенда слоя: **F** = frontend, **B** = backend/config, **D** = documentation.

| № | Фаза | Слой | Артефакты | Test-критерий |
|---|---|---|---|---|
| 0 | Очистка пакета | D | удалить `docs/mvp.md`, исправить `TEST_REPORT:341`, удалить `tmp-dbg.html` | `Test-Path docs/mvp.md` — False; TEST_REPORT не содержит ложных утверждений |
| 1 | Quick fixes | B+F+D | `package.json`, `DEPLOY-GUIDE.md`, `NavHeader.tsx` (color fix) | `npm run dev` на :3001; `postinstall` в package.json; активная ссылка `text-violet-600` не `text-white`; DEPLOY-GUIDE существует |
| 2 | NavHeader burger | F | `NavHeader.tsx` | Viewport 375: burger виден, nav скрыт; клик раскрывает; 1280: nav видна, burger скрыт |
| 3 | Формы responsive | F | `ConvertLeadAccordion.tsx`, `CreateLeadForm.tsx`, `LeadForm.tsx` | Viewport 375: grid-cols-2 секции в 1 колонку; 768+: в 2 колонки |
| 4 | Таблицы responsive | F | 4 list pages | `overflow-x-auto` уже есть (commit `16d9871`); добавлены `hidden sm:table-cell` на второстепенные колонки; нет page-level скролла на 375 px |
| 5 | Drawer mobile | F | `Drawer.tsx` | Viewport 375: Drawer во всю ширину; 1280: `max-w-xl` справа |
| 6 | Dashboard mobile + a11y | F | `dashboard/page.tsx`, `StagesChart.tsx`, `LeadsChart.tsx` | Нет H-скролла; chart canvas имеет `aria-label` или скрытую таблицу; touch targets ≥44px |
| 7 | Dashboard ISR | B | `dashboard/page.tsx`, `dashboard/loading.tsx` | `revalidate = 30`; `loading.tsx` существует; `postinstall` в package.json |
| 8 | Финальный QA | F+D | `TEST_REPORT.md` (mobile секция), Lighthouse | 375/768/1280 — без H-скролла; Lighthouse ≥ 95; tsc exit 0; build exit 0 |

---

## 10. Фазы и шаги

> Структура шага: **Действие** → **Результат** → **Test** → **Файлы**.

### Фаза 0. Очистка пакета · D

> **Блокер формальной сдачи.** `home-work/docs/mvp.md` (ред. 6.0) существует, но `final-mvp.md` (ред. 7.0) объявляет его устаревшим. `TEST_REPORT.md:341` ложно утверждает «mvp.md — НЕ существует ✓». `home-work.md` §9 критерий 8 требует чистого пакета без устаревших черновиков.

| # | Вход | Слой | Действие | Результат | Test | Файлы |
|---|---|---|---|---|---|---|
| 0.1 | `docs/mvp.md` (15778 байт, ред. 6.0) | D | Удалить файл. `final-mvp.md:5` прямо пишет: «предыдущие черновики (`mvp.md`) считать устаревшими» | Устаревший черновик удалён | `Test-Path home-work/docs/mvp.md` — False | `home-work/docs/mvp.md` (удалить) |
| 0.2 | `TEST_REPORT.md:341` | D | Исправить строку 341: заменить ложное `docs/mvp.md — НЕ существует ✓` на фактическое состояние после удаления (например: `docs/mvp.md — удалён (устаревший черновик ред. 6.0, заменён final-mvp.md ред. 7.0) ✓`) | TEST_REPORT не содержит ложных утверждений | `Select-String -Pattern "mvp.md.*НЕ существует" TEST_REPORT.md` — пусто (не путать с `screens.md` на строке 342) | `home-work/TEST_REPORT.md` |
| 0.3 | `crm/tmp-dbg.html` | D | Удалить debug-артефакт из корня репозитория (не часть `home-work/`, но в рабочей директории) | Debug-артефакт убран | `Test-Path crm/tmp-dbg.html` — False | `crm/tmp-dbg.html` (удалить) |

**Коммит после фазы:** `chore: удалить устаревший docs/mvp.md, исправить TEST_REPORT, убрать debug-артефакты`

---

### Фаза 1. Quick fixes · B+F+D

| # | Вход | Слой | Действие | Результат | Test | Файлы |
|---|---|---|---|---|---|---|
| 1.1 | `package.json:6` | B | Заменить `"dev": "next dev"` на `"dev": "next dev -p 3001"`. Добавить `"postinstall": "prisma generate"` | dev-сервер на 3001; postinstall генерит клиента | `grep '"dev"' package.json` содержит `-p 3001`; `grep postinstall package.json` — найдено; **запустить `npm run dev`** — `Ready` без ошибки `Environment variable not found` (проверяет, что `.env` содержит `POSTGRES_PRISMA_URL` + `POSTGRES_URL_NON_POOLING`) | `package.json` |
| 1.2 | `NavHeader.tsx:32-34` | F | **Баг-фикс:** активная ссылка использует `text-white` на `bg-white` → невидима в light-режиме. Заменить `'text-white'` → `'text-violet-600 dark:text-violet-400'` | Активная ссылка видима | DevTools 1280 light: активный пункт — фиолетовый, не белый; контраст ≥ 4.5:1 | `src/components/NavHeader.tsx` |
| 1.3 | Vercel + Neon context | D | Создать `DEPLOY-GUIDE.md` в корне `home-work/`: шаги Vercel import → Neon connection (Storage integration) → env vars (`POSTGRES_PRISMA_URL` pooled — обязателен; `POSTGRES_URL_NON_POOLING` direct — обязателен для миграций; `DATABASE_URL` — опционально) → `vercel link` → `npx prisma migrate deploy` → `npm run db:seed` → troubleshooting (cold start, pooling, `directUrl`) | Гайд деплоя существует | `Test-Path home-work/DEPLOY-GUIDE.md` — True | `home-work/DEPLOY-GUIDE.md` |
| 1.4 | DEPLOY-GUIDE + пользователь подтверждает деплой | D | **Выполнить** деплой по гайду (или подтвердить, что уже задеплоено): проверить, что `https://crm-lite-azure.vercel.app/dashboard` живой, env vars в Vercel корректны | Деплой верифицирован | Открыть URL в браузере — dashboard рендерится с данными | (Vercel dashboard) |
| 1.5 | 1.4 подтверждён | D | Заменить `[DELIVERED]` плейсхолдер (`TEST_REPORT.md:368`) на реальные данные: `канал=SourceCraft, дата=YYYY-MM-DD, ссылка=https://crm-lite-azure.vercel.app/dashboard`. Push в `sourcecraft` remote | Плейсхолдер заполнен; push выполнен | `grep "DELIVERED" TEST_REPORT.md` — не найдено (заменено); `git log sourcecraft/main` — последний commit | `home-work/TEST_REPORT.md` |

**Коммит после фазы:** `chore: dev script -p 3001, postinstall, DEPLOY-GUIDE, NavHeader color fix, [DELIVERED] filled`

> **Замечание 1.4–1.5:** Деплой может быть уже выполнен (сайт живой). В этом случае 1.4 = подтверждение (проверить URL + env vars), 1.5 = заполнить `[DELIVERED]` + push в SourceCraft.

---

### Фаза 2. NavHeader: burger-меню · F

> NavHeader.tsx уже `'use client'` (line 1) — mounted gate НЕ нужен (в отличие от Drawer).

| # | Вход | Слой | Действие | Результат | Test | Файлы |
|---|---|---|---|---|---|---|
| 2.1 | `NavHeader.tsx` (текущий, с фикс из 1.2) | F | Добавить `useState` для `menuOpen`. Desktop nav: `hidden md:flex` (видна ≥768 px). Burger button: `md:hidden` (виден <768 px), `min-w-[44px] min-h-[44px]`, `aria-expanded={menuOpen}`, `aria-controls="mobile-menu"` | Burger-меню работает | DevTools 375 px: burger виден, 5 ссылок скрыты; клик → меню раскрывается; 1280: nav видна, burger скрыт | `src/components/NavHeader.tsx` |
| 2.2 | 2.1 | F | Dropdown panel (`id="mobile-menu"`): `md:hidden`, `menuOpen ? block : hidden`, `flex-col`. Ссылки: `min-h-[44px]` touch target, `w-full text-left`, padding `py-3 px-4`. Активная — `text-violet-600` + `bg-violet-50`. Закрытие по клику на ссылку | Меню кликабельно, закрывается | Клик по «Сделки» → переход + меню закрыто; каждая ссылка ≥44 px | `src/components/NavHeader.tsx` |
| 2.3 | 2.2 | F | Закрытие меню при смене маршрута: `useEffect(() => setMenuOpen(false), [pathname])` | Меню закрывается при навигации | Клик по ссылке → меню закрыто | `src/components/NavHeader.tsx` |

**Коммит после фазы:** `feat: NavHeader burger-menu для мобильного (md breakpoint)`

---

### Фаза 3. Формы: responsive grids · F

| # | Вход | Слой | Действие | Результат | Test | Файлы |
|---|---|---|---|---|---|---|
| 3.1 | `ConvertLeadAccordion.tsx` lines 182, 202 | F | `grid grid-cols-2 gap-2` → `grid grid-cols-1 sm:grid-cols-2 gap-2` (×2) | Формы конвертации складываются | DevTools 375: 1 колонка; 768+: 2 | `src/components/ConvertLeadAccordion.tsx` |
| 3.2 | `CreateLeadForm.tsx` lines 332, 429, 461 | F | Аналогично (×3) | Форма создания лида складывается | Аналогично | `src/components/CreateLeadForm.tsx` |
| 3.3 | `LeadForm.tsx` lines 268, 341 | F | Аналогично (×2) | Форма лида складывается | Аналогично | `src/components/LeadForm.tsx` |

**Коммит после фазы:** `fix: responsive grid-cols-2 → 1 col on mobile (ConvertLead, CreateLead, LeadForm)`

---

### Фаза 4. Таблицы и списки: responsive · F

> Приоритет — `overflow-x-auto`. Второстепенные колонки скрываются (`hidden sm:table-cell`). **Ключевые данные** (`amount`, `title`, `name`) НЕ скрываются.

| # | Вход | Слой | Действие | Результат | Test | Файлы |
|---|---|---|---|---|---|---|
| 4.1 | `src/app/leads/page.tsx:81` | F | `overflow-x-auto` wrapper **уже присутствует** (line 81). Добавить только `hidden sm:table-cell` на `<th>` + `<td>` колонки `company` (доступна в Drawer). Колонки: name, source, status, company, created (5 шт) | Hidden-классы добавлены | DevTools 375: `company` скрыта; 768+: видна | `src/app/leads/page.tsx` |
| 4.2 | `src/app/accounts/page.tsx:42` | F | `overflow-x-auto` wrapper **уже присутствует** (line 42). 4 колонки (name, website, contacts, opportunities) — узкая таблица. `website` → `hidden sm:table-cell` (опц.). Relation-счётчики `contacts`/`opportunities` кликабельны — НЕ прятать | Hidden-классы добавлены (опц.) | DevTools 375: нет page-level скролла; счётчики видны | `src/app/accounts/page.tsx` |
| 4.3 | `src/app/contacts/page.tsx:50` | F | `overflow-x-auto` wrapper **уже присутствует** (line 50). Добавить `hidden sm:table-cell` на `email` + `phone` (в `<th>` + `<td>`, доступны в Drawer). Колонки: name, email, phone, company | Hidden-классы добавлены | DevTools 375: `email`/`phone` скрыты; 768+: видны | `src/app/contacts/page.tsx` |
| 4.4 | `src/app/opportunities/page.tsx:92` | F | `overflow-x-auto` wrapper **уже присутствует** (line 92). Добавить `hidden sm:table-cell` на `company` + `contact` (relation-колонки, продублированы в Drawer). Колонки: title, amount, stage, status, company, contact (6 шт — самая широкая). **`amount` НЕ скрывается.** Скрытие здесь даёт наибольший эффект на 375 px | Hidden-классы добавлены; amount виден | DevTools 375: 4 колонки видны (title, amount, stage, status); 768+: 6 колонок | `src/app/opportunities/page.tsx` |

**Коммит после фазы:** `fix: responsive tables — overflow-x-auto + hidden secondary columns`

---

### Фаза 5. Drawer: mobile full-screen · F

| # | Вход | Слой | Действие | Результат | Test | Файлы |
|---|---|---|---|---|---|---|
| 5.1 | `Drawer.tsx:61` | F | Заменить `w-full max-w-xl` → `w-full sm:max-w-xl`. На 375 px Drawer занимает 100% ширины, backdrop полностью перекрыт aside | Drawer full-screen на mobile | DevTools 375: aside = 100% ширины; 1280: `max-w-xl` справа | `src/components/Drawer.tsx` |
| 5.2 | 5.1 | F | Padding в Drawer body: `p-4 sm:p-6` (если ещё не так). Close button: `min-w-[44px] min-h-[44px]` touch target | Touch-friendly | Кнопка × ≥44×44 px; контент не прижат к краю | `src/components/Drawer.tsx`, `DrawerHeader.tsx` |

**Коммит после фазы:** `fix: Drawer full-screen на мобильном, touch-friendly`

---

### Фаза 6. Dashboard: верификация адаптива + chart a11y · F

> Dashboard уже `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — верификация + a11y.

| # | Вход | Слой | Действие | Результат | Test | Файлы |
|---|---|---|---|---|---|---|
| 6.1 | `dashboard/page.tsx` (уже responsive) | F | Верифицировать: KpiCards (4 → 2 на 768 → 1 на 375), StagesChart/LeadsChart (2 → 1 col), RecentLeadsList/OverdueTasksList (2 → 1). Точечно добавить `sm:`/`lg:` если найдены проблемы | Dashboard адаптивен | DevTools 375/768/1280: нет H-скролла; графики не обрезаны | `src/app/dashboard/page.tsx` |
| 6.2 | 6.1 | F | **Chart a11y:** добавить `aria-label` на контейнер canvas в `StagesChart.tsx` и `LeadsChart.tsx` (например, `aria-label="Диаграмма сделок по стадиям: квалификация N, предложение N, ..."`) ИЛИ скрытый `<ul class="sr-only">` с дублированием `labels[]/values[]` | Canvas видим для скринридеров | Lighthouse: canvas не flagged как lacking accessible name | `src/components/StagesChart.tsx`, `LeadsChart.tsx` |
| 6.3 | 6.1 | F | Touch targets: `KpiCard`, ссылки в `RecentLeadsList`/`OverdueTasksList` — если `< 44px`, добавить `min-h-[44px]` | Touch-friendly | Все кликабельные элементы ≥44 px | `src/components/KpiCard.tsx`, `RecentLeadsList.tsx`, `OverdueTasksList.tsx` |

**Коммит после фазы:** `fix: dashboard chart a11y + touch targets + верификация mobile`

---

### Фаза 7. Завершение performance: dashboard ISR · B

> **80% уже сделано.** 4 списка (`leads`, `accounts`, `contacts`, `opportunities`) уже `revalidate = 30` (commit `16d9871`). `loading.tsx` для списков уже существуют. Neon pooling + `directUrl` уже в `schema.prisma`. Осталось **только dashboard**.

| # | Вход | Слой | Действие | Результат | Test | Файлы |
|---|---|---|---|---|---|---|
| 7.1 | `dashboard/page.tsx:9` `force-dynamic` | B | Заменить `export const dynamic = 'force-dynamic'` на `export const revalidate = 30` | ISR на dashboard | `grep "force-dynamic" dashboard/page.tsx` — пусто; `grep "revalidate" dashboard/page.tsx` — найдено | `src/app/dashboard/page.tsx` |
| 7.2 | `dashboard/loading.tsx` не существует | B | Создать `src/app/dashboard/loading.tsx` — skeleton loader (как в других списках: KPI-placeholder cards + chart-placeholder boxes) | Loading state для dashboard | `Test-Path src/app/dashboard/loading.tsx` — True | `src/app/dashboard/loading.tsx` |
| 7.3 | `package.json` | B | **Верификация:** убедиться, что `"postinstall": "prisma generate"` присутствует (добавлено в Фазе 1.1 — единственное место добавления) | Prisma client генерируется на Vercel | `grep postinstall package.json` — найдено | `package.json` |
| 7.4 | Vercel env vars | B | Проверить в Vercel dashboard: **`POSTGRES_PRISMA_URL`** (pooled) + **`POSTGRES_URL_NON_POOLING`** (direct) — оба обязательны и заданы. `DATABASE_URL` — опциональный (приложение не читает) | Neon pooling верифицирован | В Vercel Settings → Environment Variables: `POSTGRES_PRISMA_URL` + `POSTGRES_URL_NON_POOLING` присутствуют | (Vercel dashboard) |

**Коммит после фазы:** `perf: dashboard ISR revalidate=30 + loading.tsx`

> **Замечание 7.1:** После переключения на ISR проверить, что server actions корректно инвалидируют кэш через `safeRevalidate('/dashboard')`. Все 12 мутирующих actions уже вызывают его (D13 из MVP Plan.md). Если кэш не инвалидируется — см. D-4.

---

### Фаза 8. Финальный QA · F+D

| # | Вход | Слой | Действие | Результат | Test | Файлы |
|---|---|---|---|---|---|---|
| 8.1 | Фазы 0–7 закрыты | F | Полный проход на viewport 375/768/1280: `/dashboard` → `/leads` → drawer → convert → `/opportunities` → drawer → stage change → `/accounts` → `/contacts`. Нет H-скролла нигде. Burger работает. Drawer full-screen. Формы 1 col | Сайт полностью адаптивен | Чек-лист пройден | — |
| 8.2 | 8.1 | F | `npx tsc --noEmit` — exit 0. `npm run build` — exit 0 | Сборка чистая | tsc exit 0; build exit 0 | — |
| 8.3 | 8.2 | D | Добавить в `TEST_REPORT.md` секцию «Mobile QA (Post-MVP)»: viewport 375/768/1280, burger, drawer full-screen, forms 1 col, tables overflow/hidden, chart a11y, Lighthouse | Mobile QA задокументирован | `grep "Mobile QA" TEST_REPORT.md` — найдено | `home-work/TEST_REPORT.md` |
| 8.4 | 8.3 | D | Lighthouse Accessibility audit на `/dashboard` и `/leads` — скриншот, цель ≥ 95. Если ниже — зафиксировать как known limitation в TEST_REPORT | Lighthouse AA | Lighthouse Accessibility ≥ 95 на обоих маршрутах | — |
| 8.5 | *(опционально)* 8.1 | F | **Playwright mobile smoke-test** (если инфраструктура настроена): добавить `viewport: { width: 375, height: 667 }` context, smoke-проверка: нет H-скролла на `/dashboard` и `/leads`, burger виден на 375. **Инфраструктура не существует** (нет `.spec.ts` файлов) — при желании создать `playwright.config.ts` + 1 smoke-спеку как regression-gate | Mobile regression-gate | `npx playwright test` — pass (если настроено) | *(новые файлы при желании)* |

**Коммит после фазы:** `docs: mobile QA в TEST_REPORT, post-MVP цикл завершён`

> **Замечание 8.5:** MVP Plan.md упоминает «E2E Playwright 15/15» (§6.7), но `.spec.ts` файлов в проекте не найдено — тесты были запущены ad-hoc в предыдущей сессии и не закоммичены. Шаг 8.5 опционален: либо поднять инфраструктуру с нуля, либо отложить в отдельный цикл.

---

## 11. Целевое состояние

### 11.1 Что изменилось после цикла

```
home-work/
├── package.json              # + "dev": "next dev -p 3001", + "postinstall": "prisma generate"
├── DEPLOY-GUIDE.md           # НОВЫЙ: гайд Vercel + Neon деплоя
├── TEST_REPORT.md            # §4.4 исправлена (mvp.md); [DELIVERED] заполнен (SourceCraft); + секция "Mobile QA"
├── docs/
│   └── mvp.md                # УДАЛЕН (устаревший ред. 6.0)
└── src/
    ├── app/
    │   ├── dashboard/
    │   │   ├── page.tsx            # revalidate = 30 вместо force-dynamic; chart a11y
    │   │   └── loading.tsx         # НОВЫЙ: skeleton loader
    │   ├── leads/page.tsx          # overflow-x-auto + hidden columns
    │   ├── accounts/page.tsx       # аналогично
    │   ├── contacts/page.tsx       # аналогично
    │   └── opportunities/page.tsx  # аналогично (amount виден всегда)
    └── components/
        ├── NavHeader.tsx           # text-violet-600 (fix) + burger-меню
        ├── Drawer.tsx              # w-full sm:max-w-xl (full-screen на mobile)
        ├── ConvertLeadAccordion.tsx # grid-cols-1 sm:grid-cols-2
        ├── CreateLeadForm.tsx      # grid-cols-1 sm:grid-cols-2
        ├── LeadForm.tsx            # grid-cols-1 sm:grid-cols-2
        ├── StagesChart.tsx         # aria-label / sr-only table
        ├── LeadsChart.tsx          # aria-label / sr-only table
        ├── KpiCard.tsx             # min-h-[44px] (если нужно)
        ├── RecentLeadsList.tsx     # min-h-[44px] (если нужно)
        └── OverdueTasksList.tsx    # min-h-[44px] (если нужно)
```

### 11.2 Контрольная сверка

```
[ ] docs/mvp.md — НЕ существует (удалён в Фазе 0)
[ ] TEST_REPORT.md:341 — исправлена (нет ложного утверждения)
[ ] tmp-dbg.html — НЕ существует
[ ] npm run dev → порт 3001
[ ] package.json: postinstall prisma generate
[ ] NavHeader: активная ссылка text-violet-600 (не text-white)
[ ] Viewport 375 px: burger виден, открывается, навигация работает
[ ] Viewport 375 px: формы в 1 колонку, нет H-скролла
[ ] Viewport 375 px: таблицы — нет page-level скролла; внутренний скролл таблицы допустим
[ ] Viewport 375 px: Drawer во всю ширину
[ ] Viewport 375 px: chart canvas имеет aria-label
[ ] Viewport 768 px: 2 колонки где уместно, nav видна
[ ] Viewport 1280 px: десктопный вид без регрессий
[ ] Dashboard: revalidate = 30, loading.tsx существует
[ ] DEPLOY-GUIDE.md существует
[ ] TEST_REPORT.md: [DELIVERED] заполнен (SourceCraft), секция Mobile QA
[ ] npx tsc --noEmit — exit 0
[ ] npm run build — exit 0
[ ] Lighthouse Accessibility ≥ 95 на /dashboard и /leads
```

---

## 12. Жизненный цикл плана

1. **В работе** — план живёт в `home-work/docs/Plan-UI.md` (канонический файл); §2 обновляется после каждого шага. Прочие plan-файлы (`.kilo/plans/Plan-UI.md`, `.kilo/plans/Plan-rebuild-ui.md`, `home-work/docs/plans/Archive/Plan.md`) — устаревшие/архивные, не редактировать.
2. **Завершение** — все 9 фаз `[x]` в §2.
3. **Архивирование** — переименовать в `Plan.completed.md` или переместить в `tasks/`. Последняя строка: `Архивировано <YYYY-MM-DD>`.
4. **Новый цикл** — следующая задача (Playwright автотесты, канбан-доска, роли) → новый план.

---

## 13. Открытые вопросы

| # | Вопрос | Текущее допущение | Влияние на план |
|---|---|---|---|
| Q1 | Какой официальный канал сдачи курса? | SourceCraft (slug `bvm-3-7-1`) — на это указывает структура. GitHub — зеркало для Vercel. | Фаза 1.5 — push в `sourcecraft` remote; `[DELIVERED]` фиксирует SourceCraft |
| Q2 | Нужно ли push в ОБА remote для сдачи? | Минимум — SourceCraft. GitHub — желательно (Vercel deploys from `origin`). | Фаза 1.5 |
| Q3 | `revalidate = 30` на dashboard — не сломает ли мутации? | Нет — 12 server actions вызывают `safeRevalidate('/dashboard')` принудительно | Фаза 7.1 — проверить после изменения |
| Q4 | ISR + `searchParams` на списочных страницах — рост Data Cache? | На dev незаметно. На Vercel при активном поиске — каждая уникальная строка `?q=...&source=...` создаёт запись кэша. Neon быстрый, но следить за метриками | Без изменений; зафиксировано как D-8 |
| Q5 | Нужен ли swipe-to-close для Drawer? | Нет — Esc + backdrop + кнопка × достаточно | Без изменений |

> **Решённые вопросы (ранее открытые):**
> - ~~Скрывать ли `amount` на мобильном?~~ — **Нет.** `amount` — ключевое поле сделки, скрывать нельзя. Используем `overflow-x-auto`. (Фаза 4.4)
> - ~~Нужен ли `directUrl` в schema.prisma?~~ — **Уже настроено** (lines 9-12). Не трогать.

---

## 14. Допущения

| ID | Допущение | Что делать, если ломается |
|---|---|---|
| D-1 | Tailwind v4 поддерживает `sm:`/`md:`/`lg:` брейкпоинты из коробки (640/768/1024) | Если кастомные брейкпоинты нужны — добавить в `@theme` в globals.css |
| D-2 | `overflow-x-auto` достаточно для таблиц без сторонних библиотек (4–6 колонок). `/opportunities` — единственная с 6 колонками, где скрытие `company`/`contact` желательно для комфорта на 375 px. **Внутренний скролл таблицы** (`overflow-x-auto` как safety-net) на 375 px **допустим** — критерий не «вообще без скролла», а «нет page-level скролла». Бейдж стадии «Квалификация» (~100px) + amount «1 200 000 ₽» могут триггерить внутренний скролл даже после скрытия колонок — это норма. | Если таблицы станут шире (7+ колонок) — рассмотреть card-view на mobile |
| D-3 | Burger-меню через `useState` стабилен — `NavHeader.tsx` уже `'use client'` (line 1), SSR/`window` не используется в render. **Mounted gate НЕ нужен** (в отличие от `Drawer.tsx` который обращается к `document.body` через Portal) | Если hydration mismatch — проверить, что нет `window`/`document` в render-path |
| D-4 | `revalidate = 30` совместим с `safeRevalidate('/dashboard')` в server actions | Если ISR кэш не инвалидируется после мутации — вернуть `force-dynamic` или снизить `revalidate` до 0 |
| D-5 | `postinstall: prisma generate` не сломает локальный `npm install` | Если конфликт — `prisma generate \|\| true` |
| D-6 | Neon pooled connection уже работает (`schema.prisma` настроен, `.env.example` документирует 3 vars) | Если connection errors — проверить Vercel env vars (POSTGRES_PRISMA_URL с `?pgbouncer=true`) |
| D-7 | Lighthouse Accessibility ≥ 95 достижим (с учётом баг-фикса NavHeader + chart a11y) | Если < 95 — аудит контраста, ARIA, tabindex; зафиксировать как known limitation |
| D-8 | ISR + `searchParams` на списках: каждая уникальная строка запроса создаёт запись Data Cache. На Vercel это незаметно при умеренном использовании, но при активном поиске может расти | Если проблема — рассмотреть `export const dynamic = 'force-dynamic'` только для страниц с `q` параметром, или оставить (Neon быстрый). Зафиксировать как known limitation в TEST_REPORT |

---

*План post-MVP цикла, ревизия 2. Начать с Фазы 0 при подтверждении пользователя.*
