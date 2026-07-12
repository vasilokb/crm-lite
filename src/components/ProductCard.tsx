'use client';

import { useState } from 'react';
import { ProductForm } from './ProductForm';
import { DrawerCloseButton } from './DrawerCloseButton';

// Тип минимально достаточен для серверной карточки (содержит все поля из getProduct()).
export type ProductCardData = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sku: string | null;
  components: Array<{
    id: string;
    quantity: number;
    component: { id: string; name: string; price: number; sku: string | null };
  }>;
  _count: { lineItems: number };
};

const rub = (n: number): string => new Intl.NumberFormat('ru-RU').format(n);

export function ProductCard({ product }: { product: ProductCardData }) {
  const [editing, setEditing] = useState(false);
  const isBundle = product.components.length > 0;
  const componentsSum = product.components.reduce(
    (s, c) => s + c.component.price * c.quantity,
    0
  );

  if (editing) {
    return (
      <article className="flex flex-col">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Продукт
            </span>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Редактирование
            </h2>
          </div>
          <DrawerCloseButton />
        </header>
        <ProductForm
          product={product}
          mode="edit"
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      </article>
    );
  }

  return (
    <article className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 sm:px-6 py-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Продукт
          </span>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {product.name}
          </h2>
          {isBundle && (
            <span className="inline-flex w-fit items-center rounded-full bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              БАНДЛ
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Редактировать
          </button>
          <DrawerCloseButton />
        </div>
      </header>

      {product.description && (
        <section className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
          <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Описание</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
            {product.description}
          </p>
        </section>
      )}

      <section className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Цена</h3>
        <p className="text-sm text-zinc-900 dark:text-zinc-50">
          Базовая: <span className="font-semibold">{rub(product.price)} ₽</span>
        </p>
        {isBundle && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            💡 Σ компонентов: {rub(componentsSum)} ₽ (справочно)
          </p>
        )}
        {product.sku && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">SKU: {product.sku}</p>
        )}
      </section>

      {isBundle && (
        <section className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
          <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Состав ({product.components.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {product.components.map((c) => (
              <li key={c.id} className="text-sm text-zinc-700 dark:text-zinc-300">
                • {c.component.name} × {c.quantity}
                <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                  ({rub(c.component.price * c.quantity)} ₽)
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
        <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Статистика</h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Используется в сделках:{' '}
          <span className="font-semibold">{product._count.lineItems}</span>
        </p>
      </section>
    </article>
  );
}