import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getOpportunity } from '@/lib/opportunities';
import { getStages } from '@/lib/stages';
import { OpportunityCard } from '@/components/OpportunityCard';
import { CardOverlayWrapper } from '@/components/CardOverlayWrapper';

export default async function OpportunityFullPage({
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
    <CardOverlayWrapper listPath="/opportunities">
      <OpportunityCard opportunity={opp} stages={stages} />
    </CardOverlayWrapper>
  );
}