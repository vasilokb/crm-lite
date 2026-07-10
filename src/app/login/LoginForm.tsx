'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction, type LoginResult } from './action';

export function LoginForm({ from = '/dashboard' }: { from?: string }) {
  const [state, formAction, pending] = useActionState<LoginResult | undefined, FormData>(
    loginAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="from" value={from} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">
          Email <span className="text-rose-600">*</span>
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={Boolean(state?.error)}
          className={`rounded border px-3 py-2 outline-none focus:ring-1 ${
            state?.error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
              : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
          } bg-white dark:bg-zinc-950`}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">
          Пароль <span className="text-rose-600">*</span>
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={Boolean(state?.error)}
          className={`rounded border px-3 py-2 outline-none focus:ring-1 ${
            state?.error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
              : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
          } bg-white dark:bg-zinc-950`}
        />
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="rounded bg-indigo-600 dark:bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
      >
        {pending ? 'Входим…' : 'Войти'}
      </button>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Нет аккаунта?{' '}
        <Link href="/register" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          Зарегистрировать компанию
        </Link>
      </p>
    </form>
  );
}