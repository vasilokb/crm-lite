import Link from 'next/link';
import { getAccounts } from '@/lib/accounts';
import { SearchInput } from '@/components/SearchInput';
import { FilterBar } from '@/components/FilterBar';
import { Pagination } from '@/components/Pagination';

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
              items.map((acc) => (
                <tr key={acc.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-3 py-2 text-zinc-900 dark:text-zinc-50">
                    <Link href={`/accounts/${acc.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">
                      {acc.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                    {acc.website ? (
                      <a href={acc.website} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                        {acc.website}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/accounts/${acc.id}#contacts`}
                      className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-950/40 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 hover:underline"
                    >
                      {acc._count.contacts}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/accounts/${acc.id}#opportunities`}
                      className="inline-flex items-center rounded-full bg-sky-100 dark:bg-sky-950/40 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:underline"
                    >
                      {acc._count.opportunities}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/accounts" searchParams={baseSearchParams} />
    </main>
  );
}