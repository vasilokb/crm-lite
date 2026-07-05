import Link from 'next/link';

type Props = {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
};

export function Pagination({ page, totalPages, basePath, searchParams = {} }: Props) {
  if (totalPages <= 1) return null;

  const buildHref = (newPage: number): string => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== undefined && v !== '' && k !== 'page') params.set(k, v);
    }
    if (newPage > 1) params.set('page', String(newPage));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const prev = page > 1 ? buildHref(page - 1) : null;
  const next = page < totalPages ? buildHref(page + 1) : null;

  return (
    <nav aria-label="Пагинация" className="flex items-center justify-between gap-4 py-4">
      <div className="text-sm text-zinc-500 dark:text-zinc-400">
        Стр. {page} из {totalPages}
      </div>
      <div className="flex items-center gap-2">
        {prev ? (
          <Link
            href={prev}
            className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ‹ Назад
          </Link>
        ) : (
          <span className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-sm text-zinc-300 dark:text-zinc-600 cursor-not-allowed">
            ‹ Назад
          </span>
        )}
        {next ? (
          <Link
            href={next}
            className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Дальше ›
          </Link>
        ) : (
          <span className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-sm text-zinc-300 dark:text-zinc-600 cursor-not-allowed">
            Дальше ›
          </span>
        )}
      </div>
    </nav>
  );
}