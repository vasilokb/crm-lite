# Phase 11 — Dashboard: KPI + 2 Chart.js + операционные списки · F+B

> Детальный план для фазы 11 из `../Plan.md` §10. Открывается агентом непосредственно перед фазой 11.
>
> **Контекст для агента (M15):** прочитай [`../../docs/final-mvp.md`](../../docs/final-mvp.md) §8 + `../Plan.md` §5.

## 1. Server action `getDashboardData` (D5, D6)

Файл `src/lib/dashboard.ts`:

```ts
import { prisma } from './db';

export async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // D5 — stagesChart: ВСЕГДА 5 столбцов, пустые = 0
  const stages = await prisma.stage.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { opportunities: true } } },
  });
  const stagesChart = {
    labels: stages.map(s => s.name),
    values: stages.map(s => s._count.opportunities),
  };

  // D6 — явная обработка null для _sum.amount
  const openOppsAggregate = await prisma.opportunity.aggregate({
    where: { status: 'open' },
    _sum: { amount: true },
  });

  // KPI
  const kpis = {
    leadsTotal:             await prisma.lead.count(),
    openOpportunitiesCount: await prisma.opportunity.count({ where: { status: 'open' } }),
    openOpportunitiesAmount: openOppsAggregate._sum.amount ?? 0,  // D6 — НЕ null
    overdueTasksCount:      await prisma.activity.count({
      where: { type: 'task', done: false, dueDate: { lt: today } },
    }),
  };

  // leadsChart: захардкоженный список + дополнение нулями
  const allLeadStatuses = ['new', 'processed', 'converted'] as const;
  const leadStatusGroups = await prisma.lead.groupBy({
    by: ['status'],
    _count: true,
  });
  const statusMap = new Map(leadStatusGroups.map(g => [g.status, g._count]));
  const leadsChart = {
    labels: allLeadStatuses as unknown as string[],
    values: allLeadStatuses.map(s => statusMap.get(s) ?? 0),
  };

  // sourcesSummary: захардкоженный список + дополнение нулями
  const allSources = ['site', 'email', 'phone', 'referral', 'manual'] as const;
  const sourceGroups = await prisma.lead.groupBy({ by: ['source'], _count: true });
  const sourceMap = new Map(sourceGroups.map(g => [g.source, g._count]));
  const sourcesSummary = allSources.map(s => ({
    source: s,
    count: sourceMap.get(s) ?? 0,
  }));

  // statusesSummary — для текстового блока
  const statusesSummary = leadStatusGroups.map(g => ({
    status: g.status,
    count: g._count,
  }));

  const recentLeads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const overdueTasks = await prisma.activity.findMany({
    where: { type: 'task', done: false, dueDate: { lt: today } },
    include: { opportunity: { select: { id: true, title: true } } },
    orderBy: { dueDate: 'asc' },
    take: 10,
  });

  return { kpis, stagesChart, leadsChart, sourcesSummary, statusesSummary, recentLeads, overdueTasks };
}
```

## 2. Страница Dashboard (`src/app/dashboard/page.tsx`)

```tsx
import { getDashboardData } from '@/lib/dashboard';
import { KpiCard } from '@/components/KpiCard';
import { StagesChart } from '@/components/StagesChart';
import { LeadsChart } from '@/components/LeadsChart';
import { RecentLeadsList } from '@/components/RecentLeadsList';
import { OverdueTasksList } from '@/components/OverdueTasksList';

export const dynamic = 'force-dynamic';   // всегда свежие данные

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <main>
      <h1>Dashboard</h1>

      <section style={{ display: 'flex', gap: 16 }}>
        <KpiCard label="Всего лидов"            value={data.kpis.leadsTotal} />
        <KpiCard label="Открытых сделок"        value={data.kpis.openOpportunitiesCount} />
        <KpiCard label="Сумма открытых сделок"  value={data.kpis.openOpportunitiesAmount} format="currency" />
        <KpiCard label="Просроченных задач"    value={data.kpis.overdueTasksCount} highlight />
      </section>

      <section style={{ display: 'flex', gap: 16 }}>
        <StagesChart labels={data.stagesChart.labels} values={data.stagesChart.values} />
        <LeadsChart  labels={data.leadsChart.labels}  values={data.leadsChart.values} />
      </section>

      <section style={{ display: 'flex', gap: 16 }}>
        <div>
          <h2>Лиды по источнику</h2>
          <ul>{data.sourcesSummary.map(s => <li key={s.source}>{s.source}: {s.count}</li>)}</ul>
        </div>
        <div>
          <h2>Лиды по статусу</h2>
          <ul>{data.statusesSummary.map(s => <li key={s.status}>{s.status}: {s.count}</li>)}</ul>
        </div>
      </section>

      <section style={{ display: 'flex', gap: 16 }}>
        <RecentLeadsList leads={data.recentLeads} />
        <OverdueTasksList tasks={data.overdueTasks} />
      </section>
    </main>
  );
}
```

