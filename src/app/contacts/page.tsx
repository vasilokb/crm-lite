import Link from 'next/link';
import { getContacts } from '@/lib/contacts';
import { SearchInput } from '@/components/SearchInput';
import { FilterBar } from '@/components/FilterBar';
import { Pagination } from '@/components/Pagination';

type SP = { q?: string; accountId?: string; page?: string };

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const { items, page, totalPages, total } = await getContacts({
    q:         sp.q,
    accountId: sp.accountId,
    page:      sp.page ? Number(sp.page) : 1,
  });

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
      </div>

      <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr className="text-left text-zinc-600 dark:text-zinc-400">
              <th className="px-3 py-2 font-medium">Имя</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Телефон</th>
              <th className="px-3 py-2 font-medium">Компания</th>
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
                <tr key={c.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-3 py-2 text-zinc-900 dark:text-zinc-50">
                    <Link href={`/contacts/${c.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{c.email ?? '—'}</td>
                  <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{c.phone ?? '—'}</td>
                  <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                    {c.account ? (
                      <a
                        href={`/accounts/${c.account.id}`}
                        className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 text-xs border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:underline"
                      >
                        {c.account.name}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
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