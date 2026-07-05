import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAccount } from '@/lib/accounts';
import { AccountCard } from '@/components/AccountCard';
import { CardOverlayWrapper } from '@/components/CardOverlayWrapper';

export default async function AccountFullPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await getAccount(id);
  if (!account) notFound();
  return (
    <CardOverlayWrapper listPath="/accounts">
      <AccountCard account={account} />
    </CardOverlayWrapper>
  );
}