## 3. «Тупые» компоненты диаграмм

### `src/components/StagesChart.tsx`
```tsx
'use client';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Props = { labels: string[]; values: number[] };

export function StagesChart({ labels, values }: Props) {
  return (
    <Bar
      data={{ labels, datasets: [{ label: 'Сделок', data: values, backgroundColor: '#6366f1' }] }}
      options={{ responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Сделки по стадиям' } } }}
    />
  );
}
```

### `src/components/LeadsChart.tsx` — аналогично с `Doughnut`.

## 4. revalidatePath во всех мутирующих actions (D13)

| Action | revalidatePath |
|---|---|
| `createLead` / `updateLead` | `/leads`, `/dashboard` |
| `createAccount` / `updateAccount` | `/accounts`, `/dashboard` |
| `createContact` / `updateContact` | `/contacts`, `/dashboard` |
| `createOpportunity` / `updateOpportunity` | `/opportunities`, `/dashboard` |
| `updateOpportunityStage` | `/opportunities`, `/opportunities/[id]`, `/dashboard` |
| `createActivity` / `toggleActivityDone` | `/opportunities/[id]`, `/dashboard` |
| `convertLead` | `/leads`, `/leads/[id]`, `/dashboard` |

## 5. Тест-критерии (K20 — `tsx -e` + JSON)

### 5.1 `stagesChart` всегда 5 столбцов
```bash
tsx -e "
import { getDashboardData } from './src/lib/dashboard';
const d = await getDashboardData();
console.log({ labels: d.stagesChart.labels, values: d.stagesChart.values });
console.assert(d.stagesChart.labels.length === 5, 'должно быть 5 стадий');
console.assert(d.stagesChart.values.length === 5, 'должно быть 5 значений');
"
```
Ожидание:
```json
{ "labels": ["qualification","proposal","negotiation","won","lost"], "values": [N1,N2,N3,N4,N5] }
```
Если нет сделок на стадии `lost` → `values[4] === 0`, не `undefined`.

### 5.2 `_sum.amount` не null при 0 открытых
```bash
tsx -e "
import { prisma } from './src/lib/db';
import { getDashboardData } from './src/lib/dashboard';
// создать 0 открытых: перевести все open сделки в won/lost через updateOpportunityStage (фаза 9)
// или в seed не создавать ни одной open сделки
const d = await getDashboardData();
console.log(d.kpis.openOpportunitiesAmount);
console.assert(d.kpis.openOpportunitiesAmount === 0, 'должно быть 0, не null');
console.assert(d.kpis.openOpportunitiesAmount !== null, 'не должно быть null');
"
```

### 5.3 `leadsChart` — все 3 статуса
```bash
tsx -e "
import { getDashboardData } from './src/lib/dashboard';
const d = await getDashboardData();
console.log(d.leadsChart);
// Ожидание: { labels: ['new','processed','converted'], values: [...] } — ровно 3
"
```

### 5.4 E2E через UI
1. Открыть `/dashboard` → 4 KPI видны.
2. Создать лид через `/leads` → вернуться на `/dashboard` → `leadsTotal` увеличился (revalidatePath).
3. Отметить просроченную задачу done → `overdueTasksCount` уменьшился.
4. Проверить в DevTools Network: нет websocket-соединений (только HTTP).

## 6. Коммит после фазы

```bash
git add src/lib/dashboard.ts src/app/dashboard/page.tsx src/components/StagesChart.tsx src/components/LeadsChart.tsx src/components/KpiCard.tsx src/components/RecentLeadsList.tsx src/components/OverdueTasksList.tsx
git commit -m "feat: Dashboard с KPI, 2 Chart.js, summary, Recent Leads, Overdue Tasks (D5/D6/D13)"
```