'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createOpportunity } from '@/lib/opportunities';
import { Drawer } from '@/components/Drawer';
import { DrawerHeader } from '@/components/DrawerHeader';
import type { Stage, Account, Contact } from '@prisma/client';

type Props = {
  stages: Stage[];
  accounts: Account[];
  contacts: Contact[];
};

export function CreateOpportunityForm({ stages, accounts, contacts }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const router = useRouter();

  function reset(): void {
    setError(null);
    setFieldErrors(null);
  }

  function close(): void {
    setOpen(false);
    reset();
  }

  async function handleSubmit(formData: FormData): Promise<void> {
    reset();
    const input = {
      title:     String(formData.get('title') ?? ''),
      amount:    formData.get('amount') ? Number(formData.get('amount')) : undefined,
      stageId:   String(formData.get('stageId') ?? stages[0]?.id ?? ''),
      accountId: formData.get('accountId') ? String(formData.get('accountId')) : undefined,
      contactId: formData.get('contactId') ? String(formData.get('contactId')) : undefined,
    };
    start(async () => {
      const result = await createOpportunity(input);
      if (!result.ok) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        } else {
          setError('Не удалось создать сделку');
        }
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  if (stages.length === 0) {
    return (
      <p className="text-sm text-rose-700 dark:text-rose-400">
        Справочник стадий пуст — выполните <code className="font-mono">npm run db:seed</code>.
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded bg-indigo-600 dark:bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-600"
      >
        + Новая сделка
      </button>

      {open && (
        <Drawer onClose={close}>
          <DrawerHeader entity="opportunity" title="Новая сделка" />
          <form action={handleSubmit} className="flex flex-col gap-4 px-6 py-4">
            <Field
              name="title"
              label="Название"
              required
              placeholder="Например, Стенд «Гамма-Авто 2026»"
              errors={fieldErrors?.title}
            />

            <Field
              name="amount"
              label="Сумма, ₽"
              type="number"
              placeholder="0"
              errors={fieldErrors?.amount}
            />

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">
                Стадия <span className="text-rose-600">*</span>
              </span>
              <select
                name="stageId"
                required
                defaultValue={stages[0].id}
                className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {fieldErrors?.stageId?.map((e, i) => (
                <p key={i} className="text-xs text-rose-600 dark:text-rose-400">{e}</p>
              ))}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">Компания</span>
              <select
                name="accountId"
                defaultValue=""
                className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">— без компании —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">Контакт</span>
              <select
                name="contactId"
                defaultValue=""
                className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">— без контакта —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            {error && (
              <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={pending}
                aria-busy={pending}
                className="rounded bg-emerald-600 dark:bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50"
              >
                {pending ? 'Создание…' : 'Создать'}
              </button>
            </div>
          </form>
        </Drawer>
      )}
    </>
  );
}

function Field({
  name,
  label,
  type = 'text',
  required,
  placeholder,
  errors,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  errors?: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        aria-invalid={Boolean(errors && errors.length > 0)}
        className={`rounded border px-3 py-2 outline-none focus:ring-1 ${
          errors && errors.length > 0
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
            : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
        } bg-white dark:bg-zinc-950`}
      />
      {errors && errors.length > 0 && (
        <span className="text-xs text-rose-600 dark:text-rose-400">
          {errors.join(', ')}
        </span>
      )}
    </label>
  );
}