# Phase 12 — Упаковка к сдаче · F+B+D

> Детальный план для фазы 12 из `../Plan.md` §10. Открывается агентом непосредственно перед фазой 12.
>
> **Контекст для агента (M15):** прочитай [`docs/home-work.md`](../docs/home-work.md) §9 (требования к упаковке и E2E) + `../Plan.md` §11.

## 0. Цель

Финализация CRM-lite к сдаче: `README.md` (финальный), `TEST_REPORT.md` (граничные кейсы с командами и ожидаемым выводом), `Plan.md` (все 12 фаз `[x]`), проверка `npx prisma migrate status` (clean) и `npm run build` (exit 0). Полный E2E из `home-work.md` §9 пройден UI-проверкой.

## 1. Шаблон `TEST_REPORT.md` (K20 — граничные кейсы)

`TEST_REPORT.md` в корне проекта. Содержит **5 граничных кейсов** + полный E2E-сценарий из `home-work.md` §9.

### 1.1 Граничный кейс: невалидный ввод convert lead (D14)
```bash
tsx -e "
import { convertLead } from './src/lib/convertLead';
const r = await convertLead('any', { accountName: '', contactName: 'X', createOpportunity: false });
console.log(r);
"
# Ожидание: { ok: false, fieldErrors: { accountName: ['String must contain at least 1 character(s)'] } }
# Транзакция НЕ открывается.
```

### 1.2 Граничный кейс: race на P2002 (D14)
```bash
tsx -e "
import { convertLead } from './src/lib/convertLead';
import { prisma } from './src/lib/db';
const lead = await prisma.lead.findFirst({ where: { status: 'new' } });
if (!lead) throw new Error('нет лида со status=new — выполни npm run db:reset');
const input = { accountName: 'Race Test ' + Date.now(), contactName: 'X', createOpportunity: true, opportunityTitle: 'Race' };
const results = await Promise.all([convertLead(lead.id, input), convertLead(lead.id, input)]);
console.log(results);
"
# Ожидание: [
#   { ok: true, accountId, contactId, opportunityId },
#   { ok: false, error: 'lead_already_converted' }    ← через P2002 в catch
# ]
```

### 1.3 Граничный кейс: won без amount → 400 (§6.3)
```bash
tsx -e "
import { updateOpportunityStage } from './src/lib/opportunities';
import { prisma } from './src/lib/db';
// Создаём временную Opportunity без amount и contact для теста (в seed все 4 open-сделки имеют amount)
const opp = await prisma.opportunity.create({
  data: {
    title: 'TEST: won-without-amount',
    amount: null,
    contactId: null,
    accountId: null,
    stageId: (await prisma.stage.findUnique({ where: { name: 'qualification' } }))!.id,
    status: 'open',
  }
});
const won = await prisma.stage.findUnique({ where: { name: 'won' } });
const r = await updateOpportunityStage(opp.id, won!.id);
console.log(r);
// Очистка
await prisma.opportunity.delete({ where: { id: opp.id } });
"
# Ожидание: { ok: false, error: 'amount_required' }
```

### 1.4 Граничный кейс: toggle-done без Zod-валидации (D3)
```bash
tsx -e "
import { toggleActivityDone } from './src/lib/activities';
// используем валидный cuid (любой существующий id Activity из seed)
const { prisma } = await import('./src/lib/db');
const act = await prisma.activity.findFirst({ where: { type: 'task' } });
if (!act) throw new Error('нет task в seed');
// передаём невалидный done='yes' (string вместо boolean)
const r = await toggleActivityDone({ id: act.id, done: 'yes' as any });
console.log(r);
"
# Ожидание: { ok: false, fieldErrors: { done: ['Expected boolean, received string'] } }
# (а НЕ fieldErrors.id, НЕ 500)
```

### 1.5 Граничный кейс: stagesChart всегда 5 столбцов (D5)
```bash
tsx -e "
import { getDashboardData } from './src/lib/dashboard';
const d = await getDashboardData();
console.log(d.stagesChart);
console.assert(d.stagesChart.labels.length === 5);
console.assert(d.stagesChart.values.length === 5);
"
# Ожидание: { labels: ['qualification','proposal','negotiation','won','lost'], values: [...] }
# Даже если стадия 'lost' без сделок → values[4] === 0 (не undefined).
```

