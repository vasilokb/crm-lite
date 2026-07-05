# Phase 10 — Активности: timeline + Optimistic UI · F+B

> Детальный план для фазы 10 из `../Plan.md` §10. Открывается агентом непосредственно перед фазой 10.
>
> **Контекст для агента (M15):** прочитай [`../../docs/final-mvp.md`](../../docs/final-mvp.md) §7.4 + `../Plan.md` §6.4.

## 0. Отличия от первоначальной версии плана

Эта версия плана обновлена после фактической реализации. Изменения относительно исходного текста:

1. **ID-формат (A15):** `toggleDoneSchema.id` и `createActivitySchema.opportunityId` принимают как cuid, так и slug-id (`seed-opp-*`, `seed-lead-*` и т.д.). Используется `z.string().regex(/^[a-z0-9-]+$/).min(1).max(50)` вместо `z.string().cuid()`. Seed фазы 4 использует slug-id для детерминизма; новые записи через UI получают cuid через `@default(cuid())` в `schema.prisma`.
2. **TaskCheckbox с `useState(serverDone)`** + `useOptimistic(serverDone)`: state `serverDone` хранит подтверждённое значение; `useOptimistic` даёт мгновенный апдейт, откат при ошибке (React автоматически откатывает `useOptimistic` к `serverDone` когда `useTransition` завершается без revalidate).
3. **ActivityTimeline** с `border-l-4` Tailwind классами вместо inline `style={{ borderLeft }}`; с явными лейблами **«✎ note»** / **«✓ task»** (вместо одной иконки `✓`/`✎`).
4. **ActivityForm с toggle note/task** (кнопки «+ note» / «+ task» открывают форму) вместо `<select>` типа.
5. **Drawer через React Portal** в `document.body` — обязательно, иначе `<div>` Drawer нельзя вложить в `<tr>` таблицы (hydration error). Drawer-обёртка используется с фазы 7.
6. **RowWithDrawer-паттерн** (фазы 7–10): intercepted-routes Next.js 16 нестабильны в dev, поэтому таблицы используют client-side state (`<tr onClick={() => setOpen(true)}>` + `e.preventDefault()` на `<Link>`). URL не меняется при открытии Drawer — таблица остаётся видимой. Direct URL `/<entity>/<id>` через `app/<entity>/[id]/page.tsx` + `CardOverlayWrapper` (для refresh/share-link).
7. **CardOverlayWrapper** для full-page версий: серверная страница `<entity>/[id]/page.tsx` оборачивает контент в Drawer через client `CardOverlayWrapper`, который открывается сразу и закрывается через `router.push(listPath)`. Не использует parallel routes / `@modal` slot.
8. **toggleActivityDone** возвращает `{ ok: true, data: activity }` где `activity` — это полный Activity (с `opportunityId`); server action `revalidatePath` через `safeRevalidate` (без ошибок в smoke-тестах вне Next runtime).

## 1. Zod-схема `toggleDoneSchema` (D3, A15)

В `src/lib/validators.ts`:

```ts
export const toggleDoneSchema = z.object({
  id:   id,  // helper: z.string().regex(/^[a-z0-9-]+$/).min(1).max(50)
  done: z.boolean(),
});
export type ToggleDoneInput = z.infer<typeof toggleDoneSchema>;

export const createActivitySchema = z.object({
  opportunityId: id,
  type:          z.enum(['note', 'task']),
  text:          z.string().trim().min(1).max(1000),
  dueDate:       z.string().datetime().optional(),
}).superRefine((v, ctx) => {
  if (v.type === 'task' && !v.dueDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dueDate'],
      message: 'dueDate обязателен для task',
    });
  }
});
```

Хелпер `id` определён в начале файла как `const id = z.string().regex(/^[a-z0-9-]+$/).min(1).max(50);` — это позволяет избежать `z.string().cuid()`, который отвергает slug-id из seed (Plan.md §14 A15).

## 2. Server action `toggleActivityDone` (D4 — без route handler)

В `src/lib/activities.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import { safeRevalidate } from './revalidate';
import { toggleDoneSchema } from './validators';

export async function toggleActivityDone(
  input: ToggleDoneInput
): Promise<Result<Activity>> {
  const parsed = toggleDoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  const activity = await prisma.activity.update({
    where: { id: parsed.data.id },
    data:  { done: parsed.data.done },
    include: { opportunity: { select: { id: true } } },
  });
  if (activity.opportunity) {
    safeRevalidate(`/opportunities/${activity.opportunity.id}`);
  }
  safeRevalidate('/dashboard');
  return { ok: true, data: activity };
}

export async function createActivity(input: ActivityInput): Promise<Result<Activity>> {
  // ... (Zod-валидация, prisma.activity.create, revalidatePath)
}
```

