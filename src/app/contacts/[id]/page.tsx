import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getContact } from '@/lib/contacts';
import { ContactCard } from '@/components/ContactCard';
import { CardOverlayWrapper } from '@/components/CardOverlayWrapper';

export default async function ContactFullPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = await getContact(id);
  if (!contact) notFound();
  return (
    <CardOverlayWrapper listPath="/contacts">
      <ContactCard contact={contact} />
    </CardOverlayWrapper>
  );
}