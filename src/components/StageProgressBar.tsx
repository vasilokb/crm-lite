'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateOpportunityStage } from '@/lib/opportunities';
import type { Stage } from '@prisma/client';

type Props = {
  opportunityId: string;
  currentStageId: string;
  stages: Stage[];
  opportunityAmount: number | null;
  opportunityContactId: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  amount_required:       'Укажите сумму сделки',
  contact_required:      'Свяжите контакт со сделкой',
  reason_lost_required:  'Укажите причину отказа',
  opportunity_not_found: 'Сделка не найдена',
  stage_not_found:       'Стадия не найдена',
};

export function StageProgressBar({
  opportunityId,
  currentStageId,
  stages,
  opportunityAmount,
  opportunityContactId,
}: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reasonLost, setReasonLost] = useState('');
  const [showReasonLost, setShowReasonLost] = useState(false);
  const [targetLostId, setTargetLostId] = useState<string | null>(null);
  const router = useRouter();

  const currentIndex = Math.max(
    0,
    stages.findIndex((s) => s.id === currentStageId),
  );

  function describeError(code: string | undefined): string {
    if (!code) return 'Не удалось изменить стадию';
    return ERROR_MESSAGES[code] ?? 'Не удалось изменить стадию';
  }

  function handleStageClick(stage: Stage): void {
    if (stage.id === currentStageId) return;
    setError(null);

    // UX-проверки ДО вызова (сервер всё равно перепроверит — это превентивный UX).
    if (stage.name === 'won') {
      if (opportunityAmount === null || opportunityAmount === undefined) {
        setError('Сначала укажите сумму сделки');
        return;
      }
      if (!opportunityContactId) {
        setError('Сначала свяжите контакт со сделкой');
        return;
      }
    }

    if (stage.name === 'lost') {
      // Lost требует reasonLost — сначала показать форму.
      setTargetLostId(stage.id);
      setShowReasonLost(true);
      return;
    }

    submitStage(stage.id);
  }

  function submitStage(stageId: string, lostReason?: string): void {
    start(async () => {
      const result = await updateOpportunityStage(
        opportunityId,
        stageId,
        lostReason,
      );
      if (!result.ok) {
        if (result.message === 'reason_lost_required') {
          // Сервер попросил reasonLost — оставляем форму открытой.
          setShowReasonLost(true);
        }
        setError(describeError(result.message));
        return;
      }
      setShowReasonLost(false);
      setReasonLost('');
      setTargetLostId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1">
        {stages.map((stage, i) => {
          const isPast = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={stage.id} className="flex items-center">
              <button
                type="button"
                onClick={() => handleStageClick(stage)}
                disabled={pending}
                aria-current={isCurrent ? 'step' : undefined}
                className={[
                  'rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50',
                  isCurrent
                    ? 'bg-indigo-600 text-white'
                    : isPast
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300',
                ].join(' ')}
              >
                {stage.name}
              </button>
              {i < stages.length - 1 && (
                <div
                  className={[
                    'h-0.5 w-4 sm:w-6',
                    i < currentIndex ? 'bg-indigo-400' : 'bg-zinc-200 dark:bg-zinc-700',
                  ].join(' ')}
                />
              )}
            </div>
          );
        })}
      </div>

      {showReasonLost && (
        <div className="rounded border border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 p-3 space-y-2">
          <label className="block text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">
              Причина отказа <span className="text-rose-600">*</span>
            </span>
            <textarea
              value={reasonLost}
              onChange={(e) => setReasonLost(e.target.value)}
              required
              minLength={1}
              maxLength={500}
              placeholder="Например: бюджет сокращён в 3 раза"
              rows={2}
              className="mt-1 block w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowReasonLost(false);
                setReasonLost('');
                setTargetLostId(null);
              }}
              className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => targetLostId && submitStage(targetLostId, reasonLost)}
              disabled={pending || !reasonLost.trim()}
              aria-busy={pending}
              className="rounded bg-rose-600 dark:bg-rose-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 dark:hover:bg-rose-600 disabled:opacity-50"
            >
              {pending ? 'Сохранение…' : 'Подтвердить потерю'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}