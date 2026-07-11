# Phase 8 — Convert Lead: Accordion + $transaction · B+F

> Детальный план для фазы 8 из `../Plan.md` §10. Открывается агентом непосредственно перед фазой 8.
>
> **Контекст для агента (M15):** прочитай [`../../docs/final-mvp.md`](../../docs/final-mvp.md) §6 + `../Plan.md` §6.2.

## 1. Zod-схема (`src/lib/validators.ts`)

```ts
export const convertLeadSchema = z.object({
  accountName:       z.string().trim().min(1).max(200),   // D12 — ОБЯЗАТЕЛЬНОЕ, без fallback
  contactName:       z.string().trim().min(1).max(120),
  contactEmail:      z.string().trim().email().optional().or(z.literal('')),
  contactPhone:      z.string().trim().min(3).max(40).optional().or(z.literal('')),
  createOpportunity: z.boolean(),
  opportunityTitle:  z.string().trim().min(1).max(200).optional(),
  opportunityAmount: z.number().positive().optional(),
}).refine(
  (v) => !v.createOpportunity || !!v.opportunityTitle?.trim(),
  { message: 'opportunityTitle обязателен при createOpportunity=true', path: ['opportunityTitle'] },
);

export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
```

## 2. Server action (`src/lib/convertLead.ts`)

```ts
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { convertLeadSchema, ConvertLeadInput } from './validators';

export async function convertLead(leadId: string, rawInput: unknown) {
  // Шаг 1 — Zod-валидация ДО транзакции (D14: не открываем транзакцию для невалидных данных)
  const parsed = convertLeadSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const input: ConvertLeadInput = parsed.data;

  // Шаг 2 — атомарная транзакция
  try {
    return await prisma.$transaction(async (tx) => {
      // (a) UX-проверка статуса (НЕ защита от race)
      const lead = await tx.lead.findUnique({ where: { id: leadId } });
      if (!lead) return { ok: false as const, error: 'lead_not_found' };
      if (lead.status === 'converted') return { ok: false as const, error: 'lead_already_converted' };

      // (b) Account: upsert по обязательному accountName
      const account = await tx.account.upsert({
        where: { name: input.accountName },
        update: {},
        create: { name: input.accountName },
      });

      // (c) Contact
      const contact = await tx.contact.create({
        data: {
          name: input.contactName,
          email: input.contactEmail || null,
          phone: input.contactPhone || null,
          accountId: account.id,
        },
      });

      // (d) Opportunity (опц.) — здесь сработает UNIQUE INDEX на leadId при race
      let opportunity: { id: string } | null = null;
      if (input.createOpportunity && input.opportunityTitle) {
        const qualificationStage = await tx.stage.findUnique({ where: { name: 'qualification' } });
        if (!qualificationStage) throw new Error('Stage qualification not found');
        opportunity = await tx.opportunity.create({
          data: {
            title: input.opportunityTitle,
            amount: input.opportunityAmount ?? null,
            accountId: account.id,
            contactId: contact.id,
            leadId: lead.id,
            stageId: qualificationStage.id,
          },
        });
      }

      // (e) Lead → converted
      await tx.lead.update({
        where: { id: leadId },
        data: { status: 'converted' },
      });

      // (f) Инвалидация кэша (D13)
      revalidatePath('/leads');
      revalidatePath(`/leads/${leadId}`);
      revalidatePath('/dashboard');

      return {
        ok: true as const,
        accountId: account.id,
        contactId: contact.id,
        opportunityId: opportunity?.id ?? null,
      };
    });
  } catch (err) {
    // Защита от race (D14): уникальный индекс на Opportunity.leadId
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { ok: false as const, error: 'lead_already_converted' };
    }
    throw err;
  }
}
```

## 3. Accordion-форма (`src/components/ConvertLeadAccordion.tsx`)

