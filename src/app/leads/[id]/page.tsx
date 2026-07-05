import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLead } from '@/lib/leads';
import { DrawerHeader } from '@/components/DrawerHeader';
import { Badge } from '@/components/Badge';

export default async function LeadFullPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <Link
        href="/leads"
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        ← К списку лидов
      </Link>
      <article className="mt-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-6 py-4">
          <DrawerHeader
            entity="lead"
            title={lead.name}
            status={lead.status}
            source={lead.source}
          />
        </div>
        <dl className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 px-6 py-4 text-sm border-t border-zinc-100 dark:border-zinc-800">
          {lead.email && (<><dt className="text-zinc-500 dark:text-zinc-400">Email:</dt><dd>{lead.email}</dd></>)}
          {lead.phone && (<><dt className="text-zinc-500 dark:text-zinc-400">Телефон:</dt><dd>{lead.phone}</dd></>)}
          {lead.company && (<><dt className="text-zinc-500 dark:text-zinc-400">Компания:</dt><dd>{lead.company}</dd></>)}
          {lead.budget !== null && (<><dt className="text-zinc-500 dark:text-zinc-400">Бюджет:</dt><dd className="tabular-nums">{new Intl.NumberFormat('ru-RU').format(lead.budget)} ₽</dd></>)}
          {lead.timeline && (<><dt className="text-zinc-500 dark:text-zinc-400">Сроки:</dt><dd>{lead.timeline}</dd></>)}
          {lead.comment && (<><dt className="text-zinc-500 dark:text-zinc-400">Комментарий:</dt><dd>{lead.comment}</dd></>)}
          <dt className="text-zinc-500 dark:text-zinc-400">Создан:</dt>
          <dd>{new Date(lead.createdAt).toLocaleString('ru-RU')}</dd>
        </dl>

        {lead.opportunity && (
          <section className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
            <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Сделка</h3>
            <Link
              href={`/opportunities/${lead.opportunity.id}`}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {lead.opportunity.title}
            </Link>
            {lead.opportunity.account && (
              <span className="text-zinc-500 dark:text-zinc-400">
                {' '}· {lead.opportunity.account.name}
              </span>
            )}
          </section>
        )}
      </article>
    </main>
  );
}