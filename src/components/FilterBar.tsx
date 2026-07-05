'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';

type Option = { value: string; label: string };
type Filters = { name: string; label: string; options: Option[] };

export function FilterBar({
  filters,
  current = {},
}: {
  filters: Filters[];
  current?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function onChange(name: string, value: string): void {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete('page');
    start(() => router.replace(`${pathname}?${next.toString()}`));
  }

  function reset(): void {
    const next = new URLSearchParams();
    const q = params.get('q');
    if (q) next.set('q', q);
    start(() => router.replace(`${pathname}?${next.toString()}`));
  }

  const hasAny = filters.some((f) => current[f.name]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((f) => (
        <label key={f.name} className="flex items-center gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">{f.label}:</span>
          <select
            value={current[f.name] ?? ''}
            onChange={(e) => onChange(f.name, e.target.value)}
            aria-busy={pending}
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">Все</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {hasAny && (
        <button
          type="button"
          onClick={reset}
          className="rounded border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Сбросить
        </button>
      )}
    </div>
  );
}