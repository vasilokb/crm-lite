'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

export function SearchInput({
  placeholder = 'Поиск…',
}: {
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get('q') ?? '');
  const [pending, start] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set('q', value);
      else next.delete('q');
      next.delete('page');
      start(() => router.replace(`${pathname}?${next.toString()}`));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      type="search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      aria-busy={pending}
      className="w-full max-w-md rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
    />
  );
}