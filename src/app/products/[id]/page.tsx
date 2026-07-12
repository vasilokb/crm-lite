import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProduct } from '@/lib/products';
import { ProductCard } from '@/components/ProductCard';

export default async function ProductFullPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <Link
        href="/products"
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        ← К списку продуктов
      </Link>
      <div className="mt-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <ProductCard product={product} />
      </div>
    </main>
  );
}