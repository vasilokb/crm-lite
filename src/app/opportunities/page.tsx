import Link from 'next/link';
import { getOpportunities } from '@/lib/opportunities';
import { getStages } from '@/lib/stages';
import { getAccounts } from '@/lib/accounts';
import { getContacts } from '@/lib/contacts';
import { SearchInput } from '@/components/SearchInput';
import { FilterBar } from '@/components/FilterBar';
import { Pagination } from '@/components/Pagination';
import { CreateOpportunityForm } from '@/components/CreateOpportunityForm';
import { OpportunityRowWithDrawer } from '@/components/OpportunityRowWithDrawer';

type SP = { q?: string; stage?: string; status?: string; page?: string };

const STAGE_OPTIONS = [
  { value: 'qualification', label: 'Квалификация' },
  { value: 'proposal',      label: 'Предложение' },
  { value: 'negotiation',   label: 'Переговоры' },
  { value: 'won',           label: 'Победа' },
  { value: 'lost',          label: 'Отказ' },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Открыта' },
  { value: 'won',  label: 'Выиграна' },
  { value: 'lost', label: 'Проиграна' },
];

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const stages = await getStages();
  const stageId = sp.stage ? stages.find((s) => s.name === sp.stage)?.id : undefined;

  const [{ items, page, totalPages, total }, accountsPage, contactsPage] = await Promise.all([
    getOpportunities({
      q:       sp.q,
      stageId: stageId,
      status:  sp.status,
      page:    sp.page ? Number(sp.page) : 1,
    }),
    getAccounts({ limit: 100 }),
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
            accounts={accountsPage.items}
            contacts={contactsPage.items}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr className="text-left text-zinc-600 dark:text-zinc-400">
              <th className="px-3 py-2 font-medium">Название</th>
              <th className="px-3 py-2 font-medium text-right">Сумма</th>
              <th className="px-3 py-2 font-medium">Стадия</th>
              <th className="px-3 py-2 font-medium">Статус</th>
              <th className="px-3 py-2 font-medium">Компания</th>
              <th className="px-3 py-2 font-medium">Контакт</th>
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
              items.map((opp) => <OpportunityRowWithDrawer key={opp.id} opportunity={opp} stages={stages} />)
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/opportunities" searchParams={baseSearchParams} />
    </main>
  );
}