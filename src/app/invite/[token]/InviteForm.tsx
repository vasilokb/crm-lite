'use client';

import { useActionState } from 'react';
import { acceptInviteAction, type InviteAcceptResult } from './action';
import { PasswordInput } from '@/components/PasswordInput';

type Props = {
  token: string;
  email: string;
};

export function InviteForm({ token, email }: Props) {
  const [state, formAction, pending] = useActionState<InviteAcceptResult | undefined, FormData>(
    acceptInviteAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">
          Email <span className="text-rose-600">*</span>
        </span>
        <input
          name="email"
          type="email"
          required
          defaultValue={email}
          readOnly={Boolean(email)}
          autoComplete="email"
          aria-invalid={Boolean(state?.error)}
          className={`rounded border px-3 py-2 outline-none focus:ring-1 ${
            state?.error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
              : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
          } bg-white dark:bg-zinc-950 ${email ? 'opacity-70' : ''}`}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">
          Имя <span className="text-rose-600">*</span>
        </span>
        <input
          name="name"
          required
          minLength={1}
          maxLength={120}
          placeholder="Иван Иванов"
          aria-invalid={Boolean(state?.error)}
          className={`rounded border px-3 py-2 outline-none focus:ring-1 ${
            state?.error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
              : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
          } bg-white dark:bg-zinc-950`}
        />
      </label>

      <PasswordInput
        name="password"
        label="Пароль"
        required
        minLength={6}
        autoComplete="new-password"
        errors={state?.error ? [state.error] : undefined}
      />
      <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Не короче 6 символов. Если у вас уже есть аккаунт с этим email — пароль будет обновлён.
      </p>

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
        {pending ? 'Принимаем…' : 'Принять приглашение'}
      </button>
    </form>
  );
}