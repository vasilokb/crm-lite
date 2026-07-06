import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getContact } from '@/lib/contacts';
import { ContactCard } from '@/components/ContactCard';

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
      <div className="mt-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <ContactCard contact={contact} />
      </div>
    </main>
  );
}
