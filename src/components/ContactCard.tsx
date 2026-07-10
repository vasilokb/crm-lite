import { DrawerHeader } from './DrawerHeader';
import { ContactForm } from './ContactForm';
import type { Customer, Contact, Opportunity } from '@prisma/client';
import Link from 'next/link';
import { stageLabel } from '@/lib/labels';

type ContactFull = Contact & {
  customer: Customer | null;
  opportunities: Array<Opportunity & { stage: { name: string } }>;
};

export function ContactCard({ contact }: { contact: ContactFull }) {
  return (
    <article className="flex flex-col gap-4">
      <DrawerHeader
        entity="contact"
        title={contact.name}
      />

      <div className="px-6">
        <ContactForm contact={contact} />
      </div>

      {contact.customer && (
        <section className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
          <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Компания
          </h3>
          <p className="text-sm">
            <Link
              href={`/customers/${contact.customer.id}`}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {contact.customer.name}
            </Link>
          </p>
        </section>
      )}

      <section className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Сделки ({contact.opportunities.length})
        </h3>
        {contact.opportunities.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Нет сделок</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {contact.opportunities.map((o) => (
              <li key={o.id} className="text-sm">
                <Link
                  href={`/opportunities/${o.id}`}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {o.title}
                </Link>
                <span className="text-zinc-500 dark:text-zinc-400" title={o.stage.name}> · {stageLabel(o.stage.name)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}