'use server';

import { Prisma } from '@prisma/client';
import { safeRevalidate } from './revalidate';
import { getTenantPrisma } from '@/lib/auth/session';
import { contactInputSchema, type ContactInput } from './validators';
import type { Paginated, ListFilters, Result } from './types';
import type { Contact } from '@prisma/client';

type ContactWithCustomer = Prisma.ContactGetPayload<{
  include: { customer: { select: { id: true; name: true } } };
}>;

export async function createContact(input: ContactInput): Promise<Result<Contact>> {
  const p = contactInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  try {
    const db = await getTenantPrisma();
    const contact = await db.contact.create({
      data: {
        name:       p.data.name,
        email:      p.data.email || null,
        phone:      p.data.phone || null,
        role:       p.data.role || null,
        accountId:  p.data.customerId && p.data.customerId !== '' ? p.data.customerId : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
    safeRevalidate('/contacts');
    safeRevalidate('/dashboard');
    return { ok: true, data: contact };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (msg.includes('Unique constraint') && msg.includes('email')) {
      return { ok: false, fieldErrors: { email: ['Contact с таким email уже существует'] } };
    }
    return { ok: false, message: msg };
  }
}

export async function updateContact(id: string, input: ContactInput): Promise<Result<Contact>> {
  const p = contactInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  try {
    const db = await getTenantPrisma();
    const existing = await db.contact.findFirst({ where: { id } });
    if (!existing) return { ok: false, error: 'not_found' };
    const contact = await db.contact.update({
      where: { id },
      data: {
        name:      p.data.name,
        email:     p.data.email || null,
        phone:     p.data.phone || null,
        role:      p.data.role || null,
        accountId: p.data.customerId && p.data.customerId !== '' ? p.data.customerId : null,
      },
    });
    safeRevalidate('/contacts');
    safeRevalidate(`/contacts/${id}`);
    safeRevalidate('/dashboard');
    return { ok: true, data: contact };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (msg.includes('Unique constraint') && msg.includes('email')) {
      return { ok: false, fieldErrors: { email: ['Contact с таким email уже существует'] } };
    }
    return { ok: false, message: msg };
  }
}

export async function getContact(id: string) {
  const db = await getTenantPrisma();
  return db.contact.findFirst({
    where: { id },
    include: {
      customer:      true,
      opportunities: { include: { stage: true }, orderBy: { createdAt: 'desc' } },
    },
  });
}

export async function getContacts(
  f: ListFilters & { customerId?: string } = {}
): Promise<Paginated<ContactWithCustomer>> {
  const { q, customerId, page = 1, limit = 50 } = f;
  const andClauses: Record<string, unknown>[] = [];
  if (q) {
    andClauses.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
      ],
    });
  }
  if (customerId) andClauses.push({ accountId: customerId });
  const where = andClauses.length > 0 ? { AND: andClauses } : {};
  const db = await getTenantPrisma();
  const [items, total] = await Promise.all([
    db.contact.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { customer: { select: { id: true, name: true } } },
    }),
    db.contact.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}