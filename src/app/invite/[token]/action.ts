'use server';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { signIn } from '@/auth';

export type InviteAcceptResult = { error?: string };

export async function acceptInviteAction(
  _prev: InviteAcceptResult | undefined,
  formData: FormData,
): Promise<InviteAcceptResult> {
  const token = String(formData.get('token') ?? '');
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const name = String(formData.get('name') ?? '').trim();

  if (!token || !email || !password || !name) {
    return { error: 'Заполните все поля' };
  }
  if (password.length < 6) {
    return { error: 'Пароль должен быть не короче 6 символов' };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const t = await tx.inviteToken.findFirst({
        where: { token, expiresAt: { gt: new Date() } },
      });
      if (!t) throw new Error('invite_invalid');
      if (t.email !== email) {
        throw new Error('invite_email_mismatch');
      }

      // find-or-create user
      const passwordHash = bcrypt.hashSync(password, 10);
      const user = await tx.user.upsert({
        where: { email },
        update: { passwordHash, name },
        create: { email, name, passwordHash },
      });

      // ensure membership (upsert — идемпотентно при повторном принятии)
      await tx.membership.upsert({
        where: { userId_organizationId: { userId: user.id, organizationId: t.organizationId } },
        update: { status: 'active', role: t.role },
        create: {
          userId: user.id,
          organizationId: t.organizationId,
          role: t.role,
          status: 'active',
        },
      });

      // аннулировать токен (повторное использование → invite_invalid)
      await tx.inviteToken.delete({ where: { id: t.id } });
    }, { timeout: 30_000, maxWait: 10_000 });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'invite_invalid') {
        return { error: 'Приглашение недействительно или истекло' };
      }
      if (e.message === 'invite_email_mismatch') {
        return { error: 'Email не совпадает с приглашением' };
      }
    }
    throw e;
  }

  await signIn('credentials', { email, password, redirectTo: '/dashboard' });
  redirect('/dashboard');
}