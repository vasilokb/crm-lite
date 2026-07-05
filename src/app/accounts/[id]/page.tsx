import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAccount } from '@/lib/accounts';
import { DrawerHeader } from '@/components/DrawerHeader';

export default async function AccountFullPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await getAccount(id);
  if (!account) notFound();
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <Link
        href="/accounts"
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        ← К списку компаний
      </Link>
      <article className="mt-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-6 py-4">
          <DrawerHeader
            entity="account"
            title={account.name}
          />
        </div>
        <dl className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 px-6 py-4 text-sm border-t border-zinc-100 dark:border-zinc-800">
          {account.website && (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">Сайт:</dt>
              <dd>
                <a
                  href={account.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {account.website}
                </a>
              </dd>
            </>
          )}
          {account.industry && (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">Отрасль:</dt>
              <dd>{account.industry}</dd>
            </>
          )}
          <dt className="text-zinc-500 dark:text-zinc-400">Создан:</dt>
          <dd>{new Date(account.createdAt).toLocaleString('ru-RU')}</dd>
        </dl>

        <section className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
          <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Контакты ({account.contacts.length})
          </h3>
          {account.contacts.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Нет контактов</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {account.contacts.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/contacts/${c.id}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {c.name}
                  </Link>
                  {c.role && <span className="text-zinc-500 dark:text-zinc-400"> · {c.role}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
          <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Сделки ({account.opportunities.length})
          </h3>
          {account.opportunities.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Нет сделок</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {account.opportunities.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/opportunities/${o.id}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {o.title}
                  </Link>
                  <span className="text-zinc-500 dark:text-zinc-400"> · {o.stage.name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </main>
  );
}