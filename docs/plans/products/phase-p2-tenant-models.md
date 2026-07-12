# Phase P2 — `TENANT_MODELS` += product/lineItem/productComponent · B

> Детальный план для фазы P2 из [`./products-plan-v2.md`](./products-plan-v2.md) §9.
> **Контекст для агента:** прочитай [`./products-architecture-v3.md`](./products-architecture-v3.md)
> §4, §9.1 и [`./products-implementation-v3.md`](./products-implementation-v3.md) §4.1. Фаза P1
> (миграция) уже `[x]`.

## 1. Что делаем

Регистрируем 3 новые модели в `TENANT_MODELS` (`src/lib/db.ts`), иначе `createTenantPrisma` не
будет их авто-фильтровать — скрытая пробоина в изоляции (arch §9.1: колонка `organizationId`
есть, контракт не работает). **Обязательно до P4/P5** (первого server action с новыми моделями).

## 2. Артефакты

В `src/lib/db.ts` обновить массив (одна строка + комментарий):

```ts
// ПРИ ДОБАВЛЕНИИ tenant-сущности в schema.prisma — обязательно добавить имя модели
// в `prisma.*`-нотации (camelCase) в этот массив, иначе createTenantPrisma не фильтрует её по
// organizationId и изоляция молча ломается (arch §9.1).
// ⚠ ВАЖНО: имена должны быть в camelCase, как свойство клиента prisma.X. Например, для моделей
// `Product` и `LineItem` и `ProductComponent` — это `product`, `lineItem`, `productComponent`
// (НЕ `lineitem`/`productcomponent`). Иначе ключи extension query не матчатся и хуки не
// срабатывают → `organizationId` не инжектится в create → ошибка типа «Argument `bundle` is
// missing» при создании бандла.
const TENANT_MODELS = [
  'lead', 'customer', 'contact', 'opportunity', 'activity', 'stage',
  'product', 'lineItem', 'productComponent',
] as const;
```

Остальное в `db.ts` (`prisma`-синглтон, `createTenantPrisma`, `AUTO_WHERE`) — без изменений.

## 3. Порядок

1. Открыть `src/lib/db.ts`, найти `TENANT_MODELS`.
2. Добавить три элемента + комментарий выше.
3. Сохранить.

## 4. Test-критерии

```bash
grep -n "productComponent" src/lib/db.ts     # найдено в TENANT_MODELS (camelCase!)
grep -n "'product'" src/lib/db.ts            # найдено
grep -n "'lineItem'" src/lib/db.ts           # найдено
npx tsc --noEmit                              # exit 0
npm run lint                                  # exit 0
```

Scoped smoke (опционально, до P4): убедиться, что `createTenantPrisma(orgA).product.findMany()`
возвращает только продукты orgA (после P7 seed — пусто у новой org). Без этой регистрации
вернёт продукты всех org — это и есть проверяемая пробоина.

## 5. Коммит

```bash
git add src/lib/db.ts
git commit -m "feat(db): TENANT_MODELS += product/lineItem/productComponent (изоляция новых моделей) — фаза P2"
```
После прохождения Test — отметить `[x]` в `products-plan-v2.md` §2 (P2).