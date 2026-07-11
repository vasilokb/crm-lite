# Phase 6 — Frontend: списки + пагинация + поиск + фильтры · F

> Детальный план для фазы 6 из `../Plan.md` §10. Открывается агентом непосредственно перед фазой 6.
>
> **Контекст для агента (M15):** прочитай `../Plan.md` §6 + [`docs/Plan — Code — Test.md`](../../docs/Plan — Code — Test.md) §F/B/D + [`docs/plans/phase-5-backend.md`](phase-5-backend.md).

## 0. Цель

4 табличных списка с пагинацией, поиском, фильтрами. Server Components по умолчанию, клиент — только для `SearchInput` и `FilterBar` (debounce 300 мс через `useTransition`). Все данные — из БД через server actions из фазы 5.

## 1. Общие компоненты

### 1.1 `src/components/SearchInput.tsx` (client)
```tsx
'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

export function SearchInput({ placeholder = 'Поиск…' }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get('q') ?? '');
  const [pending, start] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (value) next.set('q', value); else next.delete('q');
      next.delete('page');
      start(() => router.replace(`${pathname}?${next.toString()}`));
    }, 300);  // debounce
    return () => clearTimeout(t);
  }, [value]);

  return <input type="search" value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} aria-busy={pending} />;
}
```

### 1.2 `src/components/FilterBar.tsx` (client)
```tsx
'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';

type Option = { value: string; label: string };
type Filters = { name: string; options: Option[] };

export function FilterBar({ filters }: { filters: Filters[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function onChange(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value); else next.delete(name);
    next.delete('page');
    start(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {filters.map(f => (
        <select key={f.name} value={params.get(f.name) ?? ''} onChange={e => onChange(f.name, e.target.value)} aria-busy={pending}>
          <option value="">Все</option>
          {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ))}
    </div>
  );
}
```

### 1.3 `src/components/Pagination.tsx` (server)
```tsx
import Link from 'next/link';

type Props = { page: number; totalPages: number; basePath: string };
export function Pagination({ page, totalPages, basePath }: Props) {
  if (totalPages <= 1) return null;
  const prev = page > 1 ? `${basePath}?page=${page - 1}` : null;
  const next = page < totalPages ? `${basePath}?page=${page + 1}` : null;
  return (
    <nav aria-label="Пагинация">
      {prev && <Link href={prev}>‹ Назад</Link>}
      <span>Стр. {page} из {totalPages}</span>
      {next && <Link href={next}>Дальше ›</Link>}
    </nav>
  );
}
```

### 1.4 `src/components/Badge.tsx` (server)
```tsx
type Variant = 'won' | 'lost' | 'open' | 'new' | 'processed' | 'converted' | 'site' | 'email' | 'phone' | 'referral' | 'manual';
const COLORS: Record<Variant, string> = {
  won: '#10b981', lost: '#f43f5e', open: '#6366f1',
  new: '#6366f1', processed: '#8b5cf6', converted: '#10b981',
  site: '#64748b', email: '#64748b', phone: '#64748b', referral: '#64748b', manual: '#64748b',
};
export function Badge({ variant, children }: { variant: Variant; children: React.ReactNode }) {
  return <span className={`badge badge--${variant}`} style={{ backgroundColor: `${COLORS[variant]}25`, color: COLORS[variant], border: `1px solid ${COLORS[variant]}40` }}>{children}</span>;
}
```

## 2. Колонки таблиц

### 2.1 `/leads` — таблица лидов
| Имя (link → `/leads/[id]`) | Source (Badge) | Статус (Badge) | Компания | Создан |
|---|---|---|---|---|
| `Link href={\`/leads/\${lead.id}\`}` | `<Badge variant={lead.source}>{lead.source}</Badge>` | `<Badge variant={lead.status}>{lead.status}</Badge>` | `{lead.company ?? '—'}` | `{lead.createdAt.toLocaleDateString('ru-RU')}` |

**Фильтры:** `?source=` (5 опций), `?status=` (3 опции). **Поиск:** `?q=` по `name` + `company`.

### 2.2 `/accounts` — таблица компаний
| Имя | Сайт | Contacts: N (Badge-link) | Deals: N (Badge-link) |
|---|---|---|---|
| `{account.name}` | `{account.website ? <a href={account.website} target="_blank" rel="noreferrer">{account.website}</a> : '—'}` | `<Link href={\`/accounts/\${account.id}#contacts\`}><Badge>{account._count.contacts}</Badge></Link>` | `<Link href={\`/accounts/\${account.id}#opportunities\`}><Badge>{account._count.opportunities}</Badge></Link>` |

**Поиск:** `?q=` по `name`.

### 2.3 `/contacts` — таблица контактов
| Имя | Email | Телефон | Компания (Badge) |
|---|---|---|---|
| `{contact.name}` | `{contact.email ?? '—'}` | `{contact.phone ?? '—'}` | `{contact.account ? <Link href={\`/accounts/\${contact.account.id}\`}><Badge>{contact.account.name}</Badge></Link> : '—'}` |

