'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'CRM-lite' },
  { href: '/leads',        label: 'Лиды' },
  { href: '/accounts',     label: 'Компании' },
  { href: '/contacts',     label: 'Контакты' },
  { href: '/opportunities', label: 'Сделки' },
];

export function NavHeader() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <nav className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6 text-sm">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                active
                  ? 'text-violet-600 dark:text-violet-400 font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400',
                'hover:text-violet-600 dark:hover:text-violet-400',
              ].join(' ')}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}