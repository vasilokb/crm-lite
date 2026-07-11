import { DrawerHeader } from './DrawerHeader';
import { OpportunityForm } from './OpportunityForm';
import { StageProgressBar } from './StageProgressBar';
import { ActivityTimeline } from './ActivityTimeline';
import { ActivityForm } from './ActivityForm';
import type { Customer, Activity, Contact, Opportunity, Stage } from '@prisma/client';
import Link from 'next/link';

type OpportunityFull = Opportunity & {
  customer: Customer | null;
  contact: Contact | null;
  stage: Stage;
  activities: Activity[];
};

export function OpportunityCard({
  opportunity,
  stages,
}: {
  opportunity: OpportunityFull;
  stages: Stage[];
}) {
  return (
    <article className="flex flex-col gap-4">
      <DrawerHeader
        entity="opportunity"
        title={opportunity.title}
        status={opportunity.status}
        statusKind="oppStatus"
        stage={opportunity.stage.name}
      />

      <div className="px-6 pt-4">
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Воронка</h3>
        <StageProgressBar
          opportunityId={opportunity.id}
          currentStageId={opportunity.stageId}
          stages={stages}
          opportunityAmount={opportunity.amount}
          opportunityContactId={opportunity.contactId}
        />
      </div>

      <div className="px-6">
        <OpportunityForm opportunity={opportunity} stages={stages} />
      </div>

      <section className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Связи
        </h3>
        <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
          {opportunity.customer && (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">Компания:</dt>
              <dd>
                <Link
                  href={`/customers/${opportunity.customer.id}`}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {opportunity.customer.name}
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
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Активности ({opportunity.activities.length})
          </h3>
        </div>
        <ActivityForm opportunityId={opportunity.id} />
        <div className="mt-4">
          <ActivityTimeline activities={opportunity.activities} />
        </div>
      </section>
    </article>
  );
}