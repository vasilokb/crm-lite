import { notFound } from 'next/navigation';
import { getAccount } from '@/lib/accounts';
import { Drawer } from '@/components/Drawer';
import { AccountCard } from '@/components/AccountCard';

export default async function InterceptedAccountDrawer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await getAccount(id);
  if (!account) notFound();
  return (
    <Drawer>
      <AccountCard account={account} />
    </Drawer>
  );
}