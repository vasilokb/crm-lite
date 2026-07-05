import { notFound } from 'next/navigation';
import { getContact } from '@/lib/contacts';
import { Drawer } from '@/components/Drawer';
import { ContactCard } from '@/components/ContactCard';

export default async function InterceptedContactDrawer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = await getContact(id);
  if (!contact) notFound();
  return (
    <Drawer>
      <ContactCard contact={contact} />
    </Drawer>
  );
}