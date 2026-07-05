'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { toggleActivityDone } from '@/lib/activities';

type Props = {
  id: string;
  done: boolean;
};

export function TaskCheckbox({ id, done }: Props) {
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
      setOptimisticDone(next);
      const result = await toggleActivityDone({ id, done: next });
      setPending(false);

      if (result.ok) {
        setServerDone(next);
      } else {
        // useOptimistic автоматически откатывается к serverDone,
        // потому что startTransition завершился с ошибкой сервера
        // (revalidate не выполнился).
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