```tsx
'use client';
import { useState, useTransition } from 'react';
import { convertLead } from '@/lib/convertLead';

type Props = {
  leadId: string;
  defaultAccountName?: string;  // из Lead.company (D12)
};

export function ConvertLeadAccordion({ leadId, defaultAccountName }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    start(async () => {
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
      const result = await convertLead(leadId, input);
      if (!result.ok) setError(result.error ?? 'unknown');
      else setOpen(false);
    });
  }

  if (!open) {
    return <button onClick={() => setOpen(true)}>Convert lead</button>;
  }

  return (
    <details open>
      <summary>Convert lead</summary>
      <form action={handleSubmit}>
        <input name="accountName"  defaultValue={defaultAccountName ?? ''} required minLength={1} maxLength={200} placeholder="Название компании" />
        <input name="contactName"  required minLength={1} maxLength={120} placeholder="Имя контакта" />
        <input name="contactEmail" type="email" placeholder="email" />
        <input name="contactPhone" placeholder="телефон" />
        <label><input type="checkbox" name="createOpportunity" /> Создать сделку</label>
        <input name="opportunityTitle" placeholder="Название сделки" />
        <input name="opportunityAmount" type="number" step="0.01" min="0" placeholder="Сумма" />
        <button type="submit" disabled={pending}>{pending ? 'Сохранение…' : 'Конвертировать'}</button>
        {error && <p role="alert">Ошибка: {error}</p>}
      </form>
    </details>
  );
}
```

## 4. Тест-критерии (D14 — race)

### 4.1 Успешный путь
```bash
tsx -e "
import { convertLead } from './src/lib/convertLead';
import { prisma } from './src/lib/db';
const lead = await prisma.lead.findFirst({ where: { status: 'new' } });
if (!lead) throw new Error('no new lead');
const result = await convertLead(lead.id, {
  accountName: 'Test Account ' + Date.now(),
  contactName: 'Test Contact',
  createOpportunity: false,
});
console.log(result);
"
```
Ожидание: `{ ok: true, accountId, contactId, opportunityId: null }`.

### 4.2 Атомарность при ошибке
Удалить Stage `qualification` перед конвертацией → `prisma.$transaction` откатывается → лид остаётся `new`, Account/Contact не создаются.

### 4.3 Race (D14 — критичный)
```bash
tsx -e "
import { convertLead } from './src/lib/convertLead';
import { prisma } from './src/lib/db';
const lead = await prisma.lead.findFirst({ where: { status: 'new' } });
const input = { accountName: 'Race Test', contactName: 'X', createOpportunity: true, opportunityTitle: 'Race' };
const results = await Promise.all([
  convertLead(lead.id, input),
  convertLead(lead.id, input),
]);
console.log(results);
// Ожидание: один { ok: true }, второй { ok: false, error: 'lead_already_converted' } (через P2002)
"
```

### 4.4 Zod-валидация
```bash
tsx -e "
import { convertLead } from './src/lib/convertLead';
const result = await convertLead('any', { accountName: '', contactName: 'X', createOpportunity: false });
console.log(result);
// Ожидание: { ok: false, fieldErrors: { accountName: [...] } } — транзакция НЕ открывается
"
```

## 5. UI-проверка (E2E)

1. `/leads` → клик лида → Drawer.
2. Drawer header → клик `Convert lead` → Accordion раскрывается.
3. Заполнить `accountName` (default из `Lead.company`), `contactName`, поставить чекбокс `createOpportunity`, заполнить `opportunityTitle`.
4. Submit → Drawer показывает ссылки «Account X, Contact Y, Opportunity Z».
5. Кнопка `Convert lead` скрыта; `Lead.status === 'converted'`.

## 6. Коммит после фазы

```bash
git add src/lib/convertLead.ts src/lib/validators.ts src/components/ConvertLeadAccordion.tsx
git commit -m "feat: Convert Lead через Accordion + \$transaction, P2002-защита от race (D14)"
```