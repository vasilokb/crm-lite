import Link from 'next/link';
import { getProducts } from '@/lib/products';
import { SearchInput } from '@/components/SearchInput';
import { Pagination } from '@/components/Pagination';
import { CreateProductForm } from '@/components/CreateProductForm';

export const revalidate = 30;

type SP = { q?: string; page?: string };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const { items, page, totalPages, total } = await getProducts({
    q: sp.q,
    page: sp.page ? Number(sp.page) : 1,
  });

  const baseSearchParams: Record<string, string | undefined> = { q: sp.q };

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Продукты</h1>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Всего: {total}</span>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder="Поиск по названию продукта…" />
        <div className="sm:ml-auto">
          <CreateProductForm />
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr className="text-left text-zinc-600 dark:text-zinc-400">
              <th className="px-3 py-2 font-medium">Название</th>
              <th className="px-3 py-2 font-medium">Тип</th>
              <th className="px-3 py-2 font-medium">Базовая цена</th>
              <th className="px-3 py-2 font-medium">В сделках</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  Нет продуктов по фильтру
                </td>
              </tr>
            ) : (
              items.map((p) => {
                const isBundle = p.components.length > 0;
                return (
                  <tr key={p.id} className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <td className="px-3 py-2">
                      <Link
                        href={`/products/${p.id}`}
                        className="text-zinc-900 dark:text-zinc-50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      {isBundle ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          Бандл
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                          Простое
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                      {new Intl.NumberFormat('ru-RU').format(p.price)} ₽
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center rounded-full bg-sky-100 dark:bg-sky-950/40 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                        {p._count?.lineItems ?? 0}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/products" searchParams={baseSearchParams} />
    </main>
  );
}