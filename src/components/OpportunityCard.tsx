import { DrawerHeader } from './DrawerHeader';
import { OpportunityForm } from './OpportunityForm';
import type { Account, Activity, Contact, Opportunity, Stage } from '@prisma/client';
import Link from 'next/link';

type OpportunityFull = Opportunity & {
  account: Account | null;
  contact: Contact | null;
  stage: Stage;
  activities: Activity[];
};

export function OpportunityCard({
  opportunity,
  stages,
}: {
  opportunity: OpportunityFull;
  stages: Array<{ id: string; name: string }>;
}) {
  return (
    <article className="flex flex-col gap-4">
      <DrawerHeader
        entity="opportunity"
        title={opportunity.title}
        status={opportunity.status}
        stage={opportunity.stage.name}
      />

      <div className="px-6">
        <OpportunityForm opportunity={opportunity} stages={stages} />
      </div>

      <section className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Связи
        </h3>
        <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
          {opportunity.account && (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">Компания:</dt>
              <dd>
                <Link
                  href={`/accounts/${opportunity.account.id}`}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {opportunity.account.name}
                </Link>
              </dd>
            </>
          )}
          {opportunity.contact && (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">Контакт:</dt>
              <dd>
                <Link
                  href={`/contacts/${opportunity.contact.id}`}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {opportunity.contact.name}
                </Link>
              </dd>
            </>
          )}
          {opportunity.amount !== null && (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">Сумма:</dt>
              <dd className="tabular-nums">
                {new Intl.NumberFormat('ru-RU').format(opportunity.amount)} ₽
              </dd>
            </>
          )}
          {opportunity.dueDate && (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">Плановая дата:</dt>
              <dd>{new Date(opportunity.dueDate).toLocaleDateString('ru-RU')}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Активности ({opportunity.activities.length})
        </h3>
        {opportunity.activities.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Нет активностей</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {opportunity.activities.map((a) => (
              <li key={a.id} className="flex items-start gap-2">
                <span className="text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wide">
                  {a.type}{' '}
                  {a.type === 'task' && (a.done ? '(✓)' : '(○)')}
                </span>
                <span className="text-zinc-700 dark:text-zinc-300">{a.text}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Timeline с toggle done — фаза 10.
        </p>
      </section>
    </article>
  );
}