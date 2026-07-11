import { notFound } from 'next/navigation';
import { getCustomer } from '@/lib/customers';
import { Drawer } from '@/components/Drawer';
import { CustomerCard } from '@/components/CustomerCard';

export default async function InterceptedCustomerDrawer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();
  return (
    <Drawer>
      <CustomerCard customer={customer} />
    </Drawer>
  );
}