import { revalidatePath } from 'next/cache';

/**
 * Safe-обёртка над revalidatePath из next/cache.
 * В Next runtime — обычный вызов.
 * Вне Next runtime (smoke-тесты, unit-тесты) — revalidatePath падает с
 * "static generation store missing", потому что требует request-context.
 * Мы глушим эту конкретную ошибку, чтобы можно было тестировать логику
 * server actions без полноценного Next request.
 */
export function safeRevalidate(path: string): void {
  try {
    revalidatePath(path);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('static generation store missing')) return;
    throw e;
  }
}