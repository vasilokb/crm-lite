'use server';
import { AuthError } from 'next-auth';
import { signIn } from '@/auth';

export type LoginResult = { error?: string };

export async function loginAction(
  _prev: LoginResult | undefined,
  formData: FormData,
): Promise<LoginResult> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const from = String(formData.get('from') ?? '/dashboard') || '/dashboard';

  if (!email || !password) {
    return { error: 'Введите email и пароль' };
  }

  try {
    await signIn('credentials', { email, password, redirectTo: from });
    return {};
  } catch (e) {
    // NEXT_REDIRECT — это нормальный успех (signIn кидает redirect внутри)
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e;
    if (e instanceof AuthError) {
      return { error: 'Неверный email или пароль' };
    }
    throw e;
  }
}