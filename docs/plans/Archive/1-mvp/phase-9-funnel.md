# Phase 9 — Воронка сделок + правила won/lost · F+B

> Детальный план для фазы 9 из `../Plan.md` §10. Открывается агентом непосредственно перед фазой 9.
>
> **Контекст для агента (M15):** прочитай [`../../docs/final-mvp.md`](../../docs/final-mvp.md) §7.3 + `../Plan.md` §6.3, §6.5.

> **Определение «воронки сделок»** (по final-mvp §7.1): воронка = **ТАБЛИЦА сделок** на `/opportunities` с бейджем стадии у каждой записи + фильтр по `stage`. НЕ kanban-board, НЕ отдельный pipeline-view. Каждая сделка отображается строкой с бейджем стадии; смена стадии — через прогресс-бар в Drawer сделки (см. §3 ниже). Это явное решение зафиксировано в `Plan.md` §14 как A12.

## 1. Zod-схема перехода стадии

```ts
export const updateStageSchema = z.object({
  opportunityId: z.string().cuid(),
  newStageId:    z.string().cuid(),
  reasonLost:    z.string().trim().optional(),   // обязателен при переходе в lost
});

export type UpdateStageInput = z.infer<typeof updateStageSchema>;
```

## 2. Server action `updateOpportunityStage`

В `src/lib/opportunities.ts`:

```ts
import { revalidatePath } from 'next/cache';

export async function updateOpportunityStage(opportunityId: string, newStageId: string, reasonLost?: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const opp = await tx.opportunity.findUnique({
        where: { id: opportunityId },
        include: { stage: true },
      });
      if (!opp) return { ok: false as const, error: 'opportunity_not_found' };

      const newStage = await tx.stage.findUnique({ where: { id: newStageId } });
      if (!newStage) return { ok: false as const, error: 'stage_not_found' };

      // Правила won (final-mvp §7.3)
      if (newStage.name === 'won') {
        if (opp.amount == null) return { ok: false as const, error: 'amount_required' };
        if (opp.contactId == null) return { ok: false as const, error: 'contact_required' };
      }

      // Правила lost
      if (newStage.name === 'lost') {
        if (!reasonLost || reasonLost.trim() === '') {
          return { ok: false as const, error: 'reason_lost_required' };
        }
      }

      const newStatus: OpportunityStatus =
        newStage.name === 'won' ? 'won' :
        newStage.name === 'lost' ? 'lost' : 'open';

      const updated = await tx.opportunity.update({
        where: { id: opportunityId },
        data: {
          stageId: newStage.id,
          status: newStatus,
          reasonLost: newStage.name === 'lost' ? reasonLost?.trim() : null,
          closeDate: newStatus !== 'open' ? new Date() : null,
        },
      });

      revalidatePath('/opportunities');
      revalidatePath(`/opportunities/${opportunityId}`);
      revalidatePath('/dashboard');

      return { ok: true as const, opportunity: updated };
    });
  } catch (err) {
    return { ok: false as const, error: 'internal_error' };
  }
}
```

## 3. Прогресс-бар (`src/components/StageProgressBar.tsx`)

```tsx
'use client';
import { useTransition } from 'react';
import { updateOpportunityStage } from '@/lib/opportunities';
import type { Stage } from '@prisma/client';

type Props = {
  stages: Stage[];                  // все 5 стадий, отсортированные по position
  currentStageId: string;
  opportunityId: string;
  onError: (msg: string) => void;
};

export function StageProgressBar({ stages, currentStageId, opportunityId, onError }: Props) {
  const [pending, start] = useTransition();

  function handleClick(stageId: string, stageName: string) {
    if (stageId === currentStageId) return;
    start(async () => {
      const reason = stageName === 'lost' ? prompt('Причина отказа?') : undefined;
      const result = await updateOpportunityStage(opportunityId, stageId, reason);
      if (!result.ok) onError(messageFor(result.error));
    });
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {stages.map(s => (
        <button
          key={s.id}
          onClick={() => handleClick(s.id, s.name)}
          disabled={pending}
          aria-current={s.id === currentStageId ? 'step' : undefined}
          className={s.id === currentStageId ? 'active' : ''}
        >
          {s.name}
        </button>
      ))}
    </div>
  );
}

function messageFor(err: string): string {
  return {
    amount_required: 'Укажите сумму сделки (поле amount обязательно для won)',
    contact_required: 'Укажите контакт сделки',
    reason_lost_required: 'Укажите причину отказа (reasonLost)',
  }[err] ?? 'Не удалось сменить стадию';
}
```

## 4. Drawer сделки — reasonLost + revalidatePath

В `src/app/opportunities/[id]/page.tsx` поле `reasonLost` (textarea) видно всегда, обязательно для перехода в lost. После успеха `updateOpportunityStage` — Drawer показывает обновлённую стадию (через `revalidatePath` + server component re-render).

## 5. CreateOpportunityForm (`src/components/CreateOpportunityForm.tsx`)

```tsx
'use client';
import { useTransition } from 'react';
import { createOpportunity } from '@/lib/opportunities';

export function CreateOpportunityForm() {
  const [pending, start] = useTransition();
  return (
    <form action={(fd) => start(async () => { await createOpportunity(fd); })}>
      <input name="title" required minLength={1} maxLength={200} placeholder="Название сделки" />
      <input name="accountName" placeholder="Компания (создастся если новой)" />
      <input name="amount" type="number" step="0.01" min="0" placeholder="Сумма, ₽" />
      <button disabled={pending}>{pending ? 'Создание…' : 'Создать сделку'}</button>
    </form>
  );
}
```

## 6. Тест-критерии

### 6.1 Запрет won без amount
```bash
tsx -e "
import { updateOpportunityStage } from './src/lib/opportunities';
import { prisma } from './src/lib/db';
const opp = await prisma.opportunity.findFirst({ where: { status: 'open', amount: null } });
const won = await prisma.stage.findUnique({ where: { name: 'won' } });
const result = await updateOpportunityStage(opp.id, won.id);
console.log(result);
// Ожидание: { ok: false, error: 'amount_required' }
"
```

### 6.2 Запрет won без contact
Аналогично, но `opp.contactId == null` → `{ ok: false, error: 'contact_required' }`.

### 6.3 Запрет lost без reasonLost
```bash
tsx -e "
import { updateOpportunityStage } from './src/lib/opportunities';
import { prisma } from './src/lib/db';
const opp = await prisma.opportunity.findFirst({ where: { status: 'open' } });
const lost = await prisma.stage.findUnique({ where: { name: 'lost' } });
const result = await updateOpportunityStage(opp.id, lost.id);  // без reason
console.log(result);
// Ожидание: { ok: false, error: 'reason_lost_required' }
"
```

### 6.4 Консистентность стадии
Изменить стадию в Drawer → перейти на `/opportunities` → та же стадия (через `revalidatePath`).

## 7. Коммит после фазы

```bash
git add src/lib/opportunities.ts src/lib/validators.ts src/components/StageProgressBar.tsx src/components/CreateOpportunityForm.tsx
git commit -m "feat: воронка сделок с прогресс-баром + жёсткие правила won/lost + быстрое создание"
```