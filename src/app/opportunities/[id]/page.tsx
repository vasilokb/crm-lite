import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getOpportunity } from '@/lib/opportunities';
import { getStages } from '@/lib/stages';
import { OpportunityCard } from '@/components/OpportunityCard';

export default async function OpportunityFullPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [opp, stages] = await Promise.all([
    getOpportunity(id),
    getStages(),
  ]);
  if (!opp) notFound();
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <Link
        href="/opportunities"
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        ← К списку сделок
      </Link>
      <div className="mt-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <OpportunityCard opportunity={opp} stages={stages} />
      </div>
    </main>
  );
}