`safeRevalidate` (helper из фазы 5) глушит ошибку `static generation store missing` при вызове вне Next runtime (smoke-тесты), иначе пробрасывает. Это позволяет запускать `npx tsx` для тестов без `revalidatePath`-исключения.

## 3. Timeline (`src/components/ActivityTimeline.tsx`)

Server component (можно прямо в `OpportunityCard`):

```tsx
import type { Activity } from '@prisma/client';
import { TaskCheckbox } from './TaskCheckbox';

type Props = {
  activities: Activity[];  // отсортированы по createdAt desc (из getOpportunity include)
};

function isOverdue(a: Activity, today: Date): boolean {
  if (a.type !== 'task') return false;
  if (a.done) return false;
  if (!a.dueDate) return false;
  return new Date(a.dueDate) < today;
}

export function ActivityTimeline({ activities }: Props) {
  if (activities.length === 0) {
    return <p>Активностей пока нет.</p>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <ul className="space-y-2">
      {activities.map((a) => {
        const overdue = isOverdue(a, today);
        const isNote = a.type === 'note';

        const containerClass = [
          'rounded border-l-4 pl-3 pr-3 py-2 text-sm',
          isNote
            ? 'border-zinc-300 bg-zinc-50/60'
            : overdue
            ? 'border-rose-500 bg-rose-50'
            : a.done
            ? 'border-emerald-400 bg-emerald-50/40'
            : 'border-indigo-400 bg-indigo-50/40',
        ].join(' ');

        return (
          <li key={a.id} className={containerClass}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-white/70 px-2 py-0.5 font-medium uppercase">
                    {isNote ? '✎ note' : '✓ task'}
                  </span>
                  {!isNote && a.dueDate && (
                    <span className={overdue ? 'font-medium text-rose-700' : 'text-zinc-500'}>
                      до {formatDate(new Date(a.dueDate))}
                      {overdue && ' • просрочено'}
                    </span>
                  )}
                </div>
                <p className={['mt-1 whitespace-pre-wrap', a.done && 'line-through text-zinc-500'].filter(Boolean).join(' ')}>
                  {a.text}
                </p>
                <p className="mt-1 text-xs text-zinc-400">{formatDateTime(new Date(a.createdAt))}</p>
              </div>
              {!isNote && (
                <div className="flex-shrink-0 pt-0.5">
                  <TaskCheckbox id={a.id} done={a.done} />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

**Цветовая схема `border-l-4`:**
- `note` (любой): `border-zinc-300` (нейтральный серый)
- `task` overdue: `border-rose-500` (красный), `bg-rose-50`
- `task` done: `border-emerald-400` (зелёный), `bg-emerald-50/40`
- `task` активный: `border-indigo-400` (синий), `bg-indigo-50/40`

## 4. Optimistic UI `TaskCheckbox.tsx`

```tsx
'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { toggleActivityDone } from '@/lib/activities';

type Props = {
  id: string;
  done: boolean;
};

export function TaskCheckbox({ id, done }: Props) {
  // serverDone — подтверждённое значение с сервера.
  // optimisticDone — мгновенный апдейт, откатывается к serverDone
  // при ошибке useTransition.
  const [serverDone, setServerDone] = useState(done);
  const [optimisticDone, setOptimisticDone] = useOptimistic<boolean, boolean>(
    serverDone,
    (_state, newValue) => newValue,
  );
  const [, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleToggle(): void {
    const next = !optimisticDone;
    setError(null);

    start(async () => {
      setPending(true);
      setOptimisticDone(next);  // мгновенный апдейт (до server action)
      const result = await toggleActivityDone({ id, done: next });
      setPending(false);

      if (result.ok) {
        setServerDone(next);  // фиксация
      } else {
        // useOptimistic автоматически откатывается к serverDone
        setError('Не удалось завершить задачу, попробуйте позже');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={optimisticDone}
        onChange={handleToggle}
        disabled={pending}
        aria-busy={pending}
        aria-label="Завершить задачу"
        className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-indigo-600 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800"
      />
      {pending && (
        <span className="text-xs text-zinc-400" aria-live="polite">
          Сохранение…
        </span>
      )}
      {error && (
        <span role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </span>
      )}
    </div>
  );
}
```

**Отличия от исходного плана:**
- `useState(serverDone)` хранит подтверждённое значение; обновляется на успех server action.
- `useOptimistic(serverDone, (_state, newValue) => newValue)` — reducer явно возвращает `newValue` (identity).
- `pending` state + `aria-busy` + «Сохранение…» индикатор (UX улучшение).
- inline-ошибка `<span role="alert">` вместо `alert()` (более UX-friendly, не блокирует).

## 5. Форма добавления активности (`src/components/ActivityForm.tsx`)

```tsx
'use client';

import { useState, useTransition } from 'react';
import { createActivity } from '@/lib/activities';

type Props = {
  opportunityId: string;
};

export function ActivityForm({ opportunityId }: Props) {
  const [open, setOpen] = useState(false);  // закрытая vs открытая форма
  const [type, setType] = useState<'note' | 'task'>('note');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

  // Кнопки «+ note» / «+ task» (см. реальный код — с toggle-переключателем
  // типа и полями для note или task+dueDate).
  // При task без dueDate Zod возвращает fieldErrors.dueDate.
  ...
}
```

**UX детали:**
- Две кнопки «+ note» / «+ task» в закрытом виде (открывают форму)
- В открытом виде — кнопка-переключатель «Заметка» / «Задача» (стили: `bg-zinc-700` для note, `bg-indigo-600` для task)
- Поле `text` (textarea, required)
- Для `type === 'task'`: поле `dueDate` (date input, required, defaultValue = today)
- Кнопки «Отмена» / «Создать» / «Создание…» (pending)
- При ошибке Zod — `fieldErrors.dueDate` под полем dueDate

## 6. Drawer через React Portal (важно)

`<Drawer>` из фазы 7 ОБЯЗАТЕЛЬНО рендерится через `createPortal(content, document.body)`, иначе **hydration error**: `<div> cannot be a child of <tbody>` (Drawer внутри `<tr>` строки таблицы).

```tsx
// src/components/Drawer.tsx (ключевая часть)
const [mounted, setMounted] = useState(false);
useEffect(() => { setMounted(true); }, []);
if (!mounted) return null;  // SSR + first client render — null
return createPortal(
  <div className="fixed inset-0 z-50 flex">...</div>,
  document.body
);
```

Причина: `<tr><Drawer/></tr>` — invalid HTML (только `<td>`/`<th>` могут быть детьми `<tr>`). Portal обходит это, рендерит Drawer в `document.body`.

## 7. RowWithDrawer-паттерн (фазы 7–10)

`src/components/{Lead,Account,Contact,Opportunity}RowWithDrawer.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Drawer } from './Drawer';
import { DrawerHeader } from './DrawerHeader';
// ... форма

export function LeadRowWithDrawer({ lead, accounts, contacts }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="cursor-pointer hover:bg-zinc-50"
        onClick={() => setOpen(true)}
      >
        <td>
          <Link
            href={`/leads/${lead.id}`}
            onClick={(e) => { e.preventDefault(); setOpen(true); }}
          >
            {lead.name}
          </Link>
        </td>
        ...
      </tr>
      {open && (
        <Drawer onClose={() => setOpen(false)}>
          <DrawerHeader entity="lead" title={lead.name} ... />
          <LeadForm lead={lead} accounts={accounts} contacts={contacts} />
          <ConvertLeadAccordion ... />
        </Drawer>
      )}
    </>
  );
}
```

`<Link onClick={e.preventDefault()}>` — блокирует Next.js navigation, не меняет URL. `<tr onClick={...}>` — открывает Drawer. **URL остаётся `/leads`** → таблица остаётся видимой под Drawer overlay.

## 8. CardOverlayWrapper для direct URL (`/<entity>/<id>`)

`src/components/CardOverlayWrapper.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Drawer } from './Drawer';

export function CardOverlayWrapper({ children, listPath }: { children: ReactNode; listPath: string }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  function close(): void {
    setOpen(false);
    setTimeout(() => { router.push(listPath); }, 0);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent): void { if (e.key === 'Escape') close(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;
  return <Drawer onClose={close}>{children}</Drawer>;
}
```

Используется в `app/<entity>/[id]/page.tsx` — для refresh/share-link. Закрытие = `router.push(listPath)` → возврат на список.

## 9. Тест-критерии (K20 — `curl` + JSON + ручная проверка UI)

### 9.1 Zod-валидация на toggle (D3, A15)
```bash
npx tsx -e "
import { toggleActivityDone } from './src/lib/activities';
async function m() {
  const r = await toggleActivityDone({ id: 'cmtest00000000000000000aaa', done: 'yes' as any });
  console.log(JSON.stringify(r, null, 2));
  // Ожидание: { ok: false, fieldErrors: { done: ['Expected boolean, received string'] } }
}
m();
"
```

### 9.2 Zod-валидация на createActivity (Task без dueDate)
```bash
npx tsx -e "
import { createActivity } from './src/lib/activities';
import { prisma } from './src/lib/db';
async function m() {
  const opp = await prisma.opportunity.create({ data: { title: 'TEST', stageId: (await prisma.stage.findUnique({ where: { name: 'qualification' } }))!.id, status: 'open' } });
  const r = await createActivity({ opportunityId: opp.id, type: 'task', text: 'no dueDate' });
  console.log('without dueDate:', JSON.stringify(r.ok ? 'ok' : r.fieldErrors));
  await prisma.opportunity.delete({ where: { id: opp.id } });
  await prisma.\$disconnect();
}
m();
"
```
Ожидание: `without dueDate: { dueDate: ['dueDate обязателен для task'] }`

### 9.3 Note без dueDate (OK)
```bash
npx tsx -e "
import { createActivity } from './src/lib/activities';
import { prisma } from './src/lib/db';
async function m() {
  const opp = await prisma.opportunity.create({ data: { title: 'TEST', stageId: (await prisma.stage.findUnique({ where: { name: 'qualification' } }))!.id, status: 'open' } });
  const r = await createActivity({ opportunityId: opp.id, type: 'note', text: 'Test note' });
  console.log('note ok:', JSON.stringify(r.ok ? { id: r.data.id, type: r.data.type, dueDate: r.data.dueDate } : r));
  await prisma.activity.deleteMany({ where: { opportunityId: opp.id } });
  await prisma.opportunity.delete({ where: { id: opp.id } });
  await prisma.\$disconnect();
}
m();
"
```

### 9.4 UI: оптимистичный апдейт + откат при ошибке
1. `/opportunities/<id>` → Drawer → секция «Активности» с timeline
2. Клик по чекбоксу task → мгновенно ✓ + «Сохранение…»
3. Через ~50мс — «Сохранение…» исчезает, в БД `done=true`
4. Симулировать ошибку: в DevTools → Network → Offline → клик чекбокс → галочка появляется мгновенно, потом откат + «Не удалось завершить задачу, попробуйте позже»

### 9.5 Просроченные task подсвечены
- Note: серая левая граница
- Task активный: синяя граница
- Task done: зелёная граница + line-through
- Task overdue: **красная** граница + «до 01.07.2026 • просрочено»

## 10. Известные нюансы

- **Кодировка файлов:** Windows-CP1252 vs UTF-8. Файлы кириллицей сохранять в UTF-8 (write-tool делает это корректно; `Out-File -Encoding utf8` без BOM повреждает байты).
- **Drawer и hydration:** при изменении Drawer в Next.js dev возможны warning'и о mismatched class names; это нормально, продакшн-сборка чище.
- **React Portal + серверный Drawer:** Server Components не могут рендерить Portal. Если нужен Drawer в server component — оборачивать в client `CardOverlayWrapper`.

## 11. Коммит после фазы

```bash
git add src/lib/activities.ts src/lib/validators.ts \
        src/components/ActivityTimeline.tsx src/components/ActivityForm.tsx src/components/TaskCheckbox.tsx \
        src/components/Drawer.tsx src/components/DrawerHeader.tsx \
        src/components/LeadRowWithDrawer.tsx src/components/AccountRowWithDrawer.tsx \
        src/components/ContactRowWithDrawer.tsx src/components/OpportunityRowWithDrawer.tsx \
        src/components/CardOverlayWrapper.tsx \
        src/app/{leads,accounts,contacts,opportunities}/page.tsx
git commit -m "feat(phase 7-10): Drawer, RowWithDrawer pattern, Optimistic UI timeline (D3/D4 + A15)"
```
