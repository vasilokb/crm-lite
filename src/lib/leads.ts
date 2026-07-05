'use server';

import { safeRevalidate } from './revalidate';
import { prisma } from './db';
import {
  leadInputSchema,
  leadUpdateSchema,
  type LeadInput,
  type LeadUpdate,
} from './validators';
import type { Paginated, ListFilters, Result } from './types';
import type { Lead } from '@prisma/client';

export async function createLead(input: LeadInput): Promise<Result<Lead>> {
  const p = leadInputSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  const lead = await prisma.lead.create({
    data: {
      name:     p.data.name,
      email:    p.data.email || null,
      phone:    p.data.phone || null,
      company:  p.data.company || null,
      source:   p.data.source,
      status:   p.data.status ?? 'new',
      budget:   typeof p.data.budget === 'number' ? p.data.budget : null,
      timeline: p.data.timeline || null,
      comment:  p.data.comment || null,
    },
  });
  safeRevalidate('/leads');
  safeRevalidate('/dashboard');
  return { ok: true, data: lead };
}

export async function updateLead(id: string, input: LeadUpdate): Promise<Result<Lead>> {
  const p = leadUpdateSchema.safeParse(input);
  if (!p.success) return { ok: false, fieldErrors: p.error.flatten().fieldErrors };
  const data: Record<string, unknown> = {};
  if (p.data.name !== undefined) data.name = p.data.name;
  if (p.data.email !== undefined) data.email = p.data.email || null;
  if (p.data.phone !== undefined) data.phone = p.data.phone || null;
  if (p.data.company !== undefined) data.company = p.data.company || null;
  if (p.data.source !== undefined) data.source = p.data.source;
  if (p.data.status !== undefined) data.status = p.data.status;
  if (p.data.budget !== undefined) {
    data.budget = typeof p.data.budget === 'number' ? p.data.budget : null;
  }
  if (p.data.timeline !== undefined) data.timeline = p.data.timeline || null;
  if (p.data.comment !== undefined) data.comment = p.data.comment || null;

  const lead = await prisma.lead.update({ where: { id }, data });
  safeRevalidate('/leads');
  safeRevalidate(`/leads/${id}`);
  safeRevalidate('/dashboard');
  return { ok: true, data: lead };
}

export async function getLead(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      opportunity: { include: { account: true, contact: true } },
    },
  });
}

export async function getLeads(
  f: ListFilters & { source?: string; status?: string } = {}
): Promise<Paginated<Lead>> {
  const { q, source, status, page = 1, limit = 50 } = f;
  const andClauses: Record<string, unknown>[] = [];
  if (q) {
    andClauses.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { company: { contains: q, mode: 'insensitive' as const } },
      ],
    });
  }
  if (source) andClauses.push({ source: source as never });
  if (status) andClauses.push({ status: status as never });

  const where = andClauses.length > 0 ? { AND: andClauses } : {};
  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}