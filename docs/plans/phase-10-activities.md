# Phase 10 — Активности: timeline + Optimistic UI · F+B

> Детальный план для фазы 10 из `../Plan.md` §10. Открывается агентом непосредственно перед фазой 10.
>
> **Контекст для агента (M15):** прочитай [`../../docs/final-mvp.md`](../../docs/final-mvp.md) §7.4 + `../Plan.md` §6.4.

## 1. Zod-схема `toggleDoneSchema` (D3)

В `src/lib/validators.ts`:

```ts
export const toggleDoneSchema = z.object({
  id:   z.string().cuid(),
  done: z.boolean(),
});
export type ToggleDoneInput = z.infer<typeof toggleDoneSchema>;

export const createActivitySchema = z.object({
  opportunityId: z.string().cuid(),
  type:          z.enum(['note', 'task']),
  text:          z.string().trim().min(1).max(1000),
  dueDate:       z.string().datetime().optional(),
}).refine(
  (v) => v.type !== 'task' || !!v.dueDate,
  { message: 'dueDate обязателен для task', path: ['dueDate'] },
);
```

## 2. Server action `toggleActivityDone` (D4 — без route handler)

В `src/lib/activities.ts`:

```ts
import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import { toggleDoneSchema } from './validators';

export async function toggleActivityDone(rawInput: unknown) {
  const parsed = toggleDoneSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { id, done } = parsed.data;

  try {
    const activity = await prisma.activity.update({
      where: { id },
      data: { done },
      include: { opportunity: { select: { id: true } } },
    });

    revalidatePath(`/opportunities/${activity.opportunity.id}`);
    revalidatePath('/dashboard');

    return { ok: true as const, activity };
  } catch (err) {
    return { ok: false as const, error: 'update_failed' };
  }
}

export async function createActivity(rawInput: unknown) {
  const parsed = createActivitySchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const activity = await prisma.activity.create({
    data: {
      opportunityId: parsed.data.opportunityId,
      type:          parsed.data.type,
      text:          parsed.data.text,
      dueDate:       parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    },
  });
  revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
  revalidatePath('/dashboard');
  return { ok: true as const, activity };
}
```

## 3. Timeline (`src/components/ActivityTimeline.tsx`)

Server component (можно прямо в `[entity]/[id]/page.tsx`):

```tsx
import { prisma } from '@/lib/db';

export async function ActivityTimeline({ opportunityId }: { opportunityId: string }) {
  const activities = await prisma.activity.findMany({
    where: { opportunityId },
    orderBy: { createdAt: 'desc' },
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <ul>
      {activities.map(a => {
        const overdue = a.type === 'task' && !a.done && a.dueDate && a.dueDate < today;
        return (
          <li key={a.id} style={{ borderLeft: overdue ? '3px solid red' : undefined }}>
            <span aria-label={a.type === 'task' ? 'task' : 'note'}>{a.type === 'task' ? '✓' : '✎'}</span>
            <span style={{ textDecoration: a.done ? 'line-through' : undefined }}>{a.text}</span>
            {a.type === 'task' && <TaskCheckbox activityId={a.id} initialDone={a.done} />}
            {a.dueDate && <time dateTime={a.dueDate.toISOString()}>{a.dueDate.toLocaleDateString('ru-RU')}</time>}
          </li>
        );
      })}
    </ul>
  );
}
```

## 4. Optimistic UI `TaskCheckbox.tsx`

```tsx
'use client';
import { useOptimistic, useTransition, useState } from 'react';
import { toggleActivityDone } from '@/lib/activities';

type Props = { activityId: string; initialDone: boolean };

export function TaskCheckbox({ activityId, initialDone }: Props) {
  const [serverDone, setServerDone] = useState(initialDone);
  const [optimisticDone, setOptimisticDone] = useOptimistic(serverDone);
  const [, start] = useTransition();

  function handleToggle() {
    const next = !optimisticDone;
    setOptimisticDone(next);          // мгновенный апдейт
    start(async () => {
      const result = await toggleActivityDone({ id: activityId, done: next });
      if (result.ok) setServerDone(next);  // фиксация
      else {
        // откат — useOptimistic автоматически вернётся к serverDone
        // показать toast через callback или глобальный state
        alert('Не удалось завершить задачу, попробуйте позже');
      }
    });
  }

  return (
    <input type="checkbox" checked={optimisticDone} onChange={handleToggle} aria-label="Завершить задачу" />
  );
}
```

## 5. Форма добавления активности (`src/components/ActivityForm.tsx`)

```tsx
'use client';
import { useState, useTransition } from 'react';
import { createActivity } from '@/lib/activities';

export function ActivityForm({ opportunityId }: { opportunityId: string }) {
  const [type, setType] = useState<'note' | 'task'>('note');
  const [pending, start] = useTransition();

  return (
    <form action={(fd) => {
      start(async () => {
        await createActivity({
          opportunityId,
          type,
          text: String(fd.get('text') ?? ''),
          dueDate: type === 'task' ? String(fd.get('dueDate') ?? '') : undefined,
        });
      });
    }}>
      <select name="type" value={type} onChange={(e) => setType(e.target.value as 'note' | 'task')}>
        <option value="note">Заметка</option>
        <option value="task">Задача</option>
      </select>
      <input name="text" required minLength={1} maxLength={1000} placeholder="Текст" />
      {type === 'task' && <input name="dueDate" type="date" required />}
      <button disabled={pending}>{pending ? 'Сохранение…' : 'Добавить'}</button>
    </form>
  );
}
```

## 6. Тест-критерии (K20 — `curl` + JSON)

### 6.1 Zod-валидация на toggle
```bash
tsx -e "
import { toggleActivityDone } from './src/lib/activities';
const result = await toggleActivityDone({ id: 'x', done: 'yes' });
console.log(result);
// Ожидание: { ok: false, fieldErrors: { done: [...] } } — 400 эквивалент
"
```

### 6.2 Note без dueDate (OK)
```bash
tsx -e "
import { createActivity } from './src/lib/activities';
import { prisma } from './src/lib/db';
const opp = await prisma.opportunity.findFirst();
const result = await createActivity({
  opportunityId: opp.id,
  type: 'note',
  text: 'Test note',
});
console.log(result);
// Ожидание: { ok: true, activity: { id, type: 'note', dueDate: null, ... } }
"
```

### 6.3 Task без dueDate (400)
```bash
tsx -e "
import { createActivity } from './src/lib/activities';
import { prisma } from './src/lib/db';
const opp = await prisma.opportunity.findFirst();
const result = await createActivity({
  opportunityId: opp.id,
  type: 'task',
  text: 'Test task',
  // dueDate отсутствует
});
console.log(result);
// Ожидание: { ok: false, fieldErrors: { dueDate: ['dueDate обязателен для task'] } }
"
```

### 6.4 UI: оптимистичный апдейт + откат
В Drawer сделки: кликнуть чекбокс задачи → мгновенно ✓; проверить в БД `done = true`. Симулировать ошибку (например, удалить activity из БД перед toggle) → откат к предыдущему значению + alert/toast.

## 7. Коммит после фазы

```bash
git add src/lib/activities.ts src/lib/validators.ts src/components/ActivityTimeline.tsx src/components/ActivityForm.tsx src/components/TaskCheckbox.tsx
git commit -m "feat: timeline активностей, Optimistic UI для done с откатом при ошибке (D3/D4)"
```