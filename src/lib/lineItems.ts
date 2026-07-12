'use server';

import { safeRevalidate } from './revalidate';
import { getTenantPrisma } from '@/lib/auth/session';
import {
  lineItemCreateSchema,
  lineItemUpdateSchema,
  discountInputSchema,
  type LineItemCreateInput,
  type LineItemUpdateInput,
  type DiscountInput,
} from './validators';
import type { Result } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recalcAndApplyAmount(tx: any, opportunityId: string): Promise<void> {
  const items: { quantity: number; unitPrice: number }[] = await tx.lineItem.findMany({
    where: { opportunityId },
    select: { quantity: true, unitPrice: true },
  });
  if (items.length === 0) {
    await tx.opportunity.update({
      where: { id: opportunityId },
      data: { amount: null, discount: null },
    });
    return;
  }
  const subtotal = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  const opp = await tx.opportunity.findFirst({
    where: { id: opportunityId },
    select: { discount: true },
  });
  const discount = opp?.discount ?? 0;
  const amount = Math.max(0, subtotal - discount);
  await tx.opportunity.update({
    where: { id: opportunityId },
    data: { amount },
  });
}

function revalidateOpp(opportunityId: string): void {
  safeRevalidate('/opportunities');
  safeRevalidate(`/opportunities/${opportunityId}`);
  safeRevalidate('/dashboard');
}

export async function addLineItem(input: LineItemCreateInput): Promise<Result<void>> {
  const p = lineItemCreateSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  const db = await getTenantPrisma();
  try {
    await db.$transaction(async (tx) => {
      const [opp, product] = await Promise.all([
        tx.opportunity.findFirst({ where: { id: p.data.opportunityId } }),
        tx.product.findFirst({ where: { id: p.data.productId } }),
      ]);
      if (!opp) throw new Error('opportunity_not_found');
      if (!product) throw new Error('product_not_found');
      await tx.lineItem.create({
        data: {
          opportunityId: p.data.opportunityId,
          productId: p.data.productId,
          quantity: p.data.quantity,
          unitPrice: product.price,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });
      await recalcAndApplyAmount(tx, p.data.opportunityId);
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
  revalidateOpp(p.data.opportunityId);
  return { ok: true, data: undefined };
}

export async function updateLineItem(id: string, input: LineItemUpdateInput): Promise<Result<void>> {
  const p = lineItemUpdateSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  const db = await getTenantPrisma();
  let opportunityId: string | null = null;
  try {
    await db.$transaction(async (tx) => {
      const existing = await tx.lineItem.findFirst({ where: { id } });
      if (!existing) throw new Error('not_found');
      opportunityId = existing.opportunityId;
      await tx.lineItem.update({
        where: { id },
        data: {
          ...(p.data.quantity !== undefined ? { quantity: p.data.quantity } : {}),
          ...(p.data.unitPrice !== undefined ? { unitPrice: p.data.unitPrice } : {}),
        },
      });
      await recalcAndApplyAmount(tx, opportunityId);
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
  if (opportunityId) revalidateOpp(opportunityId);
  return { ok: true, data: undefined };
}

export async function removeLineItem(id: string): Promise<Result<void>> {
  const db = await getTenantPrisma();
  let opportunityId: string | null = null;
  try {
    await db.$transaction(async (tx) => {
      const existing = await tx.lineItem.findFirst({ where: { id } });
      if (!existing) throw new Error('not_found');
      opportunityId = existing.opportunityId;
      await tx.lineItem.delete({ where: { id } });
      await recalcAndApplyAmount(tx, opportunityId);
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
  if (opportunityId) revalidateOpp(opportunityId);
  return { ok: true, data: undefined };
}

export async function updateDiscount(input: DiscountInput): Promise<Result<void>> {
  const p = discountInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  const db = await getTenantPrisma();
  try {
    await db.$transaction(async (tx) => {
      const [opp, items] = await Promise.all([
        tx.opportunity.findFirst({ where: { id: p.data.opportunityId } }),
        tx.lineItem.findMany({
          where: { opportunityId: p.data.opportunityId },
          select: { quantity: true, unitPrice: true },
        }),
      ]);
      if (!opp) throw new Error('opportunity_not_found');
      if (items.length === 0) throw new Error('discount_requires_lineitems');
      const subtotal: number = items.reduce((s: number, it: { quantity: number; unitPrice: number }) => s + it.unitPrice * it.quantity, 0);
      if (p.data.discount !== null && p.data.discount > subtotal) {
        throw new Error('discount_exceeds_subtotal');
      }
      await tx.opportunity.update({
        where: { id: p.data.opportunityId },
        data: { discount: p.data.discount },
      });
      await recalcAndApplyAmount(tx, p.data.opportunityId);
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
  revalidateOpp(p.data.opportunityId);
  return { ok: true, data: undefined };
}