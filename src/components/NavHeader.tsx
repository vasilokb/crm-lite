'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'CRM-lite' },
  { href: '/leads',         label: 'Лиды' },
  { href: '/customers',     label: 'Компании' },
  { href: '/contacts',      label: 'Контакты' },
  { href: '/opportunities', label: 'Сделки' },
];

function navLinkClassNames(active: boolean): string {
  return [
    active
      ? 'text-violet-600 dark:text-violet-400 font-semibold'
      : 'text-zinc-500 dark:text-zinc-400',
    'hover:text-violet-600 dark:hover:text-violet-400',
  ].join(' ');
}

export function NavHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Закрывать мобильное меню при смене маршрута.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <nav className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6 text-sm">
        {/* Desktop-навигация: видна ≥768px (md) */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkClassNames(active)}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Burger-кнопка: видна <768px (md:hidden) */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
          className="md:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded text-zinc-600 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400"
        >
          {/* Текстовый значок без иконок и новых зависимостей */}
          <span aria-hidden="true" className="text-xl leading-none">{menuOpen ? '✕' : '☰'}</span>
        </button>
      </nav>

      {/* Выпадающая мобильная панель. Всегда в DOM (корректно для aria-controls), переключается hidden/block */}
      <div
        id="mobile-menu"
        className={`md:hidden border-t border-zinc-200 dark:border-zinc-800 ${menuOpen ? 'block' : 'hidden'}`}
      >
        <nav className="max-w-6xl mx-auto px-6 py-2 flex flex-col">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'w-full text-left min-h-[44px] flex items-center py-3 px-4 rounded',
                  active
                    ? 'text-violet-600 dark:text-violet-400 font-semibold bg-violet-50 dark:bg-violet-950/40'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
