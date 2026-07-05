'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateOpportunity } from '@/lib/opportunities';
import type { Opportunity } from '@prisma/client';

const STAGE_OPTIONS = ['qualification', 'proposal', 'negotiation', 'won', 'lost'] as const;
const STATUS_OPTIONS = ['open', 'won', 'lost'] as const;

export function OpportunityForm({
  opportunity,
  stages,
}: {
  opportunity: Opportunity;
  stages: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [ok, setOk] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input = {
      title:     String(fd.get('title') ?? ''),
      amount:    fd.get('amount') ? Number(fd.get('amount')) : undefined,
      stageId:   String(fd.get('stageId') ?? opportunity.stageId),
      accountId: opportunity.accountId ?? undefined,
      contactId: opportunity.contactId ?? undefined,
      dueDate:   fd.get('dueDate')
        ? new Date(String(fd.get('dueDate'))).toISOString()
        : undefined,
    };
    start(async () => {
      const res = await updateOpportunity(opportunity.id, input);
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
      <Field
        name="title"
        label="Название"
        required
        defaultValue={opportunity.title}
        errors={errors.title}
      />
      <Field
        name="amount"
        label="Сумма (₽)"
        type="number"
        defaultValue={opportunity.amount?.toString() ?? ''}
        errors={errors.amount}
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">Стадия</span>
        <select
          name="stageId"
          defaultValue={opportunity.stageId}
          className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">Статус</span>
        <select
          name="status"
          defaultValue={opportunity.status}
          className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <Field
        name="dueDate"
        label="Плановая дата"
        type="date"
        defaultValue={
          opportunity.dueDate
            ? new Date(opportunity.dueDate).toISOString().slice(0, 10)
            : ''
        }
      />

      {opportunity.reasonLost && (
        <p className="text-sm text-rose-600 dark:text-rose-400">
          Причина отказа: {opportunity.reasonLost}
        </p>
      )}

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