'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { convertLead } from '@/lib/convertLead';

type Props = {
  leadId: string;
  leadStatus: string;
  defaultAccountName?: string;
};

export function ConvertLeadAccordion({
  leadId,
  leadStatus,
  defaultAccountName = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const [success, setSuccess] = useState<{
    accountId: string;
    contactId: string;
    opportunityId: string | null;
  } | null>(null);
  const router = useRouter();

  // Если лид уже сконвертирован — кнопки Convert нет, только сообщение
  // (parent-компонент также может скрывать).
  if (leadStatus === 'converted' && !success) {
    return (
      <div className="mt-4 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
        Лид уже сконвертирован.
      </div>
    );
  }

  // После успешной конвертации — ссылки на созданные сущности.
  if (success) {
    return (
      <div className="mt-4 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 space-y-1">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          Лид сконвертирован. Созданы:
        </p>
        <Link
          href={`/accounts/${success.accountId}`}
          className="block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          → Account
        </Link>
        <Link
          href={`/contacts/${success.contactId}`}
          className="block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          → Contact
        </Link>
        {success.opportunityId && (
          <Link
            href={`/opportunities/${success.opportunityId}`}
            className="block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            → Opportunity
          </Link>
        )}
      </div>
    );
  }

  function handleSubmit(formData: FormData): void {
    setError(null);
    setFieldErrors(null);
    const input = {
      accountName:       String(formData.get('accountName') ?? ''),
      contactName:       String(formData.get('contactName') ?? ''),
      contactEmail:      String(formData.get('contactEmail') ?? '') || undefined,
      contactPhone:      String(formData.get('contactPhone') ?? '') || undefined,
      createOpportunity: formData.get('createOpportunity') === 'on',
      opportunityTitle:  String(formData.get('opportunityTitle') ?? '') || undefined,
      opportunityAmount: formData.get('opportunityAmount')
        ? Number(formData.get('opportunityAmount'))
        : undefined,
    };
    start(async () => {
      const result = await convertLead(leadId, input);
      if (!result.ok) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        } else if (result.error) {
          setError(result.error);
        } else {
          setError('unknown');
        }
        return;
      }
      setSuccess({
        accountId:    result.accountId,
        contactId:    result.contactId,
        opportunityId: result.opportunityId,
      });
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded bg-indigo-600 dark:bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-600"
        >
          Convert lead
        </button>
      </div>
    );
  }

  function describeError(code: string): string {
    switch (code) {
      case 'lead_already_converted':
        return 'Лид уже сконвертирован.';
      case 'lead_not_found':
        return 'Лид не найден.';
      default:
        return 'Не удалось сохранить изменения, попробуйте позже.';
    }
  }

  return (
    <details open className="mt-4 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Convert lead (раскрыто)
      </summary>

      <form action={handleSubmit} className="mt-3 space-y-3">
        <label className="block text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">
            Название компании <span className="text-rose-600">*</span>
          </span>
          <input
            name="accountName"
            required
            minLength={1}
            maxLength={200}
            defaultValue={defaultAccountName}
            placeholder="Например, ООО «Гамма»"
            aria-invalid={Boolean(fieldErrors?.accountName)}
            className={`mt-1 block w-full rounded border px-3 py-2 outline-none focus:ring-1 ${
              fieldErrors?.accountName
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
            } bg-white dark:bg-zinc-950`}
          />
          {fieldErrors?.accountName?.map((e, i) => (
            <p key={i} className="mt-1 text-xs text-rose-600 dark:text-rose-400">{e}</p>
          ))}
        </label>

        <label className="block text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">
            Имя контакта <span className="text-rose-600">*</span>
          </span>
          <input
            name="contactName"
            required
            minLength={1}
            maxLength={120}
            className={`mt-1 block w-full rounded border px-3 py-2 outline-none focus:ring-1 ${
              fieldErrors?.contactName
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
            } bg-white dark:bg-zinc-950`}
          />
          {fieldErrors?.contactName?.map((e, i) => (
            <p key={i} className="mt-1 text-xs text-rose-600 dark:text-rose-400">{e}</p>
          ))}
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            name="contactEmail"
            type="email"
            placeholder="email"
            aria-invalid={Boolean(fieldErrors?.contactEmail)}
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <input
            name="contactPhone"
            placeholder="телефон"
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" name="createOpportunity" />
          Создать сделку
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            name="opportunityTitle"
            placeholder="Название сделки"
            aria-invalid={Boolean(fieldErrors?.opportunityTitle)}
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <input
            name="opportunityAmount"
            type="number"
            step="0.01"
            min="0"
            placeholder="Сумма"
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        {fieldErrors?.opportunityTitle?.map((e, i) => (
          <p key={i} className="text-xs text-rose-600 dark:text-rose-400">{e}</p>
        ))}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
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
            {pending ? 'Сохранение…' : 'Конвертировать'}
          </button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
            {describeError(error)}
          </p>
        )}
      </form>
    </details>
  );
}