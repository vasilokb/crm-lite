import Link from 'next/link';
import { getOpportunities } from '@/lib/opportunities';
import { getStages } from '@/lib/stages';
import { getCustomers } from '@/lib/customers';
import { getContacts } from '@/lib/contacts';
import { SearchInput } from '@/components/SearchInput';
import { FilterBar } from '@/components/FilterBar';
import { Pagination } from '@/components/Pagination';
import { CreateOpportunityForm } from '@/components/CreateOpportunityForm';
import { Badge } from '@/components/Badge';
import {
  TABLE_HEADERS,
  stageLabel,
  opportunityStatusLabel,
} from '@/lib/labels';

// ISR: cache 30s. Инвалидируется через safeRevalidate в server actions.
export const revalidate = 30;

type SP = { q?: string; stage?: string; status?: string; page?: string };

const STAGE_OPTIONS = [
  { value: 'qualification', label: stageLabel('qualification') },
  { value: 'proposal',      label: stageLabel('proposal') },
  { value: 'negotiation',   label: stageLabel('negotiation') },
  { value: 'won',           label: stageLabel('won') },
  { value: 'lost',          label: stageLabel('lost') },
];

const STATUS_OPTIONS = [
  { value: 'open', label: opportunityStatusLabel('open') },
  { value: 'won',  label: opportunityStatusLabel('won') },
  { value: 'lost', label: opportunityStatusLabel('lost') },
];

function formatAmount(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const stages = await getStages();
  const stageId = sp.stage ? stages.find((s) => s.name === sp.stage)?.id : undefined;

  const [{ items, page, totalPages, total }, customersPage, contactsPage] = await Promise.all([
    getOpportunities({
      q:       sp.q,
      stageId: stageId,
      status:  sp.status,
      page:    sp.page ? Number(sp.page) : 1,
    }),
    getCustomers({ limit: 100 }),
    getContacts({ limit: 100 }),
  ]);

  const baseSearchParams: Record<string, string | undefined> = {
    q:      sp.q,
    stage:  sp.stage,
    status: sp.status,
  };

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Сделки</h1>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Всего: {total}</span>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder="Поиск по названию сделки…" />
        <FilterBar
          current={baseSearchParams}
          filters={[
            { name: 'stage',  label: 'Стадия', options: STAGE_OPTIONS },
            { name: 'status', label: 'Статус', options: STATUS_OPTIONS },
          ]}
        />
        <div className="sm:ml-auto">
          <CreateOpportunityForm
            stages={stages}
            customers={customersPage.items}
            contacts={contactsPage.items}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr className="text-left text-zinc-600 dark:text-zinc-400">
              <th className="px-3 py-2 font-medium">{TABLE_HEADERS.opportunities.title}</th>
              <th className="px-3 py-2 font-medium text-right">{TABLE_HEADERS.opportunities.amount}</th>
              <th className="px-3 py-2 font-medium">{TABLE_HEADERS.opportunities.stage}</th>
              <th className="px-3 py-2 font-medium">{TABLE_HEADERS.opportunities.status}</th>
              <th className="px-3 py-2 font-medium hidden sm:table-cell">{TABLE_HEADERS.opportunities.company}</th>
              <th className="px-3 py-2 font-medium hidden sm:table-cell">{TABLE_HEADERS.opportunities.contact}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  Нет сделок по фильтру
                </td>
              </tr>
            ) : (
              items.map((opp) => (
                <tr key={opp.id} className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <td className="px-3 py-2">
                    <Link
                      href={`/opportunities/${opp.id}`}
                      className="text-zinc-900 dark:text-zinc-50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                    >
                      {opp.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatAmount(opp.amount)}</td>
                  <td className="px-3 py-2">
                    <Badge
                      kind="stage"
                      variant={opp.stage.name as 'qualification' | 'proposal' | 'negotiation' | 'won' | 'lost'}
                      value={opp.stage.name}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Badge kind="oppStatus" variant={opp.status} value={opp.status} />
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell">{opp.customer?.name ?? '—'}</td>
                  <td className="px-3 py-2 hidden sm:table-cell">{opp.contact?.name ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/opportunities" searchParams={baseSearchParams} />
    </main>
  );
}