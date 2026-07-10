import { DrawerHeader } from './DrawerHeader';
import { DrawerRelatedList } from './DrawerRelatedList';
import { CustomerForm } from './CustomerForm';
import type { Customer, Contact, Opportunity } from '@prisma/client';
import Link from 'next/link';
import { stageLabel } from '@/lib/labels';

type CustomerFull = Customer & {
  contacts: Contact[];
  opportunities: Array<Opportunity & { stage: { name: string } }>;
};

export function CustomerCard({ customer }: { customer: CustomerFull }) {
  const relatedItems = [
    { label: 'Контакты', href: '#contacts', count: customer.contacts.length },
    { label: 'Сделки',   href: '#opportunities', count: customer.opportunities.length },
  ];

  return (
    <article className="flex flex-col gap-4">
      <DrawerHeader
        entity="customer"
        title={customer.name}
      />

      <div className="px-6">
        <CustomerForm customer={customer} />
      </div>

      <DrawerRelatedList title="Связи" items={relatedItems} context="inside-drawer" />

      <section id="contacts" className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Контакты ({customer.contacts.length})
        </h3>
        {customer.contacts.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Нет контактов</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {customer.contacts.map((c) => (
              <li key={c.id} className="text-sm">
                <Link
                  href={`/contacts/${c.id}`}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {c.name}
                </Link>
                {c.role && (
                  <span className="text-zinc-500 dark:text-zinc-400"> · {c.role}</span>
                )}
                {c.email && (
                  <span className="text-zinc-500 dark:text-zinc-400"> · {c.email}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="opportunities" className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Сделки ({customer.opportunities.length})
        </h3>
        {customer.opportunities.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Нет сделок</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {customer.opportunities.map((o) => (
              <li key={o.id} className="text-sm">
                <Link
                  href={`/opportunities/${o.id}`}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {o.title}
                </Link>
                <span className="text-zinc-500 dark:text-zinc-400" title={o.stage.name}>
                  {' '}· {stageLabel(o.stage.name)} ·{' '}
                  {o.amount
                    ? new Intl.NumberFormat('ru-RU').format(o.amount) + ' ₽'
                    : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}