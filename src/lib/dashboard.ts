import { prisma } from './db';
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
 */
export async function getDashboardData() {
  // === KPI ===

  const leadsTotal = await prisma.lead.count();

  const openOpportunitiesCount = await prisma.opportunity.count({
    where: { status: 'open' },
  });

  // D6 fix: _sum.amount может быть null при 0 открытых → ?? 0
  const openOppAgg = await prisma.opportunity.aggregate({
    where: { status: 'open' },
    _sum: { amount: true },
  });
  const openOpportunitiesAmount = openOppAgg._sum.amount ?? 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueTasksCount = await prisma.activity.count({
    where: {
      type: 'task',
      done: false,
      dueDate: { lt: today },
    },
  });

  // === 2 диаграммы ===

  // D5 fix: stagesChart через Stage.findMany + _count (НЕ groupBy —
  // groupBy теряет пустые стадии). Всегда 5 столбцов, даже если lost=0.
  const stages = await prisma.stage.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { opportunities: true } } },
  });
  const stagesChart = {
    labels: stages.map((s) => stageLabel(s.name)),
    rawLabels: stages.map((s) => s.name),
    values: stages.map((s) => s._count.opportunities),
  };

  // leadsChart по статусам — groupBy ОК (категорий мало, все
  // представлены в seed). Дополняем нулями для отсутствующих.
  const leadsByStatus = await prisma.lead.groupBy({
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

  // Summary по статусам лидов (текстовый, не график)
  const leadsStatusSummary = statusOrder.map((s) => ({
    label: leadStatusLabel(s),
    value: s,
    count: leadsByStatus.find((l) => l.status === s)?._count._all ?? 0,
  }));

  // Summary по источникам лидов (site/email/phone/referral/manual)
  const leadsBySource = await prisma.lead.groupBy({
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

  // Recent Leads — последние 5 лидов
  const recentLeads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, source: true, status: true, createdAt: true },
  });

  // Overdue Tasks — просроченные невыполненные задачи
  const overdueTasks = await prisma.activity.findMany({
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