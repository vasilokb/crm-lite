import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/products';
import { Drawer } from '@/components/Drawer';
import { ProductCard } from '@/components/ProductCard';

export default async function InterceptedProductDrawer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  return (
    <Drawer>
      <ProductCard product={product} />
    </Drawer>
  );
}
