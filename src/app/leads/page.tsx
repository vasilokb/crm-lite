import Link from 'next/link';
import { getLeads } from '@/lib/leads';
import { getAccounts } from '@/lib/accounts';
import { getContacts } from '@/lib/contacts';
import { SearchInput } from '@/components/SearchInput';
import { FilterBar } from '@/components/FilterBar';
import { Pagination } from '@/components/Pagination';
import { Badge } from '@/components/Badge';
import { CreateLeadForm } from '@/components/CreateLeadForm';
import {
  TABLE_HEADERS,
  leadSourceLabel,
  leadStatusLabel,
} from '@/lib/labels';

// ISR: cache 30s. Инвалидируется через safeRevalidate в server actions.
export const revalidate = 30;

type SP = { q?: string; source?: string; status?: string; page?: string };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const [{ items, page, totalPages, total }, accountsPage, contactsPage] = await Promise.all([
    getLeads({
      q:        sp.q,
      source:   sp.source,
      status:   sp.status,
      page:     sp.page ? Number(sp.page) : 1,
    }),
    getAccounts({ limit: 100 }),
    getContacts({ limit: 100 }),
  ]);

  const baseSearchParams: Record<string, string | undefined> = {
    q:      sp.q,
    source: sp.source,
    status: sp.status,
  };

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Лиды</h1>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Всего: {total}</span>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder="Поиск по имени или компании…" />
        <FilterBar
          current={baseSearchParams}
          filters={[
            {
              name: 'source', label: 'Источник',
              options: [
                { value: 'site',     label: leadSourceLabel('site') },
                { value: 'email',    label: leadSourceLabel('email') },
                { value: 'phone',    label: leadSourceLabel('phone') },
                { value: 'referral', label: leadSourceLabel('referral') },
                { value: 'manual',   label: leadSourceLabel('manual') },
              ],
            },
            {
              name: 'status', label: 'Статус',
              options: [
                { value: 'new',       label: leadStatusLabel('new') },
                { value: 'processed', label: leadStatusLabel('processed') },
                { value: 'converted', label: leadStatusLabel('converted') },
              ],
            },
          ]}
        />
        <div className="sm:ml-auto">
          <CreateLeadForm accounts={accountsPage.items} contacts={contactsPage.items} />
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr className="text-left text-zinc-600 dark:text-zinc-400">
              <th className="px-3 py-2 font-medium">{TABLE_HEADERS.leads.name}</th>
              <th className="px-3 py-2 font-medium">{TABLE_HEADERS.leads.source}</th>
              <th className="px-3 py-2 font-medium">{TABLE_HEADERS.leads.status}</th>
              <th className="px-3 py-2 font-medium">{TABLE_HEADERS.leads.company}</th>
              <th className="px-3 py-2 font-medium">{TABLE_HEADERS.leads.created}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  Нет лидов по фильтру
                </td>
              </tr>
            ) : (
              items.map((lead) => (
                <tr key={lead.id} className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <td className="px-3 py-2">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-zinc-900 dark:text-zinc-50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                    >
                      {lead.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Badge kind="source" variant={lead.source} value={lead.source} />
                  </td>
                  <td className="px-3 py-2">
                    <Badge kind="leadStatus" variant={lead.status} value={lead.status} />
                  </td>
                  <td className="px-3 py-2">{lead.company ?? '—'}</td>
                  <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">
                    {new Date(lead.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/leads" searchParams={baseSearchParams} />
    </main>
  );
}