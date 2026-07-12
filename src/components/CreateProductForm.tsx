'use client';

import { useState } from 'react';
import { Drawer } from '@/components/Drawer';
import { ProductForm } from '@/components/ProductForm';

export function CreateProductForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded bg-indigo-600 dark:bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-600"
      >
        + Новый продукт
      </button>
    );
  }

  return (
    <Drawer onClose={() => setOpen(false)}>
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 sm:px-6 py-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Продукт
          </span>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Новый продукт
          </h2>
        </div>
      </header>
      <ProductForm mode="create" onCancel={() => setOpen(false)} onSaved={() => setOpen(false)} />
    </Drawer>
  );
}