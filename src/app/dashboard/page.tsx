import Link from 'next/link';
import { getDashboardData } from '@/lib/dashboard';
import { KpiCard } from '@/components/KpiCard';
import { StagesChart } from '@/components/StagesChart';
import { LeadsChart } from '@/components/LeadsChart';
import { RecentLeadsList } from '@/components/RecentLeadsList';
import { OverdueTasksList } from '@/components/OverdueTasksList';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const data = await getDashboardData();

  const formatAmount = (v: number) =>
    new Intl.NumberFormat('ru-RU').format(v) + ' ₽';

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-50">
        Dashboard
      </h1>

      {/* 4 KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Всего лидов"
          value={data.kpis.leadsTotal}
          accent="indigo"
        />
        <KpiCard
          label="Открытых сделок"
          value={data.kpis.openOpportunitiesCount}
          accent="blue"
        />
        <KpiCard
          label="Сумма открытых"
          value={formatAmount(data.kpis.openOpportunitiesAmount)}
          accent="emerald"
        />
        <KpiCard
          label="Просроченных задач"
          value={data.kpis.overdueTasksCount}
          accent="rose"
        />
      </section>

      {/* 2 диаграммы */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 h-72">
          <StagesChart
            labels={data.stagesChart.labels}
            rawLabels={data.stagesChart.rawLabels}
            values={data.stagesChart.values}
          />
        </div>
        <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 h-72">
          <LeadsChart
            labels={data.leadsChart.labels}
            rawLabels={data.leadsChart.rawLabels}
            values={data.leadsChart.values}
          />
        </div>
      </section>

      {/* 2 summary-блока */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <h2 className="text-sm font-medium mb-3 text-zinc-900 dark:text-zinc-50">
            Лиды по статусам
          </h2>
          <ul className="space-y-1">
            {data.leadsStatusSummary.map((s) => (
              <li
                key={s.label}
                title={s.value}
                className="flex justify-between text-sm"
              >
                <span className="text-zinc-600 dark:text-zinc-400">
                  {s.label}
                </span>
                <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                  {s.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <h2 className="text-sm font-medium mb-3 text-zinc-900 dark:text-zinc-50">
            Лиды по источникам
          </h2>
          <ul className="space-y-1">
            {data.leadsSourceSummary.map((s) => (
              <li
                key={s.label}
                title={s.value}
                className="flex justify-between text-sm"
              >
                <span className="text-zinc-600 dark:text-zinc-400">
                  {s.label}
                </span>
                <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                  {s.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2 операционных списка */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Recent Leads
            </h2>
            <Link
              href="/leads"
              className="text-xs text-indigo-600 hover:underline"
            >
              все →
            </Link>
          </div>
          <RecentLeadsList leads={data.recentLeads} />
        </div>
        <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Overdue Tasks
            </h2>
            <Link
              href="/opportunities"
              className="text-xs text-indigo-600 hover:underline"
            >
              все сделки →
            </Link>
          </div>
          <OverdueTasksList tasks={data.overdueTasks} />
        </div>
      </section>
    </main>
  );
}