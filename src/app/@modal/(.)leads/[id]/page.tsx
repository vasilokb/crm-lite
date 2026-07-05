import { notFound } from 'next/navigation';
import { getLead } from '@/lib/leads';
import { Drawer } from '@/components/Drawer';
import { LeadCard } from '@/components/LeadCard';

export default async function InterceptedLeadDrawer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();
  return (
    <Drawer>
      <LeadCard lead={lead} />
    </Drawer>
  );
}