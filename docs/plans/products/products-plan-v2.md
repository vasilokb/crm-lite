# CRM-lite: Продукты, бандлы и скидка — Plan — Code — Test (v2)

> Это **v2** главного плана. v1 (`products-plan.md`) залочен (rename падает с EPERM) и к тому
> морально устарел (содержал inline-CRUD состава). v2 синхронен с `products-architecture-v3.md`
> и `products-implementation-v3.md` (режим B, единая форма состава).
>
> **Мини-план заведён для КАЖДОЙ фазы P1–P10** (см. §9) — детализация (код/SQL/Test-команды)
> живёт в `phase-p*.md`, главный план держит только маршрут.
>
> **Расширение MVP** поверх готового CRM. Каталог продуктов (`Product`), позиции сделки со
> снапшотом цены (`LineItem`), составные продукты-бандлы (`ProductComponent`), скидка на
> уровне сделки (`Opportunity.discount`).
> **Активные источники контракта:**
> - [`products-architecture-v3.md`](./products-architecture-v3.md) — архитектура (ЧТО/ПОЧЕМУ).
> - [`products-implementation-v3.md`](./products-implementation-v3.md) — реализация (КАК: целевой `schema.prisma`, SQL, код, UI-контракт).
> - [`../../../Plan.md`](../../../Plan.md) §6 — бизнес-правила CRM (won/lost, convert lead — НЕ пересобираем).
> Цель: превратить решения архитектуры в исполнимые фазы по слоям **D** (database) / **B** (backend) / **F** (frontend) с Test-критериями и мини-планами.

---

## 1. Что делаем

Превращаем «плоскую» сумму сделки в детализированную спецификацию: каталог товаров/услуг
организации, позиции сделки с **зафиксированной ценой на момент продажи** (снапшот
`unitPrice`), составные продукты (бандлы) и абсолютную скидку на уровне сделки. Сумма сделки
(`Opportunity.amount`) становится «итого к оплате» = `Subtotal − discount` в гибридном режиме
(авто при наличии позиций, ручной — без). Подробно — в архитектуре v3 (§2–§7), реализация — в
`products-implementation-v3.md` (§2–§8).

**Зафиксированные решения (из v3):** каталог + позиция со снапшотом · бандл через
`ProductComponent` (self-ref M:N) · снапшотится только цена бандла · `isBundle` вычисляемое
(`_count.components > 0`) · ~~цена бандла ручная + Σ-референс~~ **→ B5-ревизия: цена бандла = авто-Σ на сервере, ручного поля в UI нет** · количество `Int` (без units) ·
режим B (состав через `createProduct`/`updateProduct`, единая форма) · гибридный `amount` ·
абсолютная скидка `Float?` (не процент) · скидка только в авто-режиме · tenant-изоляция через
`TENANT_MODELS` += `product/lineItem/productComponent` (**camelCase** для составных имён) · `Float` для денег (паттерн кодбейза).

---

## 2. Активное состояние

Обновляется после каждого шага. После закрытия всех фаз — в архив.

| Фаза | Слой | Статус | Закрыта | Комментарий |
|---|---|---|---|---|
| P1. Миграция: новые таблицы + `Opportunity.discount` | D | [x] | 2026-07-12 | миграция `20260712120546_add_product_lineitem_bundle_discount` применена; validate=0, migrate status clean; 3 таблицы + колонка Opportunity.discount + LineItem.updatedAt |
| P2. `TENANT_MODELS` += product/lineitem/productcomponent | B | [x] | 2026-07-12 | TENANT_MODELS += product/lineitem/productcomponent; tsc+lint 0; изоляция будет проверена в P4/P10 ⚠ фикс TENANT_MODELS: lineitem→lineItem, productcomponent→productComponent (camelCase для составных имён extension query) |
| P3. Validators (Zod-схемы) | B | [x] | 2026-07-12 | 5 Zod-схем + 4 type-экспорта; refine без v.data-бага; tsc+lint 0; smoke 5/5 ok + ревизия B5: price.optional + superRefine (price обязателен только для простого) |
| P4. `products.ts`: каталог + состав (режим B) | B | [x] | 2026-07-12 | products.ts создан; каталог + состав в createProduct/updateProduct (режим B); assertNoCycleForBundle; aggregateComponents; tsc+lint 0 + ревизия B5: bundlePrice = Σ компонентов на сервере (из формы price игнорируется для бандла) |
| P5. `lineItems.ts`: позиции + скидка | B | [x] | 2026-07-12 | lineItems.ts создан; addLineItem/updateLineItem/removeLineItem + updateDiscount + recalcAndApplyAmount; edge-case обнуления amount+discount; снапшот unitPrice=product.price; tsc+lint 0 |
| P6. `opportunities.ts` правки | B | [x] | 2026-07-12 | getOpportunity include lineItems + updateOpportunity гибрид (игнор amount+discount в авто-режиме); tsc+lint 0; won-rule и convertLead не тронуты |
| P7. Seed (`stages.ts`) | D+B | [x] | 2026-07-12 | seed: 4 продукта + 1 бандл + 3 ProductComponent + 2 LineItem на o1 + discount=20000; контрольная сумма o1.amount=1_290_000; tsc+lint 0; db:reset ok, счётчики сошлись, идемпотентность подтверждена + ревизия B5: bundle.price=1_190_000 (Σ), o1.amount=1_290_000 + перенос products-демо в prisma/seed.ts |
| P8. Каталог UI (`/products`, ProductForm, ProductCard) | F | [x] | 2026-07-12 | каталог UI: /products + @modal Drawer + единая ProductForm (toggle/Σ/поиск со скрытием self+добавленных) + ProductCard + NavHeader; tsc+lint+build 0 + фикс отображения компонентов в форме (name/price в state, Σ всегда при components.length>0) + ревизия B5: поле «Базовая цена» скрыто для бандла, блок «Цена бандла (расчётная)» наверху формы |
| P9. Сделка UI (OpportunityLineItems, OpportunityCard, OpportunityForm) | F | [x] | 2026-07-12 | Сделка UI: OpportunityLineItems (inline-CRUD + Subtotal/Discount/Total) + OpportunityCard секция + OpportunityForm гибрид (amount readonly в авто, discount скрыт); tsc+lint+build 0; UI 8/8 |
| P10. Приёмка | F+B+D | [x] | 2026-07-12 | приёмка пройдена, чек-лист 21/21 ✅; README + architecture.md обновлены; lint+build 0; см. docs/plans/products/TEST_REPORT.md |

**Правило:** после Test-критерия — `[x]`; если не прошло — `⚠ <дата>: <что не прошло>` и
корректировка следующих шагов. Не переходить к следующей фазе, пока текущая не `[x]`.

> **Окна сломанной сборки НЕТ.** Это чистое добавление: каждая фаза добавляет независимый
> кусок (схема → actions → UI), существующий код не ломается. `tsc --noEmit` + `npm run lint`
> — гейт на каждой фазе (в отличие от auth A2→A8). Исключение: P2 (`TENANT_MODELS`) обязательно
> **до** первого запуска server action с новыми моделями (P4/P5) — иначе тихая утечка tenant
> (arch §9.1), но сборка при этом зелёная.

---

## 3. Границы (что НЕ входит — из arch v3 §12)

- **Без UI-удаления продуктов** (`Plan.md` §6.6 — без кнопки «Удалить»).
- **`Float` для денег** (паттерн кодбейза); `Decimal` — future (arch §11).
- **Скидка — только абсолютная**, только на уровне сделки, только в авто-режиме. Процент,
  наценка, промокоды — future.
- **Бандл в сделке = одна позиция**; состав не разворачивается, цены компонентов не
  снапшотятся (справочно по текущим ценам). Счёт-со-спецификацией — future.
- **Состав бандла — только через `createProduct`/`updateProduct`** (режим B). Inline-CRUD
  состава — future.
- **`sku` без unique**; `isBundle` не хранится (вычисляемое); количество `Int` (без units).
- **Не трогать** бизнес-правила CRM из `Plan.md` §6 (convert lead, won/lost, optimistic UI) и
  `convertLead.ts`, `updateOpportunityStage`, `StageProgressBar`.

---

## 4. Слои и файлы (кратко — детально в `products-implementation-v3.md` §7)

**D:** `prisma/schema.prisma`, `prisma/migrations/...`, `prisma/seed.ts` (через `stages.ts`).
**B:** `src/lib/db.ts` (`TENANT_MODELS`), `src/lib/validators.ts`, `src/lib/products.ts`
(новый), `src/lib/lineItems.ts` (новый), `src/lib/opportunities.ts` (правка), `src/lib/stages.ts`
(seed).
**F:** `src/app/products/{page,[id]/page}.tsx`, `src/app/@modal/(.)products/[id]/page.tsx`,
`src/components/{ProductForm,CreateProductForm,ProductCard,OpportunityLineItems}.tsx`,
`src/components/{OpportunityCard,OpportunityForm,NavHeader}.tsx` (правка).

---

## 5. Стек и решения (из arch v3 §2–§5)

- Prisma 6.19.3 (без `@prisma/adapter-pg`/`prisma.config.ts` — инвариант проекта).
- Tenant: `createTenantPrisma(orgId)` (готов из auth); новые модели регистрируются в
  `TENANT_MODELS` (P2). `products.ts`/`lineItems.ts` — только `getTenantPrisma`.
- Id-lookups → `findFirst`; single `update`/`delete` → find-first-then-mutate; `upsert` →
  compound-unique (`organizationId_name`, `organizationId_bundleId_componentId`).
- Мутации `LineItem`/`discount` — в одной `$transaction` + `recalcAndApplyAmount` (tx наследует
  tenant-extension, как `convertLead.ts`).
- Снапшот `unitPrice = product.price` фиксируется в `addLineItem` (и в seed — явно).
- Деньги — `Float` (погрешность приемлема для учебного CRM; `Math.max(0,…)` + валидация).
- Новых зависимостей нет. Без realtime (README §1.2).

---

## 6. Контракт фичи (из arch v3 §2–§6)

- **Гибридный `amount`:** ≥1 `LineItem` → `amount = Subtotal − discount` (readonly в форме,
  пересчёт в `$transaction`); 0 `LineItem` → ручной `amount`, `discount = null` (поле скрыто).
- **Edge-case (удаление последней позиции):** `recalcAndApplyAmount` ставит `amount = null,
  discount = null` (возврат в ручной режим). Исключает «всплывающую» скидку.
- **Скидка:** `updateDiscount` — отдельный action; валидация `0 ≤ discount ≤ Subtotal` (отказ
  `discount_exceeds_subtotal`, не silent clamp); только в авто-режиме.
- **`updateOpportunity` в авто-режиме игнорирует `amount` и `discount`** из формы (единственные
  пути — `recalcAndApplyAmount` и `updateDiscount`; иначе рассинхрон).
- **Бандл (режим B):** `createProduct`/`updateProduct` принимают `components: [{componentId,
  quantity}]` и в одной `$transaction` создают/замещают весь состав. `updateProduct`:
  `deleteMany` старого состава → `create` нового. `components: undefined` = не трогать состав;
  массив (вкл. `[]`) = замещение.
- **Запрет циклов:** `assertNoCycleForBundle` (self + транзитивный) перед созданием состава;
  `aggregateComponents` — дедупликация qty по `componentId` (страховка от P2002).
- **Изоляция:** все три новые модели в `TENANT_MODELS`; чужой `componentId` в `createProduct`
  → `component_not_found`.

---

## 7. Окружение

**Новые deps:** нет.
**Скрипты:** `db:migrate` (`prisma migrate dev`); `db:reset` (`prisma migrate reset --force &&
npm run db:seed`) — **только после подтверждения пользователя** (`Plan.md` §7.2).
**`.env`:** без изменений; ИИ не читает.

---

## 8. Контекстные правила для ИИ-агента

> Прочитай `../../../README.md`, этот `products-plan-v2.md`,
> [`./products-architecture-v3.md`](./products-architecture-v3.md) (контракт решений),
> [`./products-implementation-v3.md`](./products-implementation-v3.md) (целевая схема/SQL/код/UI).
> Найди активную фазу в §2, открой её мини-план из §9. **Бизнес-правила CRM (`Plan.md` §6) не
> пересобирай** — только добавляй фичу продуктов. **Стек-инварианты:** Prisma 6.19.3 без
> adapter-pg/config.ts; без realtime; деньги `Float`. **Не читай `.env`**. **Не выполняй
> `db:reset`** без подтверждения. После шага — `[x]` в §2, опиши изменения.

**Чек-лист после каждого шага:** Test-критерий из мини-плана фазы → прошёл `[x]` / не прошёл
`⚠` → не переходить дальше без `[x]`. Гейт `tsc --noEmit` + `npm run lint` — на каждой фазе
(сборка зелёная всегда, чистое добавление).
**Новый чат** при засорении контекста (после ~3–4 фаз) — передать README + этот план +
`products-implementation-v3.md` + мини-план активной фазы.

---

## 9. Сводный план

> Слой: **D** = database, **B** = backend, **F** = frontend. Test-тип: **DB** = схема/данные;
> **smoke** = scoped проверка кода; **build** = whole-project `tsc`+`lint`; **UI** = ручная
> проверка экрана. **Мини-план заведён для каждой фазы.**

| № | Фаза | Слой | Артефакты | Test-критерий | Контекст | Мини-план |
|---|---|---|---|---|---|---|
| P1 | Миграция: новые таблицы + discount | D | `Product`, `LineItem` (с `updatedAt`), `ProductComponent`, `Opportunity.discount`, relations | **DB**: `migrate dev` без ошибок; studio видит 3 таблицы + колонку; нет DROP на существующих | arch §5, impl §2, §3 | [`phase-p1-migration.md`](./phase-p1-migration.md) |
| P2 | `TENANT_MODELS` += 3 модели | B | `src/lib/db.ts` (1 строка + комментарий) | **smoke**: в `db.ts` есть `'product','lineitem','productcomponent'`; tsc+lint 0 | arch §4, impl §4.1 | [`phase-p2-tenant-models.md`](./phase-p2-tenant-models.md) |
| P3 | Validators | B | `src/lib/validators.ts` +5 схем | **build**: `tsc --noEmit` exit 0; smoke: refine пропускает {qty}, режет {} | arch §2.1/§3/§6.3, impl §4.2 | [`phase-p3-validators.md`](./phase-p3-validators.md) |
| P4 | `products.ts`: каталог + состав | B | `src/lib/products.ts` (createProduct/updateProduct + assertNoCycleForBundle + aggregateComponents + CRUD + searchProducts) | **build+smoke**: tsc+lint 0; createProduct с components → Product+ProductComponent в одной tx; цикл → CYCLE_COMPONENT; дубли qty → агрегация | arch §2/§2.1/§6.3, impl §4.3 | [`phase-p4-products-actions.md`](./phase-p4-products-actions.md) |
| P5 | `lineItems.ts`: позиции + скидка | B | `src/lib/lineItems.ts` (add/update/remove + updateDiscount + recalcAndApplyAmount) | **build+smoke**: tsc+lint 0; addLineItem снапшотит unitPrice, пересчитывает amount; removeLineItem последней → amount=null, discount=null; updateDiscount > Subtotal → discount_exceeds_subtotal | arch §3/§6.1/§6.2, impl §4.4 | [`phase-p5-lineitems-discount.md`](./phase-p5-lineitems-discount.md) |
| P6 | `opportunities.ts` правки | B | `getOpportunity` include + `updateOpportunity` гибрид | **build**: tsc+lint 0; авто-режим игнорирует amount+discount из формы | arch §3/§6.2, impl §4.5 | [`phase-p6-opportunities-patch.md`](./phase-p6-opportunities-patch.md) |
| P7 | Seed | D+B | `src/lib/stages.ts` (демо-продукты + бандл + позиции на o1 + discount) | **DB**: `db:reset` → 4 продукта, 3 ProductComponent, 2 LineItem на o1, **`o1.amount=1_100_000`** | arch §8, impl §4.6 | [`phase-p7-seed.md`](./phase-p7-seed.md) |
| P8 | Каталог UI | F | `/products` + `@modal/(.)products/[id]` + ProductForm (единая форма) + CreateProductForm + ProductCard + NavHeader | **UI**: список 4; создать/редактировать через Drawer; toggle «Бандл» + состав + Σ-референс; в поиске скрыт текущий товар и добавленные компоненты | arch §2.1/§6.3, impl §7.1–7.2 | [`phase-p8-products-ui.md`](./phase-p8-products-ui.md) |
| P9 | Сделка UI | F | OpportunityLineItems + OpportunityCard секция + OpportunityForm гибрид | **UI**: o1 — 2 позиции, Subtotal/Discount/Total, amount readonly; inline onBlur → пересчёт; удалить все → amount nullable, discount скрыт | arch §3/§6.2, impl §7.2–7.3 | [`phase-p9-opportunity-lineitems-ui.md`](./phase-p9-opportunity-lineitems-ui.md) |
| P10 | Приёмка | F+B+D | `TEST_REPORT` (products), `README`/`architecture.md` (раздел продуктов) | **build+UI**: изоляция 2 org; снапшот цены; гибрид+won; convertLead не сломан; lint+build чисто (чек-лист 21 пункт) | impl §8 | [`phase-p10-acceptance.md`](./phase-p10-acceptance.md) |

---

## 10. Решение по мини-планам

**Принцип (Plan–Code–Test + `Plan.md` M14):** главный план держит только маршрут (одна строка
на фазу в §9); детализация — точный код, SQL, Zod-сигнатуры, пошаговые действия, Test-команды,
коммит — уходит в мини-план фазы. **Мини-план заведён для каждой из 10 фаз** (P1–P10), включая
тривиальные (P1 авто-миграция, P2 одна строка, P3 Zod, P6 правка 2 функций, P7 seed, P10
чек-лист) — для единообразия и чтобы агенту всегда было куда смотреть без возврата к
`implementation-v3.md`.

**Шаблон каждого мини-плана** (`phase-pN-*.md`, по образцу auth `phase-a2-*.md`):
1. Заголовок фазы + слой + ссылка на этот план.
2. Контекст для агента (какие § arch/impl читать) + статус предыдущих фаз.
3. Что делаем (кратко).
4. Артефакты (готовый код/SQL со ссылкой на impl §X — не дублируется).
5. Порядок действий.
6. Test-критерии с исполняемыми командами (`tsc`, `lint`, `db:reset`, scoped smoke).
7. Коммит после фазы.

**Порядок выполнения фаз (зависимости):** P1 → **P2** (обязательно до P4/P5) → P3 →
(P4, P5, P6 — последовательно) → P7 → (P8, P9 — последовательно) → P10. Окна сломанной сборки
нет; `tsc`+`lint` — гейт на каждой фазе.

---

## 11. Трассировка: архитектура/реализация → фазы

| arch v3 / impl v3 | Фаза(ы) этого плана |
|---|---|
| arch §5 модель / impl §2 схема | P1 |
| arch §4 tenant-изоляция / impl §4.1 | P2 |
| arch §2.1/§3/§6.3 контракты / impl §4.2 | P3 |
| arch §2/§2.1/§6.3 каталог+бандл / impl §4.3 | P4 |
| arch §3/§6.1/§6.2 позиции+скидка / impl §4.4 | P5 |
| arch §3/§6.2 гибрид amount / impl §4.5 | P6 |
| arch §8 Стадия 4 / impl §4.6 | P7 |
| arch §2.1/§6.3 + UI / impl §7.1–7.2 | P8 |
| arch §3/§6.2 + UI / impl §7.2–7.3 | P9 |
| impl §8 критерии | P10 |
| arch §11 рост / §12 ограничения | (перспектива, не в этом плане) |

Архитектура v3 = ЧТО/ПОЧЕМУ; `products-implementation-v3.md` = КАК; этот план = МАРШРУТ по
фазам с мини-планами.
