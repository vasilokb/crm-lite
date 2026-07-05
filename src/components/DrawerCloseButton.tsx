'use client';

import { useRouter } from 'next/navigation';

export function DrawerCloseButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Закрыть"
      className="rounded p-1 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50"
    >
      <span className="block w-6 h-6 leading-6 text-center text-lg">×</span>
    </button>
  );
}