import { notFound } from 'next/navigation';
import { getLead } from '@/lib/leads';
import { getAccounts } from '@/lib/accounts';
import { getContacts } from '@/lib/contacts';
import { Drawer } from '@/components/Drawer';
import { LeadCard } from '@/components/LeadCard';

export default async function InterceptedLeadDrawer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lead, accountsPage, contactsPage] = await Promise.all([
    getLead(id),
    getAccounts({ limit: 100 }),
    getContacts({ limit: 100 }),
  ]);
  if (!lead) notFound();
  return (
    <Drawer>
      <LeadCard lead={lead} accounts={accountsPage.items} contacts={contactsPage.items} />
    </Drawer>
  );
}
