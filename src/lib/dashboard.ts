import { getTenantPrisma } from '@/lib/auth/session';
import { stageLabel, leadStatusLabel, leadSourceLabel } from './labels';

/**
 * Агрегации для Dashboard.
 *
 * Контракт (Plan.md §10 фаза 11):
 * - 4 KPI: leadsTotal, openOpportunitiesCount, openOpportunitiesAmount, overdueTasksCount
 * - stagesChart: ВСЕГДА 5 столбцов (D5) — Stage.findMany + _count, НЕ groupBy
 * - openOpportunitiesAmount: ?? 0 (D6), никогда null
 * - labels/values вычисляются здесь; клиентские компоненты — «тупые»
 *
 * Не помечен 'use server' — это обычная async-функция, вызывается из server component.
 * Все запросы — через getTenantPrisma() → organizationId авто-инжектится extension.
 */
export async function getDashboardData() {
  const db = await getTenantPrisma();

  // === KPI ===
  const leadsTotal = await db.lead.count();

  const openOpportunitiesCount = await db.opportunity.count({
    where: { status: 'open' },
  });

  const openOppAgg = await db.opportunity.aggregate({
    where: { status: 'open' },
    _sum: { amount: true },
  });
  const openOpportunitiesAmount = openOppAgg._sum.amount ?? 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueTasksCount = await db.activity.count({
    where: {
      type: 'task',
      done: false,
      dueDate: { lt: today },
    },
  });

  // === 2 диаграммы ===
  const stages = await db.stage.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { opportunities: true } } },
  });
  const stagesChart = {
    labels: stages.map((s) => stageLabel(s.name)),
    rawLabels: stages.map((s) => s.name),
    values: stages.map((s) => s._count.opportunities),
  };

  const leadsByStatus = await db.lead.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const statusOrder = ['new', 'processed', 'converted'] as const;
  const leadsChart = {
    labels: statusOrder.map((s) => leadStatusLabel(s)),
    rawLabels: statusOrder.map((s) => s),
    values: statusOrder.map(
      (s) => leadsByStatus.find((l) => l.status === s)?._count._all ?? 0,
    ),
  };

  // === 2 summary-блока ===
  const leadsStatusSummary = statusOrder.map((s) => ({
    label: leadStatusLabel(s),
    value: s,
    count: leadsByStatus.find((l) => l.status === s)?._count._all ?? 0,
  }));

  const leadsBySource = await db.lead.groupBy({
    by: ['source'],
    _count: { _all: true },
  });
  const sourceOrder = ['site', 'email', 'phone', 'referral', 'manual'];
  const leadsSourceSummary = sourceOrder.map((src) => ({
    label: leadSourceLabel(src),
    value: src,
    count: leadsBySource.find((l) => l.source === src)?._count._all ?? 0,
  }));

  // === 2 операционных списка ===
  const recentLeads = await db.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, source: true, status: true, createdAt: true },
  });

  const overdueTasks = await db.activity.findMany({
    where: {
      type: 'task',
      done: false,
      dueDate: { lt: today },
    },
    orderBy: { dueDate: 'asc' },
    take: 10,
    include: {
      opportunity: { select: { id: true, title: true } },
    },
  });

  return {
    kpis: {
      leadsTotal,
      openOpportunitiesCount,
      openOpportunitiesAmount,
      overdueTasksCount,
    },
    stagesChart,
    leadsChart,
    leadsStatusSummary,
    leadsSourceSummary,
    recentLeads,
    overdueTasks,
  };
}