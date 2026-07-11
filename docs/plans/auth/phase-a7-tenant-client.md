# Phase A7 — Tenant-клиент `createTenantPrisma` + ESLint · B

> Детальный план для фазы A7 из [`auth-plan.md`](auth-plan.md) §9.
> **Контекст для агента:** прочитай [`../../auth-architecture-v4.md`](../../auth-architecture-v4.md) §6.2 + [`../../auth-implementation.md`](../../auth-implementation.md) §4.1, §5. Фаза A6 уже `[x]`.
> **Это ядро изоляции.** Двухуровневая стратегия: авто-фильтр для `findMany/findFirst/count/aggregate/groupBy/updateMany/deleteMany/create`; ручной контракт для single `update/delete` (find-first-then-update) и `upsert` (compound-unique where).

## 1. Что делаем

Добавить в `src/lib/db.ts` фабрику `createTenantPrisma(orgId)` (Prisma client extension) и helper `getTenantPrisma()` (читает orgId из сессии). Запретить сырой `prisma.*` в бизнес-коде ESLint-правилом.

## 2. Артефакты

**`src/lib/db.ts`** — дополнение (impl §4.1, полный код там же):
```ts
const TENANT_MODELS = ['lead','customer','contact','opportunity','activity','stage'] as const;
const AUTO_WHERE = new Set(['findMany','findFirst','count','aggregate','groupBy','updateMany','deleteMany']);

export function createTenantPrisma(orgId: string) {
  return prisma.$extends({
    name: 'tenant-scope',
    query: Object.fromEntries(TENANT_MODELS.map((model) => [model, {
      async $allOperations({ operation, args, query }: any) {
        if (operation === 'create') args.data = { ...args.data, organizationId: orgId };
        else if (operation === 'createMany') args.data = Array.isArray(args.data)
          ? args.data.map((d:any)=>({...d, organizationId: orgId}))
          : { ...args.data, organizationId: orgId };
        else if (operation === 'upsert') {           // where НЕ инжектится — compound-unique на вызывающем
          args.create = { ...args.create, organizationId: orgId };
          args.update = { ...args.update, organizationId: orgId };
        }
        else if (AUTO_WHERE.has(operation)) args.where = { ...args.where, organizationId: orgId };
        // update/delete (single): НЕ инжектятся → контракт: findFirst({id,organizationId}) → update({where:{id}})
        return query(args);
      },
    }])) as any,
  });
}
```
В `src/lib/auth/session.ts` добавить:
```ts
import { createTenantPrisma } from '@/lib/db';
export async function getTenantPrisma() {
  return createTenantPrisma(await getCurrentOrgId());
}
```

**`eslint.config.mjs`** — запрет сырого `prisma` вне `db.ts`/`auth` (flat config, готовый блок):
```js
import next from 'eslint-config-next';

export default [
  ...next.flatConfigs.coreWebVitals,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['src/lib/db.ts', 'src/lib/auth/**'],   // здесь сырой prisma разрешён
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: '@/lib/db',
          importNames: ['prisma'],
          message: "Импортируйте getTenantPrisma() из '@/lib/auth/session', не сырой prisma",
        }],
      }],
    },
  },
];
```

## 3. Порядок
A7 ДО A8 (server actions переходят на `getTenantPrisma()` именно здесь). ESLint-правило включается сейчас, но violations в существующих файлах чинятся в A8.

## 4. Test-критерии (scoped — whole-project `tsc`/`lint` восстановятся в A8)

- Smoke (tsx): создать 2 org + лиды в каждой; `createTenantPrisma(orgA).lead.findMany()` → только лиды orgA; `.lead.create({data:{name}})` → строка с `organizationId=orgA`.
- Scoped lint: временный файл `src/lib/__lint_probe.ts` с `import { prisma } from '@/lib/db'` → `npx eslint src/lib/__lint_probe.ts` → error; тот же импорт в `src/lib/db.ts`/`src/lib/auth/session.ts` → без ошибки.
- `npm run lint` на всём проекте — НЕ гейт здесь (существующие raw-prisma нарушения в `src/lib/*.ts` устраняются в A8).

## 5. Коммит
```bash
git add src/lib/db.ts src/lib/auth/session.ts eslint.config.mjs
git commit -m "feat(auth): tenant-aware Prisma client + ESLint-запрет сырого prisma — фаза A7"
```
После Test — `[x]` в `auth-plan.md` §2 (A7).
