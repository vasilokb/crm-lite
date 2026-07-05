import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLead } from '@/lib/leads';
import { getAccounts } from '@/lib/accounts';
import { getContacts } from '@/lib/contacts';
import { LeadCard } from '@/components/LeadCard';
import { CardOverlayWrapper } from '@/components/CardOverlayWrapper';

export default async function LeadFullPage({
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

  // Рендерим ВСЕГДА через Drawer overlay (даже на direct URL).
  // Закрытие = возврат на /leads.
  // Для refresh/share-link это эквивалентно тому, что было в фазе 7/8.
  return (
    <CardOverlayWrapper listPath="/leads">
      <LeadCard lead={lead} accounts={accountsPage.items} contacts={contactsPage.items} />
    </CardOverlayWrapper>
  );
}