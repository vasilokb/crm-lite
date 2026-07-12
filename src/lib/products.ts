'use server';

import { Prisma } from '@prisma/client';
import { safeRevalidate } from './revalidate';
import { getTenantPrisma } from '@/lib/auth/session';
import { productInputSchema, type ProductInput } from './validators';
import type { Paginated, ListFilters, Result } from './types';
import type { Product } from '@prisma/client';

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    components: { include: { component: { select: { id: true; name: true; price: true; sku: true } } } };
    partOfBundles: { include: { bundle: { select: { id: true; name: true } } } };
    _count: { select: { lineItems: true } };
  };
}>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertNoCycleForBundle(tx: any, bundleId: string, componentIds: string[]): Promise<void> {
  const ids = new Set(componentIds);
  if (ids.has(bundleId)) throw new Error('SELF_COMPONENT');
  for (const start of componentIds) {
    const seen = new Set<string>();
    let cursor: string | null = start;
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      const parents: { bundleId: string }[] = await tx.productComponent.findMany({
        where: { componentId: cursor },
        select: { bundleId: true },
      });
      if (parents.some((pc: { bundleId: string }) => pc.bundleId === bundleId)) {
        throw new Error('CYCLE_COMPONENT');
      }
      cursor = parents[0]?.bundleId ?? null;
    }
  }
}

function aggregateComponents(items: { componentId: string; quantity: number }[]): Map<string, number> {
  const acc = new Map<string, number>();
  for (const it of items) acc.set(it.componentId, (acc.get(it.componentId) ?? 0) + it.quantity);
  return acc;
}

export async function createProduct(input: ProductInput): Promise<Result<Product>> {
  const p = productInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  const components = p.data.components ?? [];
  const db = await getTenantPrisma();
  try {
    return await db.$transaction(async (tx) => {
      // B5-revised: для бандла price = Σ компонентов (вычисляем здесь, из формы игнорируем).
      // Для простого продукта — price из формы (обязателен по Zod superRefine).
      let finalPrice: number;
      if (components.length > 0) {
        const componentIds = components.map((c) => c.componentId);
        const found = await tx.product.findMany({
          where: { id: { in: componentIds } },
          select: { id: true, price: true },
        });
        if (found.length !== new Set(componentIds).size) throw new Error('component_not_found');
        await assertNoCycleForBundle(tx, '__pending__', componentIds);
        const priceById = new Map(found.map((f) => [f.id, f.price]));
        const agg = aggregateComponents(components);
        let sum = 0;
        for (const [componentId, quantity] of agg) {
          sum += (priceById.get(componentId) ?? 0) * quantity;
        }
        finalPrice = sum;
      } else {
        finalPrice = p.data.price as number; // Zod superRefine гарантирует наличие
      }

      const product = await tx.product.create({
        data: {
          name: p.data.name,
          description: p.data.description || null,
          price: finalPrice,
          sku: p.data.sku || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });
      if (components.length > 0) {
        const componentIds = components.map((c) => c.componentId);
        await assertNoCycleForBundle(tx, product.id, componentIds);
        const agg = aggregateComponents(components);
        for (const [componentId, quantity] of agg) {
          await tx.productComponent.create({
            data: { bundleId: product.id, componentId, quantity },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any);
          }
      }
      safeRevalidate('/products');
      return { ok: true as const, data: product };
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (msg.includes('Unique constraint') && msg.includes('name')) {
      return { ok: false, fieldErrors: { name: ['Product с таким названием уже существует'] } };
    }
    if (msg === 'SELF_COMPONENT' || msg === 'CYCLE_COMPONENT' || msg === 'component_not_found') {
      return { ok: false, error: msg };
    }
    return { ok: false, message: msg };
  }
}

export async function updateProduct(id: string, input: ProductInput): Promise<Result<Product>> {
  const p = productInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  const replaceComponents = p.data.components !== undefined;
  const components = p.data.components ?? [];
  const db = await getTenantPrisma();
  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.product.findFirst({ where: { id } });
      if (!existing) throw new Error('not_found');

      // B5-revised: для бандла price = Σ компонентов, из формы игнорируем.
      let finalPrice: number;
      if (replaceComponents && components.length > 0) {
        const componentIds = components.map((c) => c.componentId);
        const found = await tx.product.findMany({
          where: { id: { in: componentIds } },
          select: { id: true, price: true },
        });
        if (found.length !== new Set(componentIds).size) throw new Error('component_not_found');
        const priceById = new Map(found.map((f) => [f.id, f.price]));
        const agg = aggregateComponents(components);
        let sum = 0;
        for (const [componentId, quantity] of agg) {
          sum += (priceById.get(componentId) ?? 0) * quantity;
        }
        finalPrice = sum;
      } else if (replaceComponents && components.length === 0) {
        // Бандл → простой (или пустой бандл): цена из формы (Zod требует, т.к. нет components).
        finalPrice = p.data.price as number;
      } else {
        // Композиция состава не менялась — цену не трогаем, чтобы не обнулить ручную.
        finalPrice = existing.price;
      }

      const product = await tx.product.update({
        where: { id },
        data: {
          name: p.data.name,
          description: p.data.description || null,
          price: finalPrice,
          sku: p.data.sku || null,
        },
      });
      if (replaceComponents) {
        await tx.productComponent.deleteMany({ where: { bundleId: id } });
        if (components.length > 0) {
          const componentIds = components.map((c) => c.componentId);
          await assertNoCycleForBundle(tx, id, componentIds);
          const agg = aggregateComponents(components);
          for (const [componentId, quantity] of agg) {
            await tx.productComponent.create({ data: { bundleId: id, componentId, quantity },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);
          }
        }
      }
      safeRevalidate('/products');
      safeRevalidate(`/products/${id}`);
      return { ok: true as const, data: product };
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (msg === 'not_found') return { ok: false, error: 'not_found' };
    if (msg.includes('Unique constraint') && msg.includes('name')) {
      return { ok: false, fieldErrors: { name: ['Product с таким названием уже существует'] } };
    }
    if (msg === 'SELF_COMPONENT' || msg === 'CYCLE_COMPONENT' || msg === 'component_not_found') {
      return { ok: false, error: msg };
    }
    return { ok: false, message: msg };
  }
}

export async function getProduct(id: string): Promise<ProductWithRelations | null> {
  const db = await getTenantPrisma();
  return (await db.product.findFirst({
    where: { id },
    include: {
      components: {
        include: { component: { select: { id: true, name: true, price: true, sku: true } } },
        orderBy: { id: 'asc' },
      },
      partOfBundles: { include: { bundle: { select: { id: true, name: true } } } },
      _count: { select: { lineItems: true } },
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any;
}

export async function getProducts(f: ListFilters = {}): Promise<Paginated<ProductWithRelations>> {
  const { q, page = 1, limit = 50 } = f;
  const where = q ? { name: { contains: q, mode: 'insensitive' as const } } : {};
  const db = await getTenantPrisma();
  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        components: { include: { component: { select: { id: true, name: true, price: true } } } },
        partOfBundles: { include: { bundle: { select: { id: true, name: true } } } },
        _count: { select: { lineItems: true } },
      },
    }),
    db.product.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function searchProducts(q: string): Promise<Paginated<ProductWithRelations>> {
  return getProducts({ q, page: 1, limit: 10 });
}