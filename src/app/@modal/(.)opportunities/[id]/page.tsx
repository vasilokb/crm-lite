import { notFound } from 'next/navigation';
import { getOpportunity } from '@/lib/opportunities';
import { getStages } from '@/lib/stages';
import { Drawer } from '@/components/Drawer';
import { OpportunityCard } from '@/components/OpportunityCard';

export default async function InterceptedOpportunityDrawer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [opp, stages] = await Promise.all([
    getOpportunity(id),
    getStages(),
  ]);
  if (!opp) notFound();
  return (
    <Drawer>
      <OpportunityCard opportunity={opp} stages={stages} />
    </Drawer>
  );
}
