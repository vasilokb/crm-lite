import Link from 'next/link';

type Task = {
  id: string;
  text: string;
  dueDate: Date | null;
  opportunity: { id: string; title: string } | null;
};

function formatDue(d: Date | null): string {
  if (!d) return '';
  const date = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ms = today.getTime() - date.getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days < 5) return `${days} дн. назад`;
  return date.toLocaleDateString('ru-RU');
}

export function OverdueTasksList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-emerald-600 dark:text-emerald-400">
        Просроченных задач нет
      </p>
    );
  }
  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {tasks.map((t) => (
        <li key={t.id} className="py-2 first:pt-0 last:pb-0">
          {t.opportunity ? (
            <Link
              href={`/opportunities/${t.opportunity.id}`}
              className="block min-h-[44px] rounded px-2 py-1 -mx-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-l-2 border-rose-400"
            >
              <div className="text-sm text-zinc-900 dark:text-zinc-50">{t.text}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 mt-0.5">
                <span className="text-rose-600 dark:text-rose-400 font-medium">
                  просрочено {formatDue(t.dueDate)}
                </span>
                <span>·</span>
                <span className="truncate">{t.opportunity.title}</span>
              </div>
            </Link>
          ) : (
            <div className="rounded px-2 py-1 -mx-2 border-l-2 border-rose-400">
              <div className="text-sm text-zinc-900 dark:text-zinc-50">{t.text}</div>
              <div className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                просрочено {formatDue(t.dueDate)}
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}