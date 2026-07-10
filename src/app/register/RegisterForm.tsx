'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerAction, type RegisterResult } from './action';

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterResult | undefined, FormData>(
    registerAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">
          Название компании <span className="text-rose-600">*</span>
        </span>
        <input
          name="companyName"
          required
          minLength={2}
          maxLength={200}
          placeholder="Например, ООО «Гамма»"
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
          Ваш email <span className="text-rose-600">*</span>
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
          minLength={6}
          autoComplete="new-password"
          aria-invalid={Boolean(state?.error)}
          className={`rounded border px-3 py-2 outline-none focus:ring-1 ${
            state?.error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
              : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
          } bg-white dark:bg-zinc-950`}
        />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Не короче 6 символов
        </span>
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
        {pending ? 'Создаём…' : 'Зарегистрировать'}
      </button>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Уже есть аккаунт?{' '}
        <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">
          Войти
        </Link>
      </p>
    </form>
  );
}