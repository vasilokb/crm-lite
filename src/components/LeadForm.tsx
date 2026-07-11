'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateLead } from '@/lib/leads';
import { createCustomer } from '@/lib/customers';
import { createContact } from '@/lib/contacts';
import { Drawer } from '@/components/Drawer';
import { DrawerHeader } from '@/components/DrawerHeader';
import type { Customer, Contact, Lead } from '@prisma/client';

const SOURCE_OPTIONS = [
  { value: 'site',     label: 'Сайт' },
  { value: 'email',    label: 'Email' },
  { value: 'phone',    label: 'Телефон' },
  { value: 'referral', label: 'Рекомендация' },
  { value: 'manual',   label: 'Вручную' },
] as const;

const STATUS_OPTIONS = [
  { value: 'new',       label: 'Новая' },
  { value: 'processed', label: 'В работе' },
  { value: 'converted', label: 'Конвертирована' },
] as const;

const SOURCE_VALUES = SOURCE_OPTIONS.map((s) => s.value) as readonly string[];
const STATUS_VALUES  = STATUS_OPTIONS.map((s) => s.value) as readonly string[];

type Props = {
  lead: Lead;
  customers: Customer[];
  contacts: Contact[];
};

export function LeadForm({ lead, customers: initialCustomers, contacts: initialContacts }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [ok, setOk] = useState(false);

  // Inline-create state (та же логика, что в CreateLeadForm)
  const [customers, setCustomers]               = useState<Customer[]>(initialCustomers);
  const [contacts, setContacts]                 = useState<Contact[]>(initialContacts);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
    // При открытии Drawer — найти Customer, имя которого совпадает с lead.company
    return initialCustomers.find((c) => c.name === lead.company)?.id ?? '';
  });
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [customCompanyMode, setCustomCompanyMode] = useState(false);
  const [subOpen, setSubOpen] = useState<'customer' | 'contact' | null>(null);

  const [pendingSub, startSub] = useTransition();

  function closeSub(): void {
    setSubOpen(null);
  }

  async function handleCreateCustomer(formData: FormData): Promise<void> {
    const input = {
      name:     String(formData.get('name') ?? ''),
      website:  String(formData.get('website') ?? '') || undefined,
      industry: String(formData.get('industry') ?? '') || undefined,
    };
    setSubOpen(null);
    startSub(async () => {
      const result = await createCustomer(input);
      if (!result.ok) return;
      const newId = result.data.id;
      setCustomers((prev) => (prev.find((c) => c.id === newId) ? prev : [...prev, result.data]));
      setSelectedCustomerId(newId);
      setCustomCompanyMode(false);
      router.refresh();
    });
  }

  async function handleCreateContact(formData: FormData): Promise<void> {
    const customerIdRaw = String(formData.get('customerId') ?? '');
    const input = {
      name:       String(formData.get('name') ?? ''),
      email:      String(formData.get('email') ?? '') || undefined,
      phone:      String(formData.get('phone') ?? '') || undefined,
      role:       String(formData.get('role') ?? '') || undefined,
      customerId: customerIdRaw || selectedCustomerId || undefined,
    };
    setSubOpen(null);
    startSub(async () => {
      const result = await createContact(input);
      if (!result.ok) return;
      const newId = result.data.id;
      setContacts((prev) => (prev.find((c) => c.id === newId) ? prev : [...prev, result.data]));
      setSelectedContactId(newId);
      router.refresh();
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sourceRaw = String(fd.get('source') ?? 'manual');
    const statusRaw = String(fd.get('status') ?? 'new');

    // company: ID существующего Customer ИЛИ свободный текст
    const companySelect = String(fd.get('customerSelect') ?? '');
    const companyText   = String(fd.get('companyText')   ?? '').trim();
    const company = companySelect && companySelect !== '__custom__'
      ? customers.find((c) => c.id === companySelect)?.name ?? companyText
      : companyText;

    const input = {
      name:     String(fd.get('name') ?? ''),
      email:    String(fd.get('email') ?? '') || undefined,
      phone:    String(fd.get('phone') ?? '') || undefined,
      company:  company || undefined,
      source:   (SOURCE_VALUES as readonly string[]).includes(sourceRaw)
        ? (sourceRaw as 'site' | 'email' | 'phone' | 'referral' | 'manual')
        : 'manual',
      status:   (STATUS_VALUES as readonly string[]).includes(statusRaw)
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

  // Sub-Drawer: Создать Customer
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
            <button type="button" onClick={closeSub} className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Отмена
            </button>
            <button type="submit" disabled={pendingSub} aria-busy={pendingSub} className="rounded bg-emerald-600 dark:bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50">
              {pendingSub ? 'Создание…' : 'Создать'}
            </button>
          </div>
        </form>
      </Drawer>
    );
  }

  // Sub-Drawer: Создать Contact
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
              name="customerId"
              defaultValue={selectedCustomerId}
              className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">— без компании —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeSub} className="rounded border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Отмена
            </button>
            <button type="submit" disabled={pendingSub} aria-busy={pendingSub} className="rounded bg-emerald-600 dark:bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50">
              {pendingSub ? 'Создание…' : 'Создать'}
            </button>
          </div>
        </form>
      </Drawer>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-4">
      <Field
        name="name"
        label="Имя"
        defaultValue={lead.name}
        required
        errors={errors.name}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field name="email" label="Email" type="email" defaultValue={lead.email ?? ''} errors={errors.email} />
        <Field name="phone" label="Телефон" defaultValue={lead.phone ?? ''} errors={errors.phone} />
      </div>

      {/* Компания: select + custom input + кнопка создать */}
      <div className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">Компания</span>
        <div className="flex gap-2">
          <select
            id="customerSelect"
            name="customerSelect"
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
        <SelectField
          name="source"
          label="Источник"
          defaultValue={lead.source}
          options={SOURCE_OPTIONS}
          errors={errors.source}
        />
        <SelectField
          name="status"
          label="Статус"
          defaultValue={lead.status}
          options={STATUS_OPTIONS}
          errors={errors.status}
        />
      </div>

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

type Option = { value: string; label: string };

function SelectField({
  name, label, defaultValue, options, errors,
}: {
  name: string; label: string; defaultValue: string; options: readonly Option[]; errors?: string[];
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
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {errors && errors.length > 0 && (
        <span className="text-xs text-rose-600 dark:text-rose-400">{errors.join(', ')}</span>
      )}
    </label>
  );
}