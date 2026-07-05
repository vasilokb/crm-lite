import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getContact } from '@/lib/contacts';
import { DrawerHeader } from '@/components/DrawerHeader';

export default async function ContactFullPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = await getContact(id);
  if (!contact) notFound();
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <Link
        href="/contacts"
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        ← К списку контактов
      </Link>
      <article className="mt-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-6 py-4">
          <DrawerHeader
            entity="contact"
            title={contact.name}
          />
        </div>
        <dl className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 px-6 py-4 text-sm border-t border-zinc-100 dark:border-zinc-800">
          {contact.email && (<><dt className="text-zinc-500 dark:text-zinc-400">Email:</dt><dd>{contact.email}</dd></>)}
          {contact.phone && (<><dt className="text-zinc-500 dark:text-zinc-400">Телефон:</dt><dd>{contact.phone}</dd></>)}
          {contact.role && (<><dt className="text-zinc-500 dark:text-zinc-400">Должность:</dt><dd>{contact.role}</dd></>)}
          {contact.account && (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">Компания:</dt>
              <dd>
                <Link
                  href={`/accounts/${contact.account.id}`}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {contact.account.name}
                </Link>
              </dd>
            </>
          )}
          <dt className="text-zinc-500 dark:text-zinc-400">Создан:</dt>
          <dd>{new Date(contact.createdAt).toLocaleString('ru-RU')}</dd>
        </dl>

        <section className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
          <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Сделки ({contact.opportunities.length})
          </h3>
          {contact.opportunities.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Нет сделок</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {contact.opportunities.map((o) => (
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