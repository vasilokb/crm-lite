'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createLead } from '@/lib/leads';
import { createAccount } from '@/lib/accounts';
import { createContact } from '@/lib/contacts';
import { Drawer } from '@/components/Drawer';
import { DrawerHeader } from '@/components/DrawerHeader';
import type { Account, Contact } from '@prisma/client';

type Props = {
  accounts: Account[];
  contacts: Contact[];
};

const SOURCE_OPTIONS = ['site', 'email', 'phone', 'referral', 'manual'] as const;
const STATUS_OPTIONS = ['new', 'processed'] as const;

export function CreateLeadForm({ accounts: initialAccounts, contacts: initialContacts }: Props) {
  const [open, setOpen] = useState(false);
  const [subOpen, setSubOpen] = useState<'account' | 'contact' | null>(null);

  // Локальные списки — обновляются при успешном inline-create,
  // чтобы селектор сразу содержал новую запись без router.refresh().
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);

  // Auto-selected значения после inline-create.
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  // true = выбран режим «свободный ввод» (input под select)
  const [customCompanyMode, setCustomCompanyMode] = useState(false);

  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const router = useRouter();

  // При открытии Drawer — синхронизируем списки со свежими props
  // (на случай если router.refresh() обновил accounts/contacts).
  // При закрытии — сбрасываем selection.
  useEffect(() => {
    if (open) {
      setAccounts(initialAccounts);
      setContacts(initialContacts);
    } else {
      setSelectedAccountId('');
      setSelectedContactId('');
      setCustomCompanyMode(false);
      setError(null);
      setFieldErrors(null);
    }
  }, [open, initialAccounts, initialContacts]);

  function close(): void {
    setOpen(false);
    setSubOpen(null);
  }

  function closeSub(): void {
    setSubOpen(null);
  }

  async function handleSubmit(formData: FormData): Promise<void> {
    setError(null);
    setFieldErrors(null);

    const budgetRaw = formData.get('budget');
    const sourceRaw = String(formData.get('source') ?? 'manual');
    const statusRaw = String(formData.get('status') ?? 'new');

    // company: либо ID существующего Account, либо свободный текст
    const companySelect = String(formData.get('companySelect') ?? '');
    const companyText   = String(formData.get('companyText')   ?? '').trim();
    const company = companySelect && companySelect !== '__custom__'
      ? accounts.find((a) => a.id === companySelect)?.name ?? companyText
      : companyText;

    const input = {
      name:     String(formData.get('name') ?? ''),
      email:    String(formData.get('email') ?? '') || undefined,
      phone:    String(formData.get('phone') ?? '') || undefined,
      company:  company || undefined,
      source:   (SOURCE_OPTIONS as readonly string[]).includes(sourceRaw)
        ? (sourceRaw as 'site' | 'email' | 'phone' | 'referral' | 'manual')
        : 'manual',
      status:   (STATUS_OPTIONS as readonly string[]).includes(statusRaw)
        ? (statusRaw as 'new' | 'processed')
        : 'new',
      budget:   budgetRaw && String(budgetRaw).length > 0 ? Number(budgetRaw) : undefined,
      timeline: String(formData.get('timeline') ?? '') || undefined,
      comment:  String(formData.get('comment') ?? '') || undefined,
    };

    start(async () => {
      const result = await createLead(input);
      if (!result.ok) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        } else {
          setError(result.message ?? 'Не удалось создать лид');
        }
        return;
      }
      close();
      router.refresh();
    });
  }

  // Inline create Account — внутри sub-Drawer.
  // Закрываем sub-Drawer СРАЗУ (не дожидаясь server action) —
  // пользователь сразу возвращается в main Drawer.
  async function handleCreateAccount(formData: FormData): Promise<void> {
    const input = {
      name:     String(formData.get('name') ?? ''),
      website:  String(formData.get('website') ?? '') || undefined,
      industry: String(formData.get('industry') ?? '') || undefined,
    };
    setSubOpen(null);
    start(async () => {
      const result = await createAccount(input);
      if (!result.ok) return;
      const newId = result.data.id;
      setAccounts((prev) => (prev.find((a) => a.id === newId) ? prev : [...prev, result.data]));
      setSelectedAccountId(newId);
      setCustomCompanyMode(false);
      router.refresh();
    });
  }

  // Inline create Contact — внутри sub-Drawer.
  async function handleCreateContact(formData: FormData): Promise<void> {
    const accountIdRaw = String(formData.get('accountId') ?? '');
    const input = {
      name:      String(formData.get('name') ?? ''),
      email:     String(formData.get('email') ?? '') || undefined,
      phone:     String(formData.get('phone') ?? '') || undefined,
      role:      String(formData.get('role') ?? '') || undefined,
      accountId: accountIdRaw || undefined,
    };
    setSubOpen(null);
    start(async () => {
      const result = await createContact(input);
      if (!result.ok) return;
      const newId = result.data.id;
      setContacts((prev) => (prev.find((c) => c.id === newId) ? prev : [...prev, result.data]));
      setSelectedContactId(newId);
      router.refresh();
    });
  }

  // ── Closed state: только кнопка «+ Новый лид» ───────────────────────
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded bg-indigo-600 dark:bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-600"
      >
        + Новый лид
      </button>
    );
  }

  // ── Sub-Drawer: Создать Account ──────────────────────────────────────
  if (subOpen === 'account') {
    return (
      <Drawer onClose={closeSub}>
        <DrawerHeader entity="account" title="Новая компания" />
        <form action={handleCreateAccount} className="flex flex-col gap-4 px-6 py-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">
              Название <span className="text-rose-600">*</span>
            </span>
            <input
              name="name"
              required
              minLength={2}
              maxLength={200}
              placeholder="Например, ООО «Гамма»"
              className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Сайт (URL)</span>
            <input
              name="website"
              type="url"
              placeholder="https://example.com"
              className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Отрасль</span>
            <input
              name="industry"
              maxLength={100}
              placeholder="Например, events"
              className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeSub}
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

  // ── Sub-Drawer: Создать Contact ──────────────────────────────────────
  if (subOpen === 'contact') {
    return (
      <Drawer onClose={closeSub}>
        <DrawerHeader entity="contact" title="Новый контакт" />
        <form action={handleCreateContact} className="flex flex-col gap-4 px-6 py-4">
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
              className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Email</span>
            <input
              name="email"
              type="email"
              placeholder="email@example.com"
              className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
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
              maxLength={100}
              placeholder="Например, CFO"
              className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
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
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeSub}
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

  // ── Main Drawer: Новый лид ──────────────────────────────────────────
  return (
    <Drawer onClose={close}>
      <DrawerHeader entity="lead" title="Новый лид" />
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
            placeholder="Например, Иван Сидоров"
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

        <div className="grid grid-cols-2 gap-2">
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
        </div>

        {/* Компания: select + custom input + кнопка создать */}
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Компания</span>
          <div className="flex gap-2">
            <select
              id="companySelect"
              name="companySelect"
              key={`company-${selectedAccountId}-${accounts.length}`}
              value={selectedAccountId}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedAccountId(v);
                setCustomCompanyMode(v === '__custom__');
              }}
              className="flex-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">— выбрать из списка —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
              <option value="__custom__">— свободный ввод —</option>
            </select>
            <button
              type="button"
              onClick={() => setSubOpen('account')}
              className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap"
            >
              + Создать
            </button>
          </div>
          <input
            name="companyText"
            disabled={!customCompanyMode}
            placeholder="Или введите название вручную…"
            maxLength={200}
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 disabled:bg-zinc-100 dark:disabled:bg-zinc-900"
          />
        </div>

        {/* Контакт: select + кнопка создать */}
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Контакт</span>
          <div className="flex gap-2">
            <select
              name="contactId"
              key={`contact-${selectedContactId}-${contacts.length}`}
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="flex-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">— без контакта —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSubOpen('contact')}
              className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap"
            >
              + Создать
            </button>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Контакт сохранится в БД, но связь с лидом будет установлена через Convert Lead.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">
              Источник <span className="text-rose-600">*</span>
            </span>
            <select
              name="source"
              required
              defaultValue="manual"
              className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="manual">Вручную</option>
              <option value="site">Сайт</option>
              <option value="email">Email</option>
              <option value="phone">Телефон</option>
              <option value="referral">Рекомендация</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Статус</span>
            <select
              name="status"
              defaultValue="new"
              className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="new">Новая</option>
              <option value="processed">В работе</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Бюджет, ₽</span>
            <input
              name="budget"
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              aria-invalid={Boolean(fieldErrors?.budget)}
              className={`rounded border px-3 py-2 outline-none focus:ring-1 ${
                fieldErrors?.budget
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                  : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500'
              } bg-white dark:bg-zinc-950`}
            />
            {fieldErrors?.budget?.map((e, i) => (
              <p key={i} className="text-xs text-rose-600 dark:text-rose-400">{e}</p>
            ))}
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Сроки</span>
            <input
              name="timeline"
              maxLength={200}
              placeholder="Например, до конца квартала"
              className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Комментарий</span>
          <textarea
            name="comment"
            maxLength={2000}
            rows={3}
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
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