'use server';

import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import { getCurrentUser, getCurrentOrgId } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function switchWorkspace(organizationId: string) {
  const user = await getCurrentUser();
  const m = await prisma.membership.findFirst({
    where: { userId: user.id, organizationId, status: 'active' },
  });
  if (!m) throw new Error('FORBIDDEN');
  await prisma.session.updateMany({
    where: { userId: user.id, expires: { gt: new Date() } },
    data: { activeOrganizationId: organizationId },
  });
  revalidatePath('/', 'layout');
}

export async function createInvite(
  email: string,
  role: 'owner' | 'member',
): Promise<{ link: string }> {
  const organizationId = await getCurrentOrgId();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 864e5);
  await prisma.inviteToken.create({
    data: { organizationId, email, role, token, expiresAt },
  });

  const baseUrl = process.env.AUTH_URL ?? 'http://localhost:3001';
  const link = `${baseUrl}/invite/${token}`;

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'no-reply@demo.agency',
      to: email,
      subject: 'Приглашение в CRM-lite',
      html: `<p>Вас пригласили в CRM-lite.</p><p><a href="${link}">Принять приглашение</a></p>`,
    });
  } else {
    console.log('[dev] invite link:', link);
  }

  return { link };
}