**Поиск:** `?q=` по `name`.

### 2.4 `/opportunities` — таблица сделок
| Название (link) | Сумма | Stage (Badge) | Status (Badge) | Компания | Контакт |
|---|---|---|---|---|---|
| `Link href={\`/opportunities/\${opp.id}\`}` | `{opp.amount?.toLocaleString('ru-RU') + ' ₽' ?? '—'}` | `<Badge variant={opp.stage.name}>{opp.stage.name}</Badge>` | `<Badge variant={opp.status}>{opp.status}</Badge>` | `{opp.account?.name ?? '—'}` | `{opp.contact?.name ?? '—'}` |

**Фильтры:** `?stage=` (5 опций из справочника), `?status=` (3 опции). **Поиск:** `?q=` по `title`.

## 3. Пример страницы: `src/app/leads/page.tsx`

```tsx
import { getLeads } from '@/lib/leads';
import { SearchInput } from '@/components/SearchInput';
import { FilterBar } from '@/components/FilterBar';
import { Pagination } from '@/components/Pagination';
import { Badge } from '@/components/Badge';
import Link from 'next/link';

type SP = { q?: string; source?: string; status?: string; page?: string };

export default async function LeadsPage({ searchParams }: { searchParams: SP }) {
  const { items, page, totalPages } = await getLeads({
    q: searchParams.q, source: searchParams.source, status: searchParams.status,
    page: Number(searchParams.page ?? 1),
  });

  return (
    <main>
      <h1>Лиды</h1>
      <SearchInput placeholder="Поиск по имени или компании…" />
      <FilterBar filters={[
        { name: 'source', options: [
          { value: 'site', label: 'Сайт' }, { value: 'email', label: 'Email' },
          { value: 'phone', label: 'Телефон' }, { value: 'referral', label: 'Рекомендация' },
          { value: 'manual', label: 'Вручную' },
        ]},
        { name: 'status', options: [
          { value: 'new', label: 'Новая' }, { value: 'processed', label: 'В работе' },
          { value: 'converted', label: 'Конвертирована' },
        ]},
      ]} />

      <table>
        <thead><tr><th>Имя</th><th>Source</th><th>Статус</th><th>Компания</th><th>Создан</th></tr></thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={5}>Нет лидов по фильтру</td></tr>}
          {items.map(lead => (
            <tr key={lead.id}>
              <td><Link href={`/leads/${lead.id}`}>{lead.name}</Link></td>
              <td><Badge variant={lead.source}>{lead.source}</Badge></td>
              <td><Badge variant={lead.status}>{lead.status}</Badge></td>
              <td>{lead.company ?? '—'}</td>
              <td>{lead.createdAt.toLocaleDateString('ru-RU')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination page={page} totalPages={totalPages} basePath="/leads" />
    </main>
  );
}
```

## 4. Server vs Client

- **Server:** `LeadsPage`, `AccountsPage`, `ContactsPage`, `OpportunitiesPage`, `Pagination`, `Badge`, все ячейки таблиц.
- **Client:** `SearchInput`, `FilterBar` (нужен `useTransition` для debounce + `router.replace` без полного re-render).

## 5. Test-критерии (ручная проверка + `curl`)

```bash
# После seed:
curl 'http://localhost:3000/leads' 2>/dev/null | grep -c 'Дмитрий Козлов'  # ≥ 1
curl 'http://localhost:3000/leads?source=site' 2>/dev/null | grep -c 'Дмитрий Козлов'  # ≥ 1
curl 'http://localhost:3000/leads?status=converted' 2>/dev/null | grep -c 'Юлия Зайцева'  # ≥ 1

curl 'http://localhost:3000/accounts?q=Экспо' 2>/dev/null | grep -c 'ЭкспоФормат'  # ≥ 1
curl 'http://localhost:3000/opportunities?stage=won' 2>/dev/null | grep -c 'Epsilon 2026'  # ≥ 1
curl 'http://localhost:3000/opportunities?status=lost' 2>/dev/null | grep -c 'Zeta'  # ≥ 1
```

**Ручная проверка в браузере:**
1. `/leads?q=Дмитрий` → 1 строка; backspace → все 6.
2. `/leads?source=site` → 2 строки; dropdown на email → 1 строка.
3. `/leads?status=converted` → 1 строка (Юлия).
4. `/opportunities?stage=won` → 1 строка с бейджем `won` (emerald).
5. `/opportunities?status=lost` → 1 строка с бейджем `lost` (rose), reasonLost виден.

## 6. Коммит после фазы

```bash
git add src/app/{leads,accounts,contacts,opportunities}/page.tsx src/components/{SearchInput,FilterBar,Pagination,Badge}.tsx
git commit -m "feat: списки лидов/компаний/контактов/сделок + пагинация + поиск + фильтры"
```