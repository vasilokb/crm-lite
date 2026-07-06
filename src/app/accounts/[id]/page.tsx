import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAccount } from '@/lib/accounts';
import { AccountCard } from '@/components/AccountCard';

export default async function AccountFullPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await getAccount(id);
  if (!account) notFound();
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <Link
        href="/accounts"
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        ← К списку компаний
      </Link>
      <div className="mt-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <AccountCard account={account} />
      </div>
    </main>
  );
}
