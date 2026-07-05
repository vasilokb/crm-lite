'use server';

import { safeRevalidate } from './revalidate';
import { prisma } from './db';
import { accountInputSchema, type AccountInput } from './validators';
import type { Paginated, ListFilters, Result } from './types';
import type { Account } from '@prisma/client';

export async function createAccount(input: AccountInput): Promise<Result<Account>> {
  const p = accountInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  try {
    const account = await prisma.account.create({
      data: {
        name:     p.data.name,
        website:  p.data.website || null,
        industry: p.data.industry || null,
      },
    });
    safeRevalidate('/accounts');
    safeRevalidate('/dashboard');
    return { ok: true, data: account };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (msg.includes('Unique constraint') && msg.includes('name')) {
      return { ok: false, fieldErrors: { name: ['Account СЃ С‚Р°РєРёРј РёРјРµРЅРµРј СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚'] } };
    }
    return { ok: false, message: msg };
  }
}

export async function updateAccount(id: string, input: AccountInput): Promise<Result<Account>> {
  const p = accountInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  try {
    const account = await prisma.account.update({
      where: { id },
      data: {
        name:     p.data.name,
        website:  p.data.website || null,
        industry: p.data.industry || null,
      },
    });
    safeRevalidate('/accounts');
    safeRevalidate(`/accounts/${id}`);
    safeRevalidate('/dashboard');
    return { ok: true, data: account };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown';
    if (msg.includes('Unique constraint') && msg.includes('name')) {
      return { ok: false, fieldErrors: { name: ['Account СЃ С‚Р°РєРёРј РёРјРµРЅРµРј СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚'] } };
    }
    return { ok: false, message: msg };
  }
}

export async function getAccount(id: string) {
  return prisma.account.findUnique({
    where: { id },
    include: {
      contacts:      { orderBy: { name: 'asc' } },
      opportunities: { orderBy: { createdAt: 'desc' }, include: { stage: true } },
    },
  });
}

export async function getAccounts(f: ListFilters = {}): Promise<Paginated<Account>> {
  const { q, page = 1, limit = 50 } = f;
  const where = q ? { name: { contains: q, mode: 'insensitive' as const } } : {};
  const [items, total] = await Promise.all([
    prisma.account.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { contacts: true, opportunities: true } } },
    }),
    prisma.account.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}