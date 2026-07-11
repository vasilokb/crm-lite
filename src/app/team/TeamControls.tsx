'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { changeRole, removeMember, cancelInvite } from '@/app/actions/team';
import { createInvite } from '@/app/actions/workspace';

export function InviteForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ link: string; email: string } | null>(null);

  function close(): void {
    setOpen(false);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(formData: FormData): Promise<void> {
    setError(null);
    const email = String(formData.get('email') ?? '').trim();
    const role = (String(formData.get('role') ?? 'member') === 'owner' ? 'owner' : 'member') as
      | 'owner'
      | 'member';
    start(async () => {
      try {
        const result = await createInvite(email, role);
        setSuccess({ link: result.link, email });
        router.refresh();
      } catch (e) {
        if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e;
        setError(e instanceof Error ? e.message : 'Не удалось отправить приглашение');
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded bg-indigo-600 dark:bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-600"
      >
        + Пригласить сотрудника
      </button>
    );
  }

  return (
    <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Новое приглашение</h3>
        <button
          type="button"
          onClick={close}
          aria-label="Закрыть"
          className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xl leading-none"
        >
          ×
        </button>
      </div>

      <form action={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">
            Email сотрудника <span className="text-rose-600">*</span>
          </span>
          <input
            name="email"
            type="email"
            required
            placeholder="ivan@example.com"
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Роль</span>
          <select
            name="role"
            defaultValue="member"
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="member">Участник</option>
            <option value="owner">Владелец</option>
          </select>
        </label>

        {error && (
          <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
            {error}
          </p>
        )}
        {success && (
          <div className="rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Приглашение для <strong>{success.email}</strong> создано.
              {process.env.NEXT_PUBLIC_RESEND_API_KEY
                ? ' Письмо отправлено.'
                : ' Ссылка для принятия:'}
            </p>
            {!process.env.NEXT_PUBLIC_RESEND_API_KEY && (
              <p className="mt-1 break-all text-xs font-mono text-emerald-800 dark:text-emerald-200">
                {success.link}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Закрыть
          </button>
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="rounded bg-emerald-600 dark:bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50"
          >
            {pending ? 'Отправляем…' : 'Создать приглашение'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function MembersTable({
  members,
  currentUserId,
  isOwner,
}: {
  members: Array<{
    id: string;
    role: 'owner' | 'member';
    user: { id: string; name: string | null; email: string };
  }>;
  currentUserId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRoleChange(membershipId: string, role: 'owner' | 'member'): void {
    setError(null);
    start(async () => {
      try {
        await changeRole(membershipId, role);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось изменить роль');
      }
    });
  }

  function handleRemove(membershipId: string): void {
    setError(null);
    if (!confirm('Исключить участника?')) return;
    start(async () => {
      try {
        await removeMember(membershipId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось исключить');
      }
    });
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2 font-medium">Имя</th>
            <th className="py-2 font-medium">Email</th>
            <th className="py-2 font-medium">Роль</th>
            {isOwner && <th className="py-2 font-medium text-right">Действия</th>}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const isSelf = m.user.id === currentUserId;
            return (
              <tr key={m.id} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-2">
                  {(() => {
                    const n = m.user.name?.trim();
                    const display = n && n !== m.user.email ? n : null;
                    return display ?? <span className="text-zinc-400 dark:text-zinc-500">Имя не указано</span>;
                  })()}
                </td>
                <td className="py-2 text-zinc-600 dark:text-zinc-400">{m.user.email}</td>
                <td className="py-2">
                  {isOwner && !isSelf ? (
                    <select
                      defaultValue={m.role}
                      disabled={pending}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as 'owner' | 'member')}
                      className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-xs"
                    >
                      <option value="owner">владелец</option>
                      <option value="member">участник</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.role === 'owner'
                          ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {m.role === 'owner' ? 'владелец' : 'участник'}
                    </span>
                  )}
                </td>
                {isOwner && (
                  <td className="py-2 text-right">
                    {isSelf ? (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">(это вы)</span>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleRemove(m.id)}
                        className="rounded border border-rose-300 dark:border-rose-800 px-2 py-1 text-xs text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50"
                      >
                        Исключить
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function InvitesList({
  invites,
  isOwner,
  currentUserId,
}: {
  invites: Array<{
    id: string;
    email: string;
    role: 'owner' | 'member';
    expiresAt: Date;
    token: string;
  }>;
  isOwner: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCancel(id: string): void {
    setError(null);
    start(async () => {
      try {
        await cancelInvite(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось отменить');
      }
    });
  }

  function handleCopy(token: string): void {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${baseUrl}/invite/${token}`;
    void navigator.clipboard?.writeText(link).catch(() => undefined);
  }

  if (invites.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Нет висящих приглашений
      </p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {invites.map((inv) => (
          <li key={inv.id} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="text-sm text-zinc-900 dark:text-zinc-50 truncate">{inv.email}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {inv.role === 'owner' ? 'владелец' : 'участник'} · до{' '}
                {new Date(inv.expiresAt).toLocaleDateString('ru-RU')}
              </p>
            </div>
            {isOwner && (
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleCopy(inv.token)}
                  className="rounded border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  Копировать ссылку
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleCancel(inv.id)}
                  className="rounded border border-rose-300 dark:border-rose-800 px-2 py-1 text-xs text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50"
                >
                  Отменить
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}