'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Drawer } from './Drawer';
import type { ReactNode } from 'react';

/**
 * CardOverlayWrapper — обёртка для full-page карточки.
 *
 * Проблема: Next.js parallel routes (@modal slot) ломаются в dev.
 * Решение: full-page версия сущности теперь сама использует Drawer.
 * Это работает как для direct URL (/leads/<id>), так и для клика из
 * таблицы (URL меняется на /leads/<id> через <Link>).
 *
 * Поведение:
 * - Открывается сразу (defaultOpen=true)
 * - Закрытие (× или backdrop) → router.back() / router.push(listPath)
 * - Под Drawer виден пустой main (без списка)
 */
export function CardOverlayWrapper({
  children,
  listPath,
}: {
  children: ReactNode;
  listPath: string;
}) {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  function close(): void {
    setOpen(false);
    setTimeout(() => {
      router.push(listPath);
    }, 0);
  }

  // Esc для закрытия
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  return (
    <Drawer onClose={close}>
      {children}
    </Drawer>
  );
}