### 1.6 Граничный кейс: openOpportunitiesAmount не null при 0 открытых (D6)
```bash
tsx -e "
import { getDashboardData } from './src/lib/dashboard';
import { prisma } from './src/lib/db';

// Сохраняем исходные статусы
const original = await prisma.opportunity.findMany({
  where: { status: 'open' },
  select: { id: true, status: true, stageId: true }
});

// Переводим все open в won (через stageId = won)
const won = await prisma.stage.findUnique({ where: { name: 'won' } });
await prisma.opportunity.updateMany({
  where: { id: { in: original.map(o => o.id) } },
  data: { status: 'won', stageId: won!.id, closeDate: new Date() }
});

// Проверяем D6: при 0 открытых сделок amount = 0 (НЕ null)
const d = await getDashboardData();
console.log({
  openOpportunitiesCount: d.kpis.openOpportunitiesCount,
  openOpportunitiesAmount: d.kpis.openOpportunitiesAmount,
  type: typeof d.kpis.openOpportunitiesAmount
});

// Откат
for (const o of original) {
  await prisma.opportunity.update({
    where: { id: o.id },
    data: { status: o.status, stageId: o.stageId, closeDate: null }
  });
}
"
# Ожидание:
# { openOpportunitiesCount: 0, openOpportunitiesAmount: 0, type: 'number' }
# (а НЕ null, НЕ undefined — D6 гарантирует ?? 0)
# После отката seed-данные возвращаются в исходное состояние (4 open, 1 won, 1 lost).
```

## 2. Полный E2E-сценарий из `home-work.md` §9

`TEST_REPORT.md` фиксирует последовательность из 13 шагов **с фактическим выводом каждого шага** (после прогона):

```
Шаг 1: npm install
   → exit 0, добавлены 478 пакетов

Шаг 2: npm run db:migrate
   → "Database schema is up to date"

Шаг 3: npm run db:seed
   → exit 0, "Seed: 5 stages, 4 accounts, 5 contacts, 6 leads, 6 opportunities, 8 activities"

Шаг 4: npm run dev
   → "▲ Next.js 15.x"   "▲ Local: http://localhost:3000"   "✓ Ready in 2.3s"

Шаг 5: открыть /dashboard
   → 4 KPI: leadsTotal=6, openOpportunitiesCount=4, openOpportunitiesAmount=6_200_000, overdueTasksCount=2
   → 2 диаграммы Chart.js рендерятся (stagesChart 5 столбцов, leadsChart 3 категории)

Шаг 6: /leads → клик лида «Дмитрий Козлов»
   → URL /leads/<id>, Drawer overlay поверх списка (intercepted)

Шаг 7: Convert lead → Accordion → заполнить → submit
   → Drawer header показывает бейдж "Converted", 3 ссылки: Account «ООО «Гамма»», Contact «Дмитрий Козлов», Opportunity «Стенд «Гамма-Авто 2026»»

Шаг 8: клик Opportunity → Drawer сделки
   → URL /opportunities/<id>, Drawer сделки (НЕ второй Drawer поверх — замена через @modal slot)

Шаг 9: добавить note
   → ActivityTimeline пополнилась, бейдж "✎ note" виден

Шаг 10: добавить task на сегодня → отметить done
   → Optimistic UI: мгновенно ✓, через ~50ms фиксация, в БД done=true

Шаг 11: toggle off
   → Optimistic UI: мгновенно снято, в БД done=false

Шаг 12: кликнуть won без amount
   → toast "Укажите сумму сделки" (или красная подсветка reasonLost если перепутать стадию)

Шаг 13: вернуться на /dashboard
   → KPI overdueTasksCount=2 (2 исходные YESTERDAY-задачи из seed остаются просроченными и не были изменены; новая TODAY-задача из шага 10 НЕ входит в overdue, т.к. dueDate=TODAY, а фильтр overdue = dueDate < today)
   → leadsTotal=6 (convert только меняет статус существующего лида на 'converted', не создаёт нового). Dashboard обновился через revalidatePath
```

## 2.5 Процесс баг-фиксов с перепроверкой (home-work.md фаза 9)

Если во время E2E (§2) или граничных кейсов (§1) найден баг:

1. **Зафиксировать баг** в `TEST_REPORT.md` отдельной строкой: `[BUG] <описание> | <шаги воспроизведения> | <ожидание> | <факт>`.
2. **Исправить** в коде (server action, Zod-схема, Drawer-компонент, и т.д.).
3. **Повторно прогнать E2Е-шаги**, которые могли быть задеты (правило home-work.md фаза 9):
   - **если баг в convert lead** → перепроверить карточки Lead, Contact, Account, Opportunity, Dashboard;
   - **если баг в stage-transition** → перепроверить Drawer сделки, `/opportunities`, Dashboard (`stagesChart`);
   - **если баг в `toggleActivityDone`** → перепроверить Drawer сделки, Dashboard (`overdueTasksCount`);
   - **если баг в Zod-валидации** → перепроверить все формы этой сущности (create + update actions).
4. **В `TEST_REPORT.md`** отметить `[FIXED] <баг> → перепроверено: <список>`.
5. **Фаза 12 не закрывается**, пока есть открытые `[BUG]` без `[FIXED]`.

## 3. Чек-лист README.md (12.1)

`README.md` должен содержать:

- [ ] **О проекте** (легенда агентства выставочных стендов)
- [ ] **Стек:** Next.js + Prisma 6.19.3 + PostgreSQL + Zod + Chart.js
- [ ] **Маршруты:** `/dashboard`, `/leads`, `/accounts`, `/contacts`, `/opportunities`, `/[entity]/[id]` (Drawer)
- [ ] **Как запустить** (macOS / Windows):
  ```bash
  cp .env.example .env       # указать реальный DATABASE_URL
  npm install
  npm run db:migrate
  npm run db:seed
  npm run dev
  ```
- [ ] **Бизнес-правила** (ссылка на `../Plan.md` §6)
- [ ] **OUT-of-MVP** (ссылка на `../Plan.md` §3)
- [ ] **Известные ограничения** (роли, удаление, realtime, mobile — нет)
- [ ] **Безопасное изменение схемы:** `npm run db:migrate` создаёт новую миграцию; откат через новую миграцию с revert, **НЕ** через `db:reset` без подтверждения
- [ ] **Версии** (зафиксированы точно)

## 4. Проверка состояния БД и production-сборки (12.4, 12.5)

```bash
# 12.4 — состояние миграций
npx prisma migrate status
# Ожидание: "Database schema is up to date" — exit 0

# 12.5 — TypeScript + production build
npx tsc --noEmit && npm run build
# Ожидание: exit 0; ".next/" создан
```

## 5. Чистый пакет (12.6)

```bash
# Убедиться, что в репозиторий НЕ попали:
ls node_modules .next 2>/dev/null && echo "❌ мусор в корне" || echo "✅ чисто"

# .gitignore должен содержать:
grep -E "^\.env$|^\.env\.local$|^node_modules/$|^\.next/$" .gitignore
# Ожидание: все 4 строки найдены

# 5.2 Нет лишних экспериментов в коде (home-work.md фаза 9, критерий 8)
grep -rE "Experimental|TODO|FIXME|XXX" src/ 2>/dev/null
# Ожидание: пусто (или только в комментариях с пояснениями)
```

## 6. Финализация `Plan.md` (12.7)

В `home-work/Plan.md` §2 все 12 фаз получают `[x]`. В §13 закрыты ответы на открытые вопросы. В §14 зафиксированы реальные допущения. В `TEST_REPORT.md` есть строка `[DELIVERED] канал=…, дата=…, ссылка=…` (см. §7).

## 7. Коммит после фазы и фиксация в канале сдачи (home-work.md фаза 9, критерий 10)

```bash
# Локальный коммит
git add README.md TEST_REPORT.md Plan.md
git commit -m "docs: README + TEST_REPORT + Plan.md финализированы, E2E пройден"

# ФИКСАЦИЯ В КАНАЛЕ СДАЧИ
# Выбрать ОДИН из вариантов в зависимости от курса:
#
# Вариант A — SourceCraft:
#   1. Открыть курс в SourceCraft.
#   2. Загрузить проект как zip (БЕЗ node_modules/.next/.env) или запушить
#      в прицепленный к курсу git-репозиторий.
#   3. Проверить, что файлы видны ревьюеру: README.md в корне архива,
#      prisma/migrations/ присутствуют, .env ОТСУТСТВУЕТ.
#
# Вариант B — публичный репозиторий (GitHub/GitLab):
#   git remote add origin <url>
#   git push -u origin main
#   Убедиться, что .gitignore исключает .env (проверить через
#   git ls-files | grep -E "^\.env$" → пусто).
#
# Вариант C — другой канал курса:
#   Следовать инструкции курса.
#
# В TEST_REPORT.md добавить строку:
# "[DELIVERED] канал=<SourceCraft|GitHub|other>, дата=<YYYY-MM-DD>, ссылка=<url>"
```