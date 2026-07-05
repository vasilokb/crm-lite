'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export function Drawer({
  children,
}: {
  children: ReactNode;
  onCloseHref?: string;
}) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Закрыть"
        className="absolute inset-0 bg-black/40 cursor-default"
      />
      <aside className="relative ml-auto h-full w-full max-w-xl bg-white dark:bg-zinc-900 shadow-xl overflow-y-auto border-l border-zinc-200 dark:border-zinc-800">
        {children}
      </aside>
    </div>
  );
}