import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCustomer } from '@/lib/customers';
import { CustomerCard } from '@/components/CustomerCard';

export default async function CustomerFullPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <Link
        href="/customers"
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        ← К списку компаний
      </Link>
      <div className="mt-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <CustomerCard customer={customer} />
      </div>
    </main>
  );
}