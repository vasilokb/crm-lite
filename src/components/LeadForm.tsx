'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateLead } from '@/lib/leads';
import type { Lead } from '@prisma/client';

const SOURCE_OPTIONS = ['site', 'email', 'phone', 'referral', 'manual'] as const;
const STATUS_OPTIONS = ['new', 'processed', 'converted'] as const;

export function LeadForm({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [ok, setOk] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sourceRaw = String(fd.get('source') ?? 'manual');
    const statusRaw = String(fd.get('status') ?? 'new');
    const input = {
      name:     String(fd.get('name') ?? ''),
      email:    String(fd.get('email') ?? '') || undefined,
      phone:    String(fd.get('phone') ?? '') || undefined,
      company:  String(fd.get('company') ?? '') || undefined,
      source:   (SOURCE_OPTIONS as readonly string[]).includes(sourceRaw)
        ? (sourceRaw as 'site' | 'email' | 'phone' | 'referral' | 'manual')
        : 'manual',
      status:   (STATUS_OPTIONS as readonly string[]).includes(statusRaw)
        ? (statusRaw as 'new' | 'processed' | 'converted')
        : 'new',
      budget:   fd.get('budget') ? Number(fd.get('budget')) : undefined,
      timeline: String(fd.get('timeline') ?? '') || undefined,
      comment:  String(fd.get('comment') ?? '') || undefined,
    };
    start(async () => {
      const res = await updateLead(lead.id, input);
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
      <Field name="name" label="Имя" defaultValue={lead.name} required errors={errors.name} />
      <Field name="email" label="Email" type="email" defaultValue={lead.email ?? ''} errors={errors.email} />
      <Field name="phone" label="Телефон" defaultValue={lead.phone ?? ''} errors={errors.phone} />
      <Field name="company" label="Компания" defaultValue={lead.company ?? ''} errors={errors.company} />

      <Select name="source" label="Источник" defaultValue={lead.source} options={[...SOURCE_OPTIONS]} errors={errors.source} />
      <Select name="status" label="Статус"  defaultValue={lead.status} options={[...STATUS_OPTIONS]} errors={errors.status} />

      <Field name="budget"   label="Бюджет"     type="number" defaultValue={lead.budget?.toString() ?? ''} errors={errors.budget} />
      <Field name="timeline" label="Сроки"                       defaultValue={lead.timeline ?? ''}        errors={errors.timeline} />
      <Field name="comment"  label="Комментарий" rows={4}        defaultValue={lead.comment ?? ''}         errors={errors.comment} />

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
  name, label, type = 'text', defaultValue, required, rows, errors,
}: {
  name: string; label: string; type?: string; defaultValue?: string; required?: boolean; rows?: number; errors?: string[];
}) {
  const Tag = rows ? 'textarea' : 'input';
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700 dark:text-zinc-300">
        {label}{required && <span className="text-rose-600"> *</span>}
      </span>
      <Tag
        name={name}
        type={rows ? undefined : type}
        rows={rows}
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

function Select({
  name, label, defaultValue, options, errors,
}: {
  name: string; label: string; defaultValue: string; options: readonly string[]; errors?: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        aria-invalid={Boolean(errors && errors.length > 0)}
        className={`rounded border px-3 py-2 outline-none focus:ring-1 ${
          errors && errors.length > 0
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
            : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
        } bg-white dark:bg-zinc-950`}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      {errors && errors.length > 0 && (
        <span className="text-xs text-rose-600 dark:text-rose-400">{errors.join(', ')}</span>
      )}
    </label>
  );
}