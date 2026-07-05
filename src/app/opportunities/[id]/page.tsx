import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getOpportunity } from '@/lib/opportunities';
import { DrawerHeader } from '@/components/DrawerHeader';
import { Badge } from '@/components/Badge';

export default async function OpportunityFullPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opp = await getOpportunity(id);
  if (!opp) notFound();

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <Link
        href="/opportunities"
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        ← К списку сделок
      </Link>
      <article className="mt-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-6 py-4">
          <DrawerHeader
            entity="opportunity"
            title={opp.title}
            status={opp.status}
            stage={opp.stage.name}
          />
        </div>
        <dl className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 px-6 py-4 text-sm border-t border-zinc-100 dark:border-zinc-800">
          {opp.amount !== null && (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">Сумма:</dt>
              <dd className="tabular-nums">{new Intl.NumberFormat('ru-RU').format(opp.amount)} ₽</dd>
            </>
          )}
          {opp.account && (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">Компания:</dt>
              <dd>
                <Link href={`/accounts/${opp.account.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  {opp.account.name}
                </Link>
              </dd>
            </>
          )}
          {opp.contact && (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">Контакт:</dt>
              <dd>
                <Link href={`/contacts/${opp.contact.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  {opp.contact.name}
                </Link>
              </dd>
            </>
          )}
          {opp.dueDate && (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">Плановая дата:</dt>
              <dd>{new Date(opp.dueDate).toLocaleDateString('ru-RU')}</dd>
            </>
          )}
          {opp.closeDate && (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">Дата закрытия:</dt>
              <dd>{new Date(opp.closeDate).toLocaleDateString('ru-RU')}</dd>
            </>
          )}
          {opp.reasonLost && (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">Причина отказа:</dt>
              <dd className="text-rose-700 dark:text-rose-400">{opp.reasonLost}</dd>
            </>
          )}
        </dl>

        <section className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
          <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Активности ({opp.activities.length})
          </h3>
          {opp.activities.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Нет активностей</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {opp.activities.map((a) => (
                <li key={a.id} className="flex items-start gap-2">
                  <Badge variant="open">{a.type}</Badge>
                  <span>{a.text}</span>
                  {a.type === 'task' && a.dueDate && (
                    <span className="text-zinc-500 dark:text-zinc-400">
                      · до {new Date(a.dueDate).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                  {a.type === 'task' && (a.done ? ' ✓' : ' ○')}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Timeline с toggle done — фаза 10.
          </p>
        </section>
      </article>
    </main>
  );
}