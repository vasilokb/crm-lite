import { getAccounts } from '@/lib/accounts';
import { SearchInput } from '@/components/SearchInput';
import { FilterBar } from '@/components/FilterBar';
import { Pagination } from '@/components/Pagination';
import { CreateAccountForm } from '@/components/CreateAccountForm';
import { AccountRowWithDrawer } from '@/components/AccountRowWithDrawer';

type SP = { q?: string; page?: string };

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const { items, page, totalPages, total } = await getAccounts({
    q:    sp.q,
    page: sp.page ? Number(sp.page) : 1,
  });

  const baseSearchParams: Record<string, string | undefined> = { q: sp.q };

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Компании</h1>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Всего: {total}</span>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder="Поиск по названию компании…" />
        <FilterBar current={baseSearchParams} filters={[]} />
        <div className="sm:ml-auto">
          <CreateAccountForm />
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr className="text-left text-zinc-600 dark:text-zinc-400">
              <th className="px-3 py-2 font-medium">Имя</th>
              <th className="px-3 py-2 font-medium">Сайт</th>
              <th className="px-3 py-2 font-medium">Контакты</th>
              <th className="px-3 py-2 font-medium">Сделки</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  Нет компаний по фильтру
                </td>
              </tr>
            ) : (
              items.map((acc) => <AccountRowWithDrawer key={acc.id} account={acc} />)
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/accounts" searchParams={baseSearchParams} />
    </main>
  );
}