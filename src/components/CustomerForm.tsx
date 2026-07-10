'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateCustomer } from '@/lib/customers';
import type { Customer } from '@prisma/client';

export function CustomerForm({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [ok, setOk] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      name:     String(fd.get('name') ?? ''),
      website:  String(fd.get('website') ?? '') || undefined,
      industry: String(fd.get('industry') ?? '') || undefined,
    };
    start(async () => {
      const res = await updateCustomer(customer.id, input);
      if (res.ok) {
        setErrors({});
        setOk(true);
        router.refresh();
      } else {
        setOk(false);
        setErrors(res.fieldErrors ?? {});
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-4">
      <Field name="name"     label="Название"  required defaultValue={customer.name}                            errors={errors.name} />
      <Field name="website"  label="Сайт (URL)"             defaultValue={customer.website ?? ''}                  errors={errors.website} />
      <Field name="industry" label="Отрасль"                defaultValue={customer.industry ?? ''}                 errors={errors.industry} />

      {ok && (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">Сохранено.</p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="rounded bg-indigo-600 dark:bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
        >
          {pending ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}

function Field({
  name, label, type = 'text', defaultValue, required, errors,
}: {
  name: string; label: string; type?: string; defaultValue?: string; required?: boolean; errors?: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700 dark:text-zinc-300">
        {label}{required && <span className="text-rose-600"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={Boolean(errors && errors.length > 0)}
        className={`rounded border px-3 py-2 outline-none focus:ring-1 ${
          errors && errors.length > 0
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
            : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
        } bg-white dark:bg-zinc-950`}
      />
      {errors && errors.length > 0 && (
        <span className="text-xs text-rose-600 dark:text-rose-400">{errors.join(', ')}</span>
      )}
    </label>
  );
}