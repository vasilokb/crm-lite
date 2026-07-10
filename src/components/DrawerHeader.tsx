import { Badge } from './Badge';
import { DrawerCloseButton } from './DrawerCloseButton';

type StatusKind = 'leadStatus' | 'oppStatus';

export function DrawerHeader({
  entity,
  title,
  status,
  statusKind,
  source,
  stage,
}: {
  entity: 'lead' | 'customer' | 'contact' | 'opportunity';
  title: string;
  status?: string;
  statusKind?: StatusKind;
  source?: string;
  stage?: string;
}) {
  const labels = {
    lead:        'Лид',
    customer:    'Компания',
    contact:     'Контакт',
    opportunity: 'Сделка',
  } as const;

  return (
    <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 sm:px-6 py-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {labels[entity]}
        </span>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {status && (
            <Badge
              kind={statusKind ?? 'oppStatus'}
              variant={status as never}
              value={status}
            />
          )}
          {source && (
            <Badge kind="source" variant={source as never} value={source} />
          )}
          {stage && (
            <Badge kind="stage" variant={stage as never} value={stage} />
          )}
        </div>
      </div>
      <DrawerCloseButton />
    </header>
  );
}