'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { switchWorkspace } from '@/app/actions/workspace';
import { logout } from '@/app/actions/team';

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'CRM-lite' },
  { href: '/leads',         label: 'Лиды' },
  { href: '/customers',     label: 'Компании' },
  { href: '/contacts',      label: 'Контакты' },
  { href: '/opportunities', label: 'Сделки' },
  { href: '/products',      label: 'Продукты' },
  { href: '/team',          label: 'Команда' },
];

export type MembershipForSwitcher = {
  organizationId: string;
  role: 'owner' | 'member';
  organization: { id: string; name: string };
};

type Props = {
  user?: { name?: string | null; email?: string | null };
  activeOrgId?: string | null;
  memberships?: MembershipForSwitcher[];
};

function navLinkClassNames(active: boolean): string {
  return [
    active
      ? 'text-violet-600 dark:text-violet-400 font-semibold'
      : 'text-zinc-500 dark:text-zinc-400',
    'hover:text-violet-600 dark:hover:text-violet-400',
  ].join(' ');
}

export function NavHeader({ user, activeOrgId, memberships }: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pending, start] = useTransition();

  // Закрывать мобильное меню при смене маршрута.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
    setSwitcherOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  function handleSwitch(orgId: string): void {
    start(async () => {
      try {
        await switchWorkspace(orgId);
        window.location.reload();
      } catch (e) {
        console.error('switchWorkspace failed', e);
      }
    });
  }

  function handleLogout(): void {
    start(async () => {
      try {
        await logout();
      } catch (e) {
        if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e;
        console.error('logout failed', e);
        window.location.href = '/login';
      }
    });
  }

  const activeMembership = memberships?.find((m) => m.organizationId === activeOrgId);
  const showSwitcher = Boolean(user && memberships && memberships.length > 0);
  const showProfileMenu = Boolean(user);
  const displayName = user?.name?.trim() || user?.email;

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <nav className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6 text-sm">
        {/* Desktop-навигация: видна ≥768px (md) */}
        <div className="hidden md:flex items-center gap-6 flex-1">
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

        {/* Workspace switcher */}
        {showSwitcher && (
          <div className="hidden md:block relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen((o) => !o)}
              aria-expanded={switcherOpen}
              aria-haspopup="menu"
              disabled={pending}
              className="inline-flex items-center gap-1 rounded border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                org:
              </span>
              <span className="font-medium">{activeMembership?.organization.name ?? '—'}</span>
              <span aria-hidden="true">▾</span>
            </button>
            {switcherOpen && (
              <ul
                role="menu"
                className="absolute right-0 top-full mt-1 z-40 min-w-[200px] rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg py-1"
              >
                {memberships!.map((m) => (
                  <li key={m.organizationId} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleSwitch(m.organizationId)}
                      disabled={pending || m.organizationId === activeOrgId}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {m.organization.name}
                      <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
                        ({m.role === 'owner' ? 'владелец' : 'участник'})
                      </span>
                      {m.organizationId === activeOrgId && (
                        <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400">✓</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Profile menu (email / «Команда» / «Выйти») */}
        {showProfileMenu ? (
          <div className="hidden md:block relative">
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              disabled={pending}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 max-w-[180px] truncate"
              title={displayName ?? ''}
            >
              <span className="truncate">{displayName}</span>
              <span aria-hidden="true">▾</span>
            </button>
            {profileOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 z-40 min-w-[220px] rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg py-1"
              >
                <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                    {user?.name?.trim() || user?.email}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {user?.email}
                  </p>
                </div>
                <Link
                  href="/team"
                  role="menuitem"
                  className="block px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Команда
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={pending}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 text-rose-700 dark:text-rose-400"
                >
                  {pending ? 'Выходим…' : 'Выйти'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="hidden md:inline text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Войти
          </Link>
        )}

        {/* Burger-кнопка: видна <768px (md:hidden) */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
          className="md:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded text-zinc-600 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400"
        >
          <span aria-hidden="true" className="text-xl leading-none">{menuOpen ? '✕' : '☰'}</span>
        </button>
      </nav>

      {/* Выпадающая мобильная панель. */}
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

          {showSwitcher && (
            <div className="mt-2 border-t border-zinc-100 dark:border-zinc-800 px-4 py-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">
                Компания
              </p>
              {memberships!.map((m) => (
                <button
                  key={m.organizationId}
                  type="button"
                  onClick={() => handleSwitch(m.organizationId)}
                  disabled={pending || m.organizationId === activeOrgId}
                  className="w-full text-left py-2 text-sm disabled:opacity-50"
                >
                  {m.organization.name}
                  {m.organizationId === activeOrgId && (
                    <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {user ? (
            <>
              <p className="mt-2 border-t border-zinc-100 dark:border-zinc-800 px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {user.name?.trim() || user.email}
              </p>
              <button
                type="button"
                onClick={handleLogout}
                disabled={pending}
                className="w-full text-left px-4 py-3 text-sm text-rose-700 dark:text-rose-400 border-t border-zinc-100 dark:border-zinc-800 disabled:opacity-50"
              >
                {pending ? 'Выходим…' : 'Выйти'}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="mt-2 border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 text-sm text-indigo-600 dark:text-indigo-400"
              onClick={() => setMenuOpen(false)}
            >
              Войти
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}