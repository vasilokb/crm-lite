'use client';

import { useState, useTransition } from 'react';
import { createActivity } from '@/lib/activities';

type Props = {
  opportunityId: string;
};

type ActivityType = 'note' | 'task';

export function ActivityForm({ opportunityId }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ActivityType>('note');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);

  function reset(): void {
    setError(null);
    setFieldErrors(null);
  }

  function close(): void {
    setOpen(false);
    reset();
  }

  async function handleSubmit(formData: FormData): Promise<void> {
    reset();
    const dueDateRaw = formData.get('dueDate');
    const dueDate =
      type === 'task' && dueDateRaw && typeof dueDateRaw === 'string' && dueDateRaw.length > 0
        ? new Date(dueDateRaw + 'T12:00:00').toISOString()
        : undefined;

    const input = {
      opportunityId,
      type,
      text: String(formData.get('text') ?? ''),
      ...(dueDate ? { dueDate } : {}),
    };

    start(async () => {
      const result = await createActivity(input);
      if (!result.ok) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        } else {
          setError('Не удалось добавить активность');
        }
        return;
      }
      // Сбрасываем форму: при следующем открытии — пустая
      close();
    });
  }

  if (!open) {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setType('note');
            setOpen(true);
          }}
          className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          + note
        </button>
        <button
          type="button"
          onClick={() => {
            setType('task');
            setOpen(true);
          }}
          className="rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
        >
          + task
        </button>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
      <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Новая активность
          </h3>
          <div className="flex rounded border border-zinc-300 dark:border-zinc-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setType('note')}
              className={[
                'px-2.5 py-1 text-xs',
                type === 'note'
                  ? 'bg-zinc-700 text-white'
                  : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300',
              ].join(' ')}
            >
              Заметка
            </button>
            <button
              type="button"
              onClick={() => setType('task')}
              className={[
                'px-2.5 py-1 text-xs',
                type === 'task'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-300',
              ].join(' ')}
            >
              Задача
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Закрыть"
          className="rounded p-1 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <span className="block w-6 h-6 leading-6 text-center text-lg">×</span>
        </button>
      </header>

      <form action={handleSubmit} className="flex flex-col gap-3 px-4 py-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">
            Текст <span className="text-rose-600">*</span>
          </span>
          <textarea
            name="text"
            required
            minLength={1}
            maxLength={1000}
            rows={3}
            placeholder={type === 'note' ? 'Текст заметки' : 'Что нужно сделать?'}
            aria-invalid={Boolean(fieldErrors?.text)}
            className={`rounded border px-3 py-2 outline-none focus:ring-1 ${
              fieldErrors?.text
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
            } bg-white dark:bg-zinc-950`}
          />
          {fieldErrors?.text?.map((e, i) => (
            <p key={i} className="text-xs text-rose-600 dark:text-rose-400">{e}</p>
          ))}
        </label>

        {type === 'task' && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">
              Срок <span className="text-rose-600">*</span>
            </span>
            <input
              type="date"
              name="dueDate"
              required
              defaultValue={today}
              aria-invalid={Boolean(fieldErrors?.dueDate)}
              className={`rounded border px-3 py-2 outline-none focus:ring-1 ${
                fieldErrors?.dueDate
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                  : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
              } bg-white dark:bg-zinc-950`}
            />
            {fieldErrors?.dueDate?.map((e, i) => (
              <p key={i} className="text-xs text-rose-600 dark:text-rose-400">{e}</p>
            ))}
          </label>
        )}

        {error && (
          <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="rounded bg-emerald-600 dark:bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50"
          >
            {pending ? 'Добавление…' : 'Добавить'}
          </button>
        </div>
      </form>
    </div>
  );
}