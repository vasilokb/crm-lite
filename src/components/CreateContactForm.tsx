'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createContact } from '@/lib/contacts';
import { Drawer } from '@/components/Drawer';
import { DrawerHeader } from '@/components/DrawerHeader';
import type { Customer } from '@prisma/client';

export function CreateContactForm({ customers }: { customers: Customer[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const router = useRouter();

  function close(): void {
    setOpen(false);
    setError(null);
    setFieldErrors(null);
  }

  async function handleSubmit(formData: FormData): Promise<void> {
    setError(null);
    setFieldErrors(null);
    const input = {
      name:       String(formData.get('name') ?? ''),
      email:      String(formData.get('email') ?? '') || undefined,
      phone:      String(formData.get('phone') ?? '') || undefined,
      role:       String(formData.get('role') ?? '') || undefined,
      customerId: String(formData.get('customerId') ?? '') || undefined,
    };
    start(async () => {
      const result = await createContact(input);
      if (!result.ok) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        } else {
          setError(result.message ?? 'Не удалось создать контакт');
        }
        return;
      }
      close();
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded bg-indigo-600 dark:bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-600"
      >
        + Новый контакт
      </button>
    );
  }

  return (
    <Drawer onClose={close}>
      <DrawerHeader entity="contact" title="Новый контакт" />
      <form action={handleSubmit} className="flex flex-col gap-4 px-6 py-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">
            Имя <span className="text-rose-600">*</span>
          </span>
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            placeholder="Например, Анна Иванова"
            aria-invalid={Boolean(fieldErrors?.name)}
            className={`rounded border px-3 py-2 outline-none focus:ring-1 ${
              fieldErrors?.name
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
            } bg-white dark:bg-zinc-950`}
          />
          {fieldErrors?.name?.map((e, i) => (
            <p key={i} className="text-xs text-rose-600 dark:text-rose-400">{e}</p>
          ))}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            name="email"
            type="email"
            placeholder="email@example.com"
            aria-invalid={Boolean(fieldErrors?.email)}
            className={`rounded border px-3 py-2 outline-none focus:ring-1 ${
              fieldErrors?.email
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
            } bg-white dark:bg-zinc-950`}
          />
          {fieldErrors?.email?.map((e, i) => (
            <p key={i} className="text-xs text-rose-600 dark:text-rose-400">{e}</p>
          ))}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Телефон</span>
          <input
            name="phone"
            placeholder="+7 999 123-45-67"
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Должность</span>
          <input
            name="role"
            placeholder="Например, CFO"
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Компания</span>
          <select
            name="customerId"
            defaultValue=""
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— без компании —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        {error && (
          <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">{error}</p>
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
  );
}