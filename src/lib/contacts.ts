'use server';

import { Prisma } from '@prisma/client';
import { safeRevalidate } from './revalidate';
import { prisma } from './db';
import { contactInputSchema, type ContactInput } from './validators';
import type { Paginated, ListFilters, Result } from './types';
import type { Contact } from '@prisma/client';

type ContactWithAccount = Prisma.ContactGetPayload<{
  include: { account: { select: { id: true; name: true } } };
}>;

export async function createContact(input: ContactInput): Promise<Result<Contact>> {
  const p = contactInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  try {
    const contact = await prisma.contact.create({
      data: {
        name:      p.data.name,
        email:     p.data.email || null,
        phone:     p.data.phone || null,
        role:      p.data.role || null,
        accountId: p.data.accountId && p.data.accountId !== '' ? p.data.accountId : null,
      },
    });
    safeRevalidate('/contacts');
    safeRevalidate('/dashboard');
    return { ok: true, data: contact };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (msg.includes('Unique constraint') && msg.includes('email')) {
      return { ok: false, fieldErrors: { email: ['Contact Р РЋР С“ Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂР В РЎВ email Р РЋРЎвЂњР В Р’В¶Р В Р’Вµ Р РЋР С“Р РЋРЎвЂњР РЋРІР‚В°Р В Р’ВµР РЋР С“Р РЋРІР‚С™Р В Р вЂ Р РЋРЎвЂњР В Р’ВµР РЋРІР‚С™'] } };
    }
    return { ok: false, message: msg };
  }
}

export async function updateContact(id: string, input: ContactInput): Promise<Result<Contact>> {
  const p = contactInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  try {
    const contact = await prisma.contact.update({
      where: { id },
      data: {
        name:      p.data.name,
        email:     p.data.email || null,
        phone:     p.data.phone || null,
        role:      p.data.role || null,
        accountId: p.data.accountId && p.data.accountId !== '' ? p.data.accountId : null,
      },
    });
    safeRevalidate('/contacts');
    safeRevalidate(`/contacts/${id}`);
    safeRevalidate('/dashboard');
    return { ok: true, data: contact };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (msg.includes('Unique constraint') && msg.includes('email')) {
      return { ok: false, fieldErrors: { email: ['Contact Р РЋР С“ Р РЋРІР‚С™Р В Р’В°Р В РЎвЂќР В РЎвЂР В РЎВ email Р РЋРЎвЂњР В Р’В¶Р В Р’Вµ Р РЋР С“Р РЋРЎвЂњР РЋРІР‚В°Р В Р’ВµР РЋР С“Р РЋРІР‚С™Р В Р вЂ Р РЋРЎвЂњР В Р’ВµР РЋРІР‚С™'] } };
    }
    return { ok: false, message: msg };
  }
}

export async function getContact(id: string) {
  return prisma.contact.findUnique({
    where: { id },
    include: {
      account:       true,
      opportunities: { include: { stage: true }, orderBy: { createdAt: 'desc' } },
    },
  });
}

export async function getContacts(
  f: ListFilters & { accountId?: string } = {}
): Promise<Paginated<ContactWithAccount>> {
  const { q, accountId, page = 1, limit = 50 } = f;
  const andClauses: Record<string, unknown>[] = [];
  if (q) {
    andClauses.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
      ],
    });
  }
  if (accountId) andClauses.push({ accountId });
  const where = andClauses.length > 0 ? { AND: andClauses } : {};
  const [items, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { account: { select: { id: true, name: true } } },
    }),
    prisma.contact.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
