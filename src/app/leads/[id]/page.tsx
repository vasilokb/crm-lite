import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLead } from '@/lib/leads';
import { getCustomers } from '@/lib/customers';
import { getContacts } from '@/lib/contacts';
import { LeadCard } from '@/components/LeadCard';

export default async function LeadFullPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lead, customersPage, contactsPage] = await Promise.all([
    getLead(id),
    getCustomers({ limit: 100 }),
    getContacts({ limit: 100 }),
  ]);
  if (!lead) notFound();

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <Link
        href="/leads"
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        ← К списку лидов
      </Link>
      <div className="mt-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <LeadCard lead={lead} customers={customersPage.items} contacts={contactsPage.items} />
      </div>
    </main>
  );
}
