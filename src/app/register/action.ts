'use server';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { signIn } from '@/auth';

export type RegisterResult = { error?: string };

export async function registerAction(
  _prev: RegisterResult | undefined,
  formData: FormData,
): Promise<RegisterResult> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const companyName = String(formData.get('companyName') ?? '').trim();

  if (!email || !password || !companyName) {
    return { error: 'Заполните все поля' };
  }
  if (password.length < 6) {
    return { error: 'Пароль должен быть не короче 6 символов' };
  }

  // slug: Unicode-safe + случайный суффикс для глобальной уникальности
  const slug =
    companyName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}-]/gu, '')
      .slice(0, 40) +
    '-' +
    Math.random().toString(36).slice(2, 8);

  try {
    // Транзакция: User + Organization + Membership (БЕЗ Session!)
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: bcrypt.hashSync(password, 10),
          name: email,
        },
      });
      const org = await tx.organization.create({
        data: { name: companyName, slug },
      });
      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: 'owner',
          status: 'active',
        },
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { error: 'Пользователь с таким email уже существует' };
    }
    throw e;
  }

  // signIn создаёт Session; session-callback авто-заполнит activeOrganizationId.
  await signIn('credentials', { email, password, redirectTo: '/dashboard' });
  // redirect выполняется внутри signIn (бросает NEXT_REDIRECT) — сюда не дойдём.
  redirect('/dashboard');
}