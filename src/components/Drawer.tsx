'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

type DrawerContextValue = {
  close: () => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function useDrawerClose(): () => void {
  const ctx = useContext(DrawerContext);
  if (ctx) return ctx.close;
  const router = useRouter();
  return () => router.back();
}

/**
 * Drawer — оверлей справа. Рендерится через React Portal в document.body.
 * Чтобы избежать hydration error при использовании внутри <tbody>/<tr>,
 * Portal применяется только на client. До mount Drawer возвращает null
 * (на SSR и при первом client render).
 */
export function Drawer({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [internalClose] = useState(() => () => (onClose ? onClose() : router.back()));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') internalClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [internalClose]);

  if (!mounted) return null;

  return createPortal(
    <DrawerContext.Provider value={{ close: internalClose }}>
      <div className="fixed inset-0 z-50 flex">
        <button
          type="button"
          onClick={internalClose}
          aria-label="Закрыть"
          className="absolute inset-0 bg-black/40 cursor-default"
        />
        <aside className="relative ml-auto h-full w-full sm:max-w-xl shrink-0 bg-white dark:bg-zinc-900 shadow-xl overflow-y-auto border-l border-zinc-200 dark:border-zinc-800">
          {children}
        </aside>
      </div>
    </DrawerContext.Provider>,
    document.body
  );
}