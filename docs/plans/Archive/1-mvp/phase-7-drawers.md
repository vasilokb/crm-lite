# Phase 7 — Drawer-карточки + связи + вложенная навигация · F+B

> Детальный план для фазы 7 из `../Plan.md` §10. Открывается агентом непосредственно перед фазой 7.
>
> **Контекст для агента (M15):** прочитай [`../../docs/final-mvp.md`](../../docs/final-mvp.md) §4–§5 + `../Plan.md` §6.7.

## 1. Структура Next.js Intercepting Routes (D1)

Файловая структура:

```
src/app/
├── layout.tsx                              # ← принимает slot @modal
├── page.tsx                                # ← redirect('/dashboard')
├── dashboard/page.tsx
├── leads/
│   ├── page.tsx                            # список
│   └── [id]/page.tsx                       # полная страница (для share-link / refresh)
├── accounts/{page.tsx, [id]/page.tsx}
├── contacts/{page.tsx, [id]/page.tsx}
├── opportunities/{page.tsx, [id]/page.tsx}
└── @modal/                                 # ← PARALLEL ROUTE SLOT
    ├── (..)leads/[id]/page.tsx             # ← INTERCEPTING ROUTE → Drawer
    ├── (..)accounts/[id]/page.tsx
    ├── (..)contacts/[id]/page.tsx
    └── (..)opportunities/[id]/page.tsx
```

## 2. Root layout (`src/app/layout.tsx`)

```tsx
import type { ReactNode } from 'react';

export default function RootLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        {children}
        {modal}
      </body>
    </html>
  );
}
```

## 3. Список → Drawer (пример для `leads/page.tsx`)

```tsx
import Link from 'next/link';

type SP = { q?: string; source?: string; status?: string; page?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const leads = await getLeads({ q: sp.q, source: sp.source, status: sp.status, page: Number(sp.page ?? 1) });

  return (
    <div>
      <h1>Лиды</h1>
      {/* SearchInput, FilterBar */}
      <table>
        {leads.items.map(lead => (
          <tr key={lead.id}>
            <td>
              {/* Push в историю → Next.js перехватывает → @modal рендерит Drawer */}
              <Link href={`/leads/${lead.id}`}>{lead.name}</Link>
            </td>
            {/* ... */}
          </tr>
        ))}
      </table>
      <Pagination page={leads.page} totalPages={leads.totalPages} basePath="/leads" />
    </div>
  );
}
```

## 4. Intercepting route (`src/app/@modal/(..)leads/[id]/page.tsx`)

```tsx
import { getLead } from '@/lib/leads';
import { Drawer } from '@/components/Drawer';
import { DrawerHeader } from '@/components/DrawerHeader';
import { LeadForm } from '@/components/LeadForm';

export default async function InterceptedLeadDrawer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) return null;  // fallback на полную страницу через Next.js routing

  return (
    <Drawer>
      <DrawerHeader entity="lead" id={lead.id} status={lead.status} source={lead.source} />
      <LeadForm lead={lead} />
    </Drawer>
  );
}
```

## 5. Полная страница (`src/app/leads/[id]/page.tsx`)

```tsx
import { getLead } from '@/lib/leads';
import { LeadCard } from '@/components/LeadCard';

export default async function LeadFullPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();
  return <LeadCard lead={lead} />;
}
```

## 6. Drawer — back-поведение (D2)

- **Из списка (intercepted):** `<Link href="/leads/abc">` → Next.js рендерит `@modal`, history: `[/leads]`. Back → закрывает Drawer, виден список.
- **Между Drawer'ами (push):** `<Link href="/accounts/123">` из Drawer лида → Next.js перерисовывает `@modal`, history: `[/leads, /leads/abc, /accounts/123]`. Back → Drawer лида. Ещё back → список.
- **Прямой URL (refresh / share-link):** history браузера содержит предыдущую страницу (Dashboard). Back → Dashboard.

**Внутри Drawer'ов НЕ использовать `router.replace()`** — это сломает back между Drawer'ами.

## 7. Related Lists в Drawer

`src/components/DrawerRelatedList.tsx` — кликабельные бейджи-счётчики (final-mvp §4.4). Используется в двух контекстах: внутри Drawer аккаунта — якорная прокрутка (`#contacts`, `#opportunities`); в списке `/accounts` — `<Link>` на Drawer аккаунта с hash-фокусом.

```tsx
// Внутри Drawer аккаунта: клик по бейджу прокручивает к блоку
// (без смены маршрута, т.к. мы уже в Drawer аккаунта)
<a href="#contacts">
  <Badge>{account._count.contacts} контактов</Badge>
</a>
<a href="#opportunities">
  <Badge>{account._count.opportunities} сделок</Badge>
</a>

// В списке аккаунтов (/accounts) — клик по бейджу открывает Drawer
// аккаунта с фокусом:
<Link href={`/accounts/${account.id}#contacts`}>
  <Badge>{account._count.contacts} контактов</Badge>
</Link>
```

## 8. Edit-формы

`LeadForm.tsx`, `AccountForm.tsx`, `ContactForm.tsx`, `OpportunityForm.tsx` — клиентские компоненты, вызывают соответствующие `updateX` server actions. На submit → `revalidatePath` + закрытие Drawer или показ toast об успехе.

## 9. Ранний TS-шлюз

```bash
npx tsc --noEmit  # должно быть exit 0
```

## 10. Тестовые сценарии (для отметки [x])

1. **Из списка:** `/leads` → клик строки → URL `/leads/abc`, Drawer overlay, список виден под ним.
2. **Refresh:** F5 на `/leads/abc` → полная страница, не overlay.
3. **Back из intercepted:** после сценария 1 — back → Drawer закрывается, виден `/leads`.
4. **Между Drawer'ами:** Drawer лида → клик на "Связанная сделка" → Drawer сделки; back → Drawer лида (НЕ список).
5. **Share-link:** скопировать URL `/accounts/abc` → открыть в новой вкладке → полная страница; back → пустая (новая вкладка).

## 11. Коммит после фазы

```bash
git add src/app/
git commit -m "feat: Drawer-карточки для всех сущностей через Intercepting Routes, вложенная навигация, edit-формы"
```