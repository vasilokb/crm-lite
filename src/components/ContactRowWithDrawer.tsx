'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Drawer } from './Drawer';
import { DrawerHeader } from './DrawerHeader';
import { ContactForm } from './ContactForm';
import type { Account, Contact } from '@prisma/client';

type ContactFull = Contact & { account: any };

type Props = {
  contact: ContactFull;
};

export function ContactRowWithDrawer({ contact }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className="border-t border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
        onClick={() => setOpen(true)}
      >
        <td className="px-3 py-2 text-zinc-900 dark:text-zinc-50">
          <Link
            href={`/contacts/${contact.id}`}
            onClick={(e) => {
              e.preventDefault();
              setOpen(true);
            }}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
          >
            {contact.name}
          </Link>
        </td>
        <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{contact.email ?? '—'}</td>
        <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{contact.phone ?? '—'}</td>
        <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
          {contact.account ? (
            <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 text-xs border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
              {contact.account.name}
            </span>
          ) : (
            '—'
          )}
        </td>
      </tr>

      {open && (
        <Drawer onClose={() => setOpen(false)}>
          <DrawerHeader entity="contact" title={contact.name} />
          <div className="px-6">
            <ContactForm contact={contact} />
          </div>
        </Drawer>
      )}
    </>
  );
}