'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Drawer } from './Drawer';
import { DrawerHeader } from './DrawerHeader';
import { Badge } from './Badge';
import { OpportunityForm } from './OpportunityForm';
import { StageProgressBar } from './StageProgressBar';
import type { Account, Contact, Opportunity, Stage } from '@prisma/client';

type OpportunityFull = Opportunity & {
  account: any;
  contact: any;
  stage: Stage;
};

type Props = {
  opportunity: OpportunityFull;
  stages: Stage[];
  accounts?: any[];
  contacts?: any[];
};

function formatAmount(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
}

export function OpportunityRowWithDrawer({ opportunity, stages }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className="border-t border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
        onClick={() => setOpen(true)}
      >
        <td className="px-3 py-2 text-zinc-900 dark:text-zinc-50">
          <Link
            href={`/opportunities/${opportunity.id}`}
            onClick={(e) => {
              e.preventDefault();
              setOpen(true);
            }}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
          >
            {opportunity.title}
          </Link>
        </td>
        <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300 tabular-nums">
          {formatAmount(opportunity.amount)}
        </td>
        <td className="px-3 py-2">
          <Badge variant={opportunity.stage.name as 'qualification' | 'proposal' | 'negotiation' | 'won' | 'lost'}>
            {opportunity.stage.name}
          </Badge>
        </td>
        <td className="px-3 py-2">
          <Badge variant={opportunity.status}>{opportunity.status}</Badge>
        </td>
        <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{opportunity.account?.name ?? '—'}</td>
        <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{opportunity.contact?.name ?? '—'}</td>
      </tr>

      {open && (
        <Drawer onClose={() => setOpen(false)}>
          <DrawerHeader
            entity="opportunity"
            title={opportunity.title}
            status={opportunity.status}
            stage={opportunity.stage.name}
          />
          <div className="px-6 pt-4">
            <h3 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Воронка</h3>
            <StageProgressBar
              opportunityId={opportunity.id}
              currentStageId={opportunity.stageId}
              stages={stages}
              opportunityAmount={opportunity.amount}
              opportunityContactId={opportunity.contactId}
            />
          </div>
          <div className="px-6">
            <OpportunityForm opportunity={opportunity} stages={stages} />
          </div>
        </Drawer>
      )}
    </>
  );
}