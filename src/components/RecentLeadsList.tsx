import Link from 'next/link';
import { Badge } from './Badge';

type Lead = {
  id: string;
  name: string;
  source: string;
  status: string;
  createdAt: Date;
};

export function RecentLeadsList({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Нет лидов</p>;
  }
  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {leads.map((l) => (
        <li key={l.id} className="py-2 first:pt-0 last:pb-0">
          <Link
            href={`/leads/${l.id}`}
            className="flex items-center justify-between gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded px-2 py-1 -mx-2"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{l.name}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(l.createdAt).toLocaleDateString('ru-RU')}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant={l.source as 'site' | 'email' | 'phone' | 'referral' | 'manual'}>{l.source}</Badge>
              <Badge variant={l.status as 'new' | 'processed' | 'converted'}>{l.status}</Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}