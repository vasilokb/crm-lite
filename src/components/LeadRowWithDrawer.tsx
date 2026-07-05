'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from './Badge';
import { Drawer } from './Drawer';
import { DrawerHeader } from './DrawerHeader';
import { LeadForm } from './LeadForm';
import { ConvertLeadAccordion } from './ConvertLeadAccordion';
import type { Account, Contact, Lead } from '@prisma/client';

type Props = {
  lead: Lead;
  accounts: Account[];
  contacts: Contact[];
};

/**
 * LeadRowWithDrawer — клиентский компонент для строки таблицы лидов.
 *
 * Клик по строке (или по имени) → открывает Drawer overlay поверх
 * таблицы. Закрытие Drawer → возврат к списку.
 *
 * URL не меняется: остаёмся на /leads, чтобы таблица оставалась
 * видимой под Drawer.
 *
 * Прямой URL /leads/<id> (refresh/share-link) рендерит full-page
 * версию через app/leads/[id]/page.tsx.
 */
export function LeadRowWithDrawer({ lead, accounts, contacts }: Props) {
  const [open, setOpen] = useState(false);

  function openDrawer(): void {
    setOpen(true);
  }

  function close(): void {
    setOpen(false);
  }

  return (
    <>
      <tr
        className="border-t border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
        onClick={openDrawer}
      >
        <td className="px-3 py-2 text-zinc-900 dark:text-zinc-50">
          {/* Inner link для accessibility (открытие по Enter) и Cmd+Click */}
          <Link
            href={`/leads/${lead.id}`}
            onClick={(e) => {
              e.preventDefault();
              openDrawer();
            }}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
          >
            {lead.name}
          </Link>
        </td>
        <td className="px-3 py-2">
          <Badge variant={lead.source}>{lead.source}</Badge>
        </td>
        <td className="px-3 py-2">
          <Badge variant={lead.status}>{lead.status}</Badge>
        </td>
        <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{lead.company ?? '—'}</td>
        <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">
          {new Date(lead.createdAt).toLocaleDateString('ru-RU')}
        </td>
      </tr>

      {open && (
        <Drawer onClose={close}>
          <DrawerHeader
            entity="lead"
            title={lead.name}
            status={lead.status}
            source={lead.source}
          />
          <div className="px-6">
            <LeadForm lead={lead} accounts={accounts} contacts={contacts} />
          </div>
          <div className="px-6">
            <ConvertLeadAccordion
              leadId={lead.id}
              leadStatus={lead.status}
              defaultAccountName={lead.company ?? ''}
            />
          </div>
        </Drawer>
      )}
    </>
  );
}