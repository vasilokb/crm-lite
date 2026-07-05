import { DrawerHeader } from './DrawerHeader';
import { DrawerRelatedList } from './DrawerRelatedList';
import { LeadForm } from './LeadForm';
import { ConvertLeadAccordion } from './ConvertLeadAccordion';
import type { Account, Contact, Lead } from '@prisma/client';
import Link from 'next/link';

// LeadCard принимает массивы «как есть» из Prisma — включая Account с
// дополнительными полями (_count). Используем `any[]` чтобы не
// переносить все Prisma payload-типы в signals.
type LeadCardProps = {
  lead: Lead & {
    opportunity: null | {
      id: string;
      title: string;
      account: { id: string; name: string } | null;
    };
  };
  accounts: any[];
  contacts: any[];
};

export function LeadCard({
  lead,
  accounts,
  contacts,
}: LeadCardProps) {
  const relatedItems = [];
  if (lead.company) {
    relatedItems.push({
      label: 'Компания',
      href:  '#company',
      count: 1,
    });
  }
  if (lead.opportunity) {
    relatedItems.push({
      label: 'Сделка',
      href:  `/opportunities/${lead.opportunity.id}`,
      count: 1,
    });
  }

  return (
    <article className="px-6 py-4 flex flex-col gap-4">
      <DrawerHeader
        entity="lead"
        title={lead.name}
        status={lead.status}
        source={lead.source}
      />

      <div className="px-6">
        <LeadForm lead={lead} accounts={accounts} contacts={contacts} />
      </div>

      <div className="px-6">
        <ConvertLeadAccordion
          leadId={lead.id}
          leadStatus={lead.status}
          defaultAccountName={lead.company ?? ''}
        />
      </div>

      <DrawerRelatedList title="Связи" items={relatedItems} context="inside-drawer" />

      {lead.opportunity && (
        <section className="px-6 py-4">
          <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Сделка
          </h3>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <Link
              href={`/opportunities/${lead.opportunity.id}`}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {lead.opportunity.title}
            </Link>
            {lead.opportunity.account && (
              <> · {lead.opportunity.account.name}</>
            )}
          </p>
        </section>
      )}
    </article>
  );
}