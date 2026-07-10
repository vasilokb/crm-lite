'use server';

import { Prisma } from '@prisma/client';
import { safeRevalidate } from './revalidate';
import { getTenantPrisma } from '@/lib/auth/session';
import { customerInputSchema, type CustomerInput } from './validators';
import type { Paginated, ListFilters, Result } from './types';
import type { Customer } from '@prisma/client';

type CustomerWithCounts = Prisma.CustomerGetPayload<{
  include: { _count: { select: { contacts: true; opportunities: true } } };
}>;

export async function createCustomer(input: CustomerInput): Promise<Result<Customer>> {
  const p = customerInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  try {
    const db = await getTenantPrisma();
const customer = await db.customer.create({
      data: {
        name:     p.data.name,
        website:  p.data.website || null,
        industry: p.data.industry || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
    safeRevalidate('/customers');
    safeRevalidate('/dashboard');
    return { ok: true, data: customer };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (msg.includes('Unique constraint') && msg.includes('name')) {
      return { ok: false, fieldErrors: { name: ['Customer с таким названием уже существует'] } };
    }
    return { ok: false, message: msg };
  }
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<Result<Customer>> {
  const p = customerInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  try {
    const db = await getTenantPrisma();
    const existing = await db.customer.findFirst({ where: { id } });
    if (!existing) return { ok: false, error: 'not_found' };
    const customer = await db.customer.update({
      where: { id },
      data: {
        name:     p.data.name,
        website:  p.data.website || null,
        industry: p.data.industry || null,
      },
    });
    safeRevalidate('/customers');
    safeRevalidate(`/customers/${id}`);
    safeRevalidate('/dashboard');
    return { ok: true, data: customer };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (msg.includes('Unique constraint') && msg.includes('name')) {
      return { ok: false, fieldErrors: { name: ['Customer с таким названием уже существует'] } };
    }
    return { ok: false, message: msg };
  }
}

export async function getCustomer(id: string) {
  const db = await getTenantPrisma();
  return db.customer.findFirst({
    where: { id },
    include: {
      contacts:      { orderBy: { name: 'asc' } },
      opportunities: { orderBy: { createdAt: 'desc' }, include: { stage: true } },
    },
  });
}

export async function getCustomers(f: ListFilters = {}): Promise<Paginated<CustomerWithCounts>> {
  const { q, page = 1, limit = 50 } = f;
  const where = q ? { name: { contains: q, mode: 'insensitive' as const } } : {};
  const db = await getTenantPrisma();
  const [items, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { contacts: true, opportunities: true } } },
    }),
    db.customer.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}