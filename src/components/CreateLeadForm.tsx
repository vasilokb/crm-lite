'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createLead } from '@/lib/leads';
import { createCustomer } from '@/lib/customers';
import { createContact } from '@/lib/contacts';
import { Drawer } from '@/components/Drawer';
import { DrawerHeader } from '@/components/DrawerHeader';
import type { Customer, Contact } from '@prisma/client';

type Props = {
  customers: Customer[];
  contacts: Contact[];
};

const SOURCE_OPTIONS = ['site', 'email', 'phone', 'referral', 'manual'] as const;
const STATUS_OPTIONS = ['new', 'processed'] as const;

export function CreateLeadForm({ customers: initialCustomers, contacts: initialContacts }: Props) {
  const [open, setOpen] = useState(false);
  const [subOpen, setSubOpen] = useState<'customer' | 'contact' | null>(null);

  // Локальные списки — обновляются при успешном inline-create,
  // чтобы селектор сразу содержал новую запись без router.refresh().
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);

  // Auto-selected значения после inline-create.
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  // true = выбран режим «свободный ввод» (input под select)
  const [customCompanyMode, setCustomCompanyMode] = useState(false);

  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const router = useRouter();

  // При открытии Drawer — синхронизируем списки со свежими props
  // (на случай если router.refresh() обновил customers/contacts).
  // При закрытии — сбрасываем selection.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCustomers(initialCustomers);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContacts(initialContacts);
    } else {
      setSelectedCustomerId('');
      setSelectedContactId('');
      setCustomCompanyMode(false);
      setError(null);
      setFieldErrors(null);
    }
  }, [open, initialCustomers, initialContacts]);

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

    // company: либо ID существующего Customer, либо свободный текст
    const companySelect = String(formData.get('companySelect') ?? '');
    const companyText   = String(formData.get('companyText')   ?? '').trim();
    const company = companySelect && companySelect !== '__custom__'
      ? customers.find((c) => c.id === companySelect)?.name ?? companyText
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

  // Inline create Customer — внутри sub-Drawer.
  // Закрываем sub-Drawer СРАЗУ (не дожидаясь server action) —
  // пользователь сразу возвращается в main Drawer.
  async function handleCreateCustomer(formData: FormData): Promise<void> {
    const input = {
      name:     String(formData.get('name') ?? ''),
      website:  String(formData.get('website') ?? '') || undefined,
      industry: String(formData.get('industry') ?? '') || undefined,
    };
    setSubOpen(null);
    start(async () => {
      const result = await createCustomer(input);
      if (!result.ok) return;
      const newId = result.data.id;
      setCustomers((prev) => (prev.find((c) => c.id === newId) ? prev : [...prev, result.data]));
      setSelectedCustomerId(newId);
      setCustomCompanyMode(false);
      router.refresh();
    });
  }

  // Inline create Contact — внутри sub-Drawer.
  async function handleCreateContact(formData: FormData): Promise<void> {
    const customerIdRaw = String(formData.get('customerId') ?? '');
    const input = {
      name:       String(formData.get('name') ?? ''),
      email:      String(formData.get('email') ?? '') || undefined,
      phone:      String(formData.get('phone') ?? '') || undefined,
      role:       String(formData.get('role') ?? '') || undefined,
      customerId: customerIdRaw || undefined,
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

  // ── Sub-Drawer: Создать Customer ──────────────────────────────────────
  if (subOpen === 'customer') {
    return (
      <Drawer onClose={closeSub}>
        <DrawerHeader entity="customer" title="Новая компания" />
        <form action={handleCreateCustomer} className="flex flex-col gap-4 px-6 py-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
              key={`customer-${selectedCustomerId}-${customers.length}`}
              value={selectedCustomerId}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedCustomerId(v);
                setCustomCompanyMode(v === '__custom__');
              }}
              className="flex-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">— выбрать из списка —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="__custom__">— свободный ввод —</option>
            </select>
            <button
              type="button"
              onClick={() => setSubOpen('customer')}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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