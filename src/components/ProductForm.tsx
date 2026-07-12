'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createProduct, updateProduct, searchProducts } from '@/lib/products';
import type { ProductCardData } from './ProductCard';

type ComponentItem = { componentId: string; quantity: number };
type SearchHit = { id: string; name: string; price: number; sku: string | null };

type Props =
  | {
      mode: 'create';
      product?: undefined;
      onCancel: () => void;
      onSaved?: () => void;
    }
  | {
      mode: 'edit';
      product: ProductCardData;
      onCancel: () => void;
      onSaved?: () => void;
    };

export function ProductForm(props: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const initialName = props.mode === 'edit' ? props.product.name : '';
  const initialDesc = props.mode === 'edit' ? props.product.description ?? '' : '';
  const initialPrice = props.mode === 'edit' ? String(props.product.price) : '';
  const initialSku = props.mode === 'edit' ? props.product.sku ?? '' : '';
  const initialIsBundle = props.mode === 'edit' && props.product.components.length > 0;
  const editProduct = props.mode === 'edit' ? props.product : null;
  const initialComponents: ComponentItem[] = useMemo(
    () =>
      editProduct
        ? editProduct.components.map((c) => ({
            componentId: c.component.id,
            quantity: c.quantity,
          }))
        : [],
    [editProduct]
  );

  const [isBundle, setIsBundle] = useState<boolean>(initialIsBundle);
  const [components, setComponents] = useState<ComponentItem[]>(initialComponents);
  const [searchQ, setSearchQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  function toggleBundle(next: boolean): void {
    setIsBundle(next);
    if (!next) setComponents([]);
  }

  async function runSearch(q: string): Promise<void> {
    setSearching(true);
    try {
      const result = await searchProducts(q);
      const items = result.items.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        sku: p.sku ?? null,
      }));
      setHits(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'search failed');
    } finally {
      setSearching(false);
    }
  }

  const selfId = props.mode === 'edit' ? props.product.id : null;
  const addedIds = new Set(components.map((c) => c.componentId));
  const visibleHits = hits.filter((h) => h.id !== selfId && !addedIds.has(h.id));

  function addComponent(hit: SearchHit): void {
    setComponents((cs) => [...cs, { componentId: hit.id, quantity: 1 }]);
    setSearchQ('');
    setHits([]);
  }

  function updateQty(componentId: string, quantity: number): void {
    setComponents((cs) =>
      cs.map((c) => (c.componentId === componentId ? { ...c, quantity } : c))
    );
  }

  function removeComponent(componentId: string): void {
    setComponents((cs) => cs.filter((c) => c.componentId !== componentId));
  }

  const componentsSum = useMemo(() => {
    const map = new Map<string, { name: string; price: number }>();
    for (const c of components) {
      const hit = hits.find((h) => h.id === c.componentId);
      const existing = map.get(c.componentId);
      if (existing) {
        existing.price += hit?.price ?? 0;
      } else {
        map.set(c.componentId, {
          name: hit?.name ?? c.componentId,
          price: hit?.price ?? 0,
        });
      }
    }
    let sum = 0;
    for (const c of components) {
      const hit = hits.find((h) => h.id === c.componentId);
      sum += (hit?.price ?? 0) * c.quantity;
    }
    return sum;
  }, [components, hits]);

  function handleSubmit(formData: FormData): void {
    setError(null);
    setFieldErrors({});

    const name = String(formData.get('name') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const sku = String(formData.get('sku') ?? '').trim();
    const priceStr = String(formData.get('price') ?? '').trim();
    const price = Number(priceStr);

    if (!Number.isFinite(price) || price <= 0) {
      setFieldErrors({ price: ['Введите положительное число'] });
      return;
    }

    const input = {
      name,
      description: description || undefined,
      price,
      sku: sku || undefined,
      components: isBundle && components.length > 0 ? components : undefined,
    };

    start(async () => {
      const result =
        props.mode === 'edit'
          ? await updateProduct(props.product.id, input)
          : await createProduct(input);
      if (!result.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors as Record<string, string[]>);
        else setError(result.error ?? result.message ?? 'Не удалось сохранить продукт');
        return;
      }
      props.onSaved?.();
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4 px-6 py-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">
          Название <span className="text-rose-600">*</span>
        </span>
        <input
          name="name"
          required
          maxLength={200}
          defaultValue={initialName}
          aria-invalid={Boolean(fieldErrors.name)}
          className={`rounded border px-3 py-2 outline-none focus:ring-1 bg-white dark:bg-zinc-950 ${
            fieldErrors.name
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
              : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
          }`}
        />
        {fieldErrors.name?.map((e, i) => (
          <p key={i} className="text-xs text-rose-600 dark:text-rose-400">{e}</p>
        ))}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">
          Базовая цена (₽) <span className="text-rose-600">*</span>
        </span>
        <input
          name="price"
          type="number"
          required
          min="0"
          step="any"
          defaultValue={initialPrice}
          aria-invalid={Boolean(fieldErrors.price)}
          className={`rounded border px-3 py-2 outline-none focus:ring-1 bg-white dark:bg-zinc-950 ${
            fieldErrors.price
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
              : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
          }`}
        />
        {fieldErrors.price?.map((e, i) => (
          <p key={i} className="text-xs text-rose-600 dark:text-rose-400">{e}</p>
        ))}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">Артикул (SKU)</span>
        <input
          name="sku"
          maxLength={60}
          defaultValue={initialSku}
          className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">Описание</span>
        <textarea
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={initialDesc}
          className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isBundle}
          onChange={(e) => toggleBundle(e.target.checked)}
          className="h-4 w-4"
        />
        <span className="text-zinc-700 dark:text-zinc-300">
          Это составной продукт (Бандл)
        </span>
      </label>

      {isBundle && (
        <section className="rounded border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Состав</h3>

          <div className="relative">
            <input
              type="search"
              value={searchQ}
              onChange={(e) => {
                const v = e.target.value;
                setSearchQ(v);
                void runSearch(v);
              }}
              placeholder="Поиск товара для добавления в состав…"
              className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              aria-busy={searching}
            />
            {searchQ.length > 0 && visibleHits.length > 0 && (
              <ul
                role="listbox"
                className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg"
              >
                {visibleHits.map((h) => (
                  <li key={h.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => addComponent(h)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">
                        {h.name}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {new Intl.NumberFormat('ru-RU').format(h.price)} ₽
                        {h.sku ? ` · ${h.sku}` : ''}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {components.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Бандл пока без компонентов. Добавьте товары выше.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {components.map((c) => {
                const hit = hits.find((h) => h.id === c.componentId);
                return (
                  <li
                    key={c.componentId}
                    className="flex items-center gap-2 rounded border border-zinc-100 dark:border-zinc-800 px-2 py-1.5 text-sm"
                  >
                    <span className="flex-1 text-zinc-700 dark:text-zinc-300">
                      {hit?.name ?? c.componentId}
                    </span>
                    <label className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Кол-во
                      <input
                        type="number"
                        min="1"
                        value={c.quantity}
                        onChange={(e) => {
                          const q = Number(e.target.value);
                          if (Number.isFinite(q) && q > 0) updateQty(c.componentId, q);
                        }}
                        className="w-16 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-sm outline-none focus:border-indigo-500"
                      />
                    </label>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 w-24 text-right">
                      {hit
                        ? new Intl.NumberFormat('ru-RU').format(hit.price * c.quantity) + ' ₽'
                        : '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeComponent(c.componentId)}
                      aria-label="Удалить компонент"
                      className="rounded p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {components.length > 0 && hits.length > 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              💡 Σ компонентов: {new Intl.NumberFormat('ru-RU').format(componentsSum)} ₽
            </p>
          )}
        </section>
      )}

      {error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
          {error === 'SELF_COMPONENT' && 'Товар не может содержать сам себя'}
          {error === 'CYCLE_COMPONENT' && 'Обнаружен цикл в составе бандла'}
          {error === 'component_not_found' && 'Один из компонентов не найден'}
          {!['SELF_COMPONENT', 'CYCLE_COMPONENT', 'component_not_found'].includes(error) && error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={props.onCancel}
          className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="rounded bg-indigo-600 dark:bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
        >
          {pending ? 'Сохранение…' : props.mode === 'edit' ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </form>
  );
}