'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  addLineItem,
  removeLineItem,
  updateDiscount,
  updateLineItem,
} from '@/lib/lineItems';
import { searchProducts } from '@/lib/products';

export type LineItemRow = {
  id: string;
  quantity: number;
  unitPrice: number;
  product: {
    id: string;
    name: string;
    sku: string | null;
    _count: { components: number };
  };
};

type SearchHit = { id: string; name: string; price: number; sku: string | null };

type Props = {
  opportunityId: string;
  lineItems: LineItemRow[];
  amount: number | null;
  discount: number | null;
  hasLineItems: boolean;
};

const rub = (n: number): string => new Intl.NumberFormat('ru-RU').format(n);

export function OpportunityLineItems({
  opportunityId,
  lineItems,
  amount,
  discount,
  hasLineItems,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [searchQ, setSearchQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const [discountDraft, setDiscountDraft] = useState<string>(
    discount !== null ? String(discount) : ''
  );
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Локальный черновик qty/unitPrice для каждой строки — чтобы не дёргать сервер на каждый onChange.
  // Если для id черновика нет — фоллбек на значения из пропса (новая строка после addLineItem).
  // Существующие черновики не сбрасываем при refresh — сохраняем in-progress правку.
  const [drafts, setDrafts] = useState<Record<string, { quantity: string; unitPrice: string }>>({});

  function getDraft(id: string, fallback: { quantity: number; unitPrice: number }): { quantity: string; unitPrice: string } {
    return drafts[id] ?? {
      quantity: String(fallback.quantity),
      unitPrice: String(fallback.unitPrice),
    };
  }

  async function runSearch(q: string): Promise<void> {
    setSearching(true);
    try {
      const result = await searchProducts(q);
      setHits(
        result.items.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          sku: p.sku ?? null,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'search failed');
    } finally {
      setSearching(false);
    }
  }

  function pickHit(hit: SearchHit): void {
    setSearchQ('');
    setHits([]);
    start(async () => {
      const res = await addLineItem({
        opportunityId,
        productId: hit.id,
        quantity: 1,
      });
      if (!res.ok) {
        setError(res.error ?? res.message ?? 'Не удалось добавить товар');
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  function commitLineItem(id: string): void {
    const d = drafts[id];
    if (!d) return;
    const q = Number(d.quantity);
    const p = Number(d.unitPrice);
    const payload: { quantity?: number; unitPrice?: number } = {};
    if (Number.isFinite(q) && q > 0) payload.quantity = Math.floor(q);
    if (Number.isFinite(p) && p > 0) payload.unitPrice = p;
    if (Object.keys(payload).length === 0) return;
    start(async () => {
      const res = await updateLineItem(id, payload);
      if (!res.ok) {
        setError(res.error ?? res.message ?? 'Не удалось обновить позицию');
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  function removeRow(id: string): void {
    start(async () => {
      const res = await removeLineItem(id);
      if (!res.ok) {
        setError(res.error ?? res.message ?? 'Не удалось удалить позицию');
        return;
      }
      setError(null);
      // Если это была последняя — сервер обнулил amount+discount; refresh подтянет изменения.
      router.refresh();
    });
  }

  function commitDiscount(): void {
    setDiscountError(null);
    const raw = discountDraft.trim();
    const value: number | null = raw === '' ? null : Number(raw);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      setDiscountError('Скидка должна быть числом ≥ 0 или пустой');
      return;
    }
    start(async () => {
      const res = await updateDiscount({ opportunityId, discount: value });
      if (!res.ok) {
        if (res.error === 'discount_exceeds_subtotal') {
          setDiscountError('Скидка не может превышать сумму позиций');
        } else if (res.error === 'discount_requires_lineitems') {
          setDiscountError('Скидка доступна только при наличии позиций');
        } else {
          setDiscountError(res.error ?? res.message ?? 'Не удалось обновить скидку');
        }
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  const subtotal = lineItems.reduce((s, li) => s + li.unitPrice * li.quantity, 0);

  return (
    <section className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
      <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Товары в сделке ({lineItems.length})
      </h3>

      {lineItems.length > 0 ? (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="px-2 py-1 font-medium">Товар</th>
              <th className="px-2 py-1 font-medium w-20 text-right">Кол-во</th>
              <th className="px-2 py-1 font-medium w-28 text-right">Цена</th>
              <th className="px-2 py-1 font-medium w-28 text-right">Сумма</th>
              <th className="px-2 py-1 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((li) => {
              const isBundle = li.product._count.components > 0;
              const d = getDraft(li.id, { quantity: li.quantity, unitPrice: li.unitPrice });
              const rowSum = (Number(d.unitPrice) || 0) * (Number(d.quantity) || 0);
              return (
                <tr key={li.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/products/${li.product.id}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {li.product.name}
                      </Link>
                      {isBundle && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          БАНДЛ
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <input
                      type="number"
                      min="1"
                      value={d.quantity}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [li.id]: { ...prev[li.id], quantity: e.target.value },
                        }))
                      }
                      onBlur={() => commitLineItem(li.id)}
                      disabled={pending}
                      className="w-16 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-right text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={d.unitPrice}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [li.id]: { ...prev[li.id], unitPrice: e.target.value },
                        }))
                      }
                      onBlur={() => commitLineItem(li.id)}
                      disabled={pending}
                      className="w-24 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-right text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {rub(rowSum)} ₽
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(li.id)}
                      disabled={pending}
                      aria-label="Удалить позицию"
                      title="Удалить позицию"
                      className="rounded p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-200 dark:border-zinc-800">
              <td colSpan={3} className="px-2 py-2 text-right text-zinc-700 dark:text-zinc-300">
                Subtotal
              </td>
              <td className="px-2 py-2 text-right tabular-nums font-medium text-zinc-900 dark:text-zinc-50">
                {rub(subtotal)} ₽
              </td>
              <td></td>
            </tr>
            <tr>
              <td className="px-2 py-2 text-right text-zinc-700 dark:text-zinc-300">
                Скидка (₽)
              </td>
              <td colSpan={2} className="px-2 py-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discountDraft}
                  onChange={(e) => setDiscountDraft(e.target.value)}
                  onBlur={commitDiscount}
                  disabled={pending || !hasLineItems}
                  placeholder="0"
                  aria-invalid={Boolean(discountError)}
                  className={`w-32 rounded border px-2 py-1 text-right text-sm outline-none focus:ring-1 ${
                    discountError
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500 bg-rose-50 dark:bg-rose-950/40'
                      : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                />
                {discountError && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                    {discountError}
                  </p>
                )}
              </td>
              <td className="px-2 py-2 text-right">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">ИТОГО</div>
                <div className="text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {amount !== null ? `${rub(amount)} ₽` : '—'}
                </div>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          Нет позиций. Добавьте товар ниже или оставьте сумму вручную в форме сделки.
        </p>
      )}

      <div className="mt-4 relative">
        <input
          type="search"
          value={searchQ}
          onChange={(e) => {
            const v = e.target.value;
            setSearchQ(v);
            void runSearch(v);
          }}
          placeholder="Поиск товара для добавления…"
          aria-busy={searching}
          className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        {searchQ.length > 0 && hits.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg"
          >
            {hits.map((h) => (
              <li key={h.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => pickHit(h)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">
                    {h.name}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {rub(h.price)} ₽
                    {h.sku ? ` · ${h.sku}` : ''}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </section>
  );
}