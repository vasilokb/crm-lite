import { Badge } from './Badge';
import { DrawerCloseButton } from './DrawerCloseButton';

export function DrawerHeader({
  entity,
  title,
  status,
  source,
  stage,
}: {
  entity: 'lead' | 'account' | 'contact' | 'opportunity';
  title: string;
  status?: string;
  source?: string;
  stage?: string;
}) {
  const labels = {
    lead:        'Лид',
    account:     'Компания',
    contact:     'Контакт',
    opportunity: 'Сделка',
  } as const;

  return (
    <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {labels[entity]}
        </span>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {status && (
            <Badge variant={status as never}>{status}</Badge>
          )}
          {source && (
            <Badge variant={source as never}>{source}</Badge>
          )}
          {stage && (
            <Badge variant={stage as never}>{stage}</Badge>
          )}
        </div>
      </div>
      <DrawerCloseButton />
    </header>
  );
}