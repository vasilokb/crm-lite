import Link from 'next/link';
import { getContacts } from '@/lib/contacts';
import { getAccounts } from '@/lib/accounts';
import { SearchInput } from '@/components/SearchInput';
import { FilterBar } from '@/components/FilterBar';
import { Pagination } from '@/components/Pagination';
import { CreateContactForm } from '@/components/CreateContactForm';
import { TABLE_HEADERS } from '@/lib/labels';

// ISR: cache 30s. Инвалидируется через safeRevalidate в server actions.
export const revalidate = 30;

type SP = { q?: string; accountId?: string; page?: string };

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const [{ items, page, totalPages, total }, accountsPage] = await Promise.all([
    getContacts({
      q:         sp.q,
      accountId: sp.accountId,
      page:      sp.page ? Number(sp.page) : 1,
    }),
    getAccounts({ limit: 100 }),
  ]);

  const baseSearchParams: Record<string, string | undefined> = {
    q: sp.q,
    accountId: sp.accountId,
  };

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Контакты</h1>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Всего: {total}</span>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder="Поиск по имени или email…" />
        <FilterBar current={baseSearchParams} filters={[]} />
        <div className="sm:ml-auto">
          <CreateContactForm accounts={accountsPage.items} />
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[440px] text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr className="text-left text-zinc-600 dark:text-zinc-400">
              <th className="px-3 py-2 font-medium">{TABLE_HEADERS.contacts.name}</th>
              <th className="px-3 py-2 font-medium hidden sm:table-cell">{TABLE_HEADERS.contacts.email}</th>
              <th className="px-3 py-2 font-medium hidden sm:table-cell">{TABLE_HEADERS.contacts.phone}</th>
              <th className="px-3 py-2 font-medium">{TABLE_HEADERS.contacts.company}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  Нет контактов по фильтру
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <td className="px-3 py-2">
                    <Link
                      href={`/contacts/${c.id}`}
                      className="text-zinc-900 dark:text-zinc-50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell">{c.email ?? '—'}</td>
                  <td className="px-3 py-2 hidden sm:table-cell">{c.phone ?? '—'}</td>
                  <td className="px-3 py-2">{c.account?.name ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/contacts" searchParams={baseSearchParams} />
    </main>
  );
}