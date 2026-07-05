import type { Activity } from '@prisma/client';
import { TaskCheckbox } from './TaskCheckbox';

type Props = {
  activities: Activity[];
};

function isOverdue(a: Activity, today: Date): boolean {
  if (a.type !== 'task') return false;
  if (a.done) return false;
  if (!a.dueDate) return false;
  return new Date(a.dueDate) < today;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(d: Date): string {
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActivityTimeline({ activities }: Props) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Активностей пока нет.
      </p>
    );
  }

  // Для подсветки просроченных сравниваем с локальной «полночью».
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
            ? 'border-zinc-300 bg-zinc-50/60 dark:border-zinc-700 dark:bg-zinc-900/40'
            : overdue
            ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
            : a.done
            ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
            : 'border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20',
        ].join(' ');

        return (
          <li key={a.id} className={containerClass}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center rounded-full bg-white/70 px-2 py-0.5 font-medium uppercase tracking-wide text-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
                    {isNote ? '✎ note' : '✓ task'}
                  </span>
                  {!isNote && a.dueDate && (
                    <span
                      className={[
                        'inline-flex items-center',
                        overdue
                          ? 'font-medium text-rose-700 dark:text-rose-300'
                          : 'text-zinc-500 dark:text-zinc-400',
                      ].join(' ')}
                    >
                      до {formatDate(new Date(a.dueDate))}
                      {overdue && ' • просрочено'}
                    </span>
                  )}
                </div>
                <p
                  className={[
                    'mt-1 whitespace-pre-wrap',
                    a.done && 'text-zinc-500 line-through dark:text-zinc-400',
                  ].filter(Boolean).join(' ')}
                >
                  {a.text}
                </p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  {formatDateTime(new Date(a.createdAt))}
                </p>
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