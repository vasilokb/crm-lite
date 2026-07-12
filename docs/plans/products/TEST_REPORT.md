# Products Feature — Test Report (P10 приёмка)

> **Дата:** 2026-07-12
> **Версия:** `products-plan-v2.md` v3 (с учётом B5-ревизии, фикса TENANT_MODELS camelCase, переноса seed в `prisma/seed.ts`, UX-фикса redirect в `session.ts`)
> **Окружение:** `db:reset` выполнен, dev на http://localhost:3001

## Сводка

| Категория | ✅ | ❌ | Комментарий |
|---|---|---|---|
| Сборка | 4 | 0 | tsc / lint / build / migrate status |
| Изоляция | 2 | 0 | 2-я org пуста; cross-org компонент → component_not_found |
| Каталог `/products` | 2 | 0 | список 4, Drawer корректный |
| Бандлы (режим B) | 3 | 0 | toggle/Σ, edit, защита циклов |
| Сделка с позициями | 7 | 0 | о1 «Гамма-Авто»: 2 позиции, Subtotal/Discount/Total, гибрид, edge-case |
| Снапшот + гибрид | 2 | 0 | unitPrice не меняется при правке Product.price; convertLead + won не сломаны |
| Совместимость с CRM | 2 | 0 | convertLead + won rule (verify по коду) |
| **Итого** | **21** | **0** | **PASS** |

## Детальные результаты

### Сборка
- [x] 1. `npx tsc --noEmit` → exit 0
- [x] 2. `npm run lint` → 0 errors (19 pre-existing warnings)
- [x] 3. `npx next build` → ✓ Compiled successfully in 3.4s
- [x] 4. `npx prisma migrate status` → Database schema is up to date! (6 migrations)

### Изоляция (критично после фикса TENANT_MODELS)
- [x] 5. 2-я org (test-org-2) — `/products` ПУСТО (0 продуктов против 4 в org A). `getProducts` фильтрует по `organizationId` через `createTenantPrisma`.
- [x] 6. Server-защита: `createProduct` в org A с `componentId` продукта org B → `findMany({where: {id, organizationId: orgA}})` НЕ находит productB → `component_not_found`.

### Каталог /products
- [x] 7. Логин owner@demo.agency → `/products` — 4 строки: Дизайн-проект (Простое, 150 000 ₽), Комплекс «Под ключ» (Бандл, **1 190 000 ₽** = Σ компонентов), Монтаж оборудования (Простое, 120 000 ₽), Стенд «Стандарт» (Простое, 800 000 ₽). Поиск + пагинация. НЕТ кнопки удаления.
- [x] 8. Клик по бандлу → Drawer (intercepting route): read-only состав (3 компонента), «Используется в сделках: 1», «Σ компонентов: 1 190 000 ₽» (справочно).

### Бандлы (B5-revised + режим B)
- [x] 9. [+ Новый продукт] → toggle «Бандл» → поле «Базовая цена» СКРЫТО; блок «Цена бандла (расчётная): Σ ₽» реактивно обновляется; Сохранить → `Product.price = Σ` (вычислено в `$transaction` на сервере). Поиск скрывает self + добавленные компоненты.
- [x] 10. [Редактировать] → форма с предзаполненным составом; правка qty/компонентов → Сохранить → `productComponent.deleteMany({bundleId})` + создание новых (replace-семантика).
- [x] 11. Защита циклов: `assertNoCycleForBundle` — SELF_COMPONENT + транзитивный CYCLE_COMPONENT (обход вверх через `parents(componentId).bundleId` до `bundleId` создаваемого бандла). Проверено: создание `bundleA↔bundleB` цикла → CYCLE_COMPONENT triggered.

### Сделка «Стенд «Гамма-Авто 2026»» (создана seed.ts)
- [x] 12. Секция «Товары в сделке (2)» между «Связи» и «Активности»: бандл «Комплекс «Под ключ»» (бейдж БАНДЛ, qty=1, unitPrice=1 190 000) + Монтаж (qty=1, unitPrice=120 000). Бандл = ОДНА строка (состав не разворачивается).
- [x] 13. Footer: Subtotal=1 310 000 ₽ (= 1 190 000 + 120 000), Скидка=20 000, **ИТОГО=1 290 000 ₽** (= Subtotal − discount).
- [x] 14. `OpportunityForm` гибрид (auto-режим): `<input name="amount" readOnly value="1290000">` + хинт «Сумма рассчитывается из позиций»; поля `discount` в форме НЕТ.
- [x] 15. Inline-правка qty/unitPrice в `OpportunityLineItems` → onBlur → `updateLineItem` → `router.refresh()` → recalc. `LineItem.updatedAt` обновляется автоматически (`@updatedAt`).
- [x] 16. `[+ Добавить товар]` → инпут + `searchProducts(q)` → выбор → `addLineItem({opportunityId, productId, quantity:1})` → новая строка, пересчёт.
- [x] 17. Скидка > Subtotal → onBlur → `updateDiscount` → сервер бросает `'discount_exceeds_subtotal'` → UI: красная подсветка `border-rose-400` + сообщение.
- [x] 18. Удаление всех позиций (🗑 по каждой) → `recalcAndApplyAmount` при `items.length === 0` → `opportunity.update({amount: null, discount: null})`. Edge-case: вход в ручной режим обнуляет ОБА поля.

### Снапшот и гибрид
- [x] 19. Снапшот `unitPrice`: `Product.price` 120 000 → 200 000, существующий `LineItem.unitPrice` остался 120 000 (новая позиция того же продукта берёт свежий 200 000). Проверено через прямой `prisma` вызов, имитирующий `updateProduct` + `addLineItem`.
- [x] 20. Won rule: `updateOpportunityStage` НЕ затронут в P1-P9 (только `getOpportunity` + `updateOpportunity` в P6). Проверено `grep` по коду.
- [x] 21. `convertLead` (P2.2 convert lead): `Opportunity.create({amount: input.opportunityAmount ?? null})`, `discount` не передаётся (default null). Сделка без позиций, ручной amount — контракт Plan §6.2 сохранён.

## Сделанные исправления в ходе P1-P9

| Коммит | Что исправлено |
|---|---|
| `1aa630e` | TENANT_MODELS camelCase (lineitem→lineItem, productcomponent→productComponent) — иначе хуки extension query не матчатся, organizationId не инжектится в `lineItem`/`productComponent` |
| `1aa630e` | B5-ревизия: цена бандла = авто-Σ на сервере (из формы не вводится); в UI поле «Базовая цена» скрыто для бандла, блок «Цена бандла (расчётная)» |
| `1aa630e` | Перенос products-демо в `prisma/seed.ts` (раньше был только в `seedDemoData` → не отрабатывал при `db:reset`) |
| `ea3a3d2` | Email-fallback в `getCurrentOrgId` для устаревших JWT-cookie после `db:reset` |
| `bcc3748` | UX-фикс: `throw` в `getCurrentUser`/`getCurrentOrgId` → `redirect('/login')` (больше нет 500 + NO_ACTIVE_ORG stack-trace) |

## Документация (обновлено в P10)

- `README.md` §1.3 — добавлен `/products` (+ full-page fallback `/products/[id]`).
- `README.md` §1.5 — раздел «Каталог продуктов и гибрид amount/discount» (B5-Σ, режим B, снапшот unitPrice, TENANT_MODELS, ссылка на architecture-v3).
- `docs/architecture/architecture.md` §2 — Web Client + Next.js Application описания включают `/products` и products-логику.
- `docs/architecture/architecture.md` §5 — добавлены `Product`, `LineItem`, `ProductComponent`; per-tenant unique constraints.

## Заключение

**P1-P10 — feature done.** 21/21 пунктов чек-листа пройдены. Бизнес-правила CRM (Plan §6) сохранены. Tenant-изоляция работает. Build / lint / migrate status — зелёные.