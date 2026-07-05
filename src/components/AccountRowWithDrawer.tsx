'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Drawer } from './Drawer';
import { DrawerHeader } from './DrawerHeader';
import { AccountForm } from './AccountForm';
import { DrawerRelatedList } from './DrawerRelatedList';
import type { Account, Contact, Opportunity, Stage } from '@prisma/client';

type AccountFull = Account & {
  _count?: { contacts: number; opportunities: number };
  contacts?: any[];
  opportunities?: any[];
};

type Props = {
  account: AccountFull;
};

export function AccountRowWithDrawer({ account }: Props) {
  const [open, setOpen] = useState(false);

  const relatedItems = [
    { label: 'Контакты',      href: '#contacts',      count: account.contacts?.length ?? account._count?.contacts ?? 0 },
    { label: 'Сделки',        href: '#opportunities', count: account.opportunities?.length ?? account._count?.opportunities ?? 0 },
  ];

  return (
    <>
      <tr
        className="border-t border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
        onClick={() => setOpen(true)}
      >
        <td className="px-3 py-2 text-zinc-900 dark:text-zinc-50">
          <Link
            href={`/accounts/${account.id}`}
            onClick={(e) => {
              e.preventDefault();
              setOpen(true);
            }}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
          >
            {account.name}
          </Link>
        </td>
        <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
          {account.website ? (
            <a href={account.website} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              {account.website}
            </a>
          ) : (
            '—'
          )}
        </td>
        <td className="px-3 py-2">
          <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-950/40 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
            {account.contacts?.length ?? account._count?.contacts ?? 0}
          </span>
        </td>
        <td className="px-3 py-2">
          <span className="inline-flex items-center rounded-full bg-sky-100 dark:bg-sky-950/40 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
            {account.opportunities?.length ?? account._count?.opportunities ?? 0}
          </span>
        </td>
      </tr>

      {open && (
        <Drawer onClose={() => setOpen(false)}>
          <DrawerHeader entity="account" title={account.name} />
          <div className="px-6">
            <AccountForm account={account} />
          </div>
          <DrawerRelatedList title="Связи" items={relatedItems} context="inside-drawer" />
        </Drawer>
      )}
    </>
  );
}