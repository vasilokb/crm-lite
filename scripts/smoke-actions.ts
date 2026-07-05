import { createLead, updateLead, getLead, getLeads } from '../src/lib/leads';
import { createAccount, getAccount, getAccounts } from '../src/lib/accounts';
import { createContact, getContact, getContacts } from '../src/lib/contacts';
import {
  createOpportunity,
  updateOpportunity,
  getOpportunity,
  getOpportunities,
} from '../src/lib/opportunities';
import { createActivity, toggleActivityDone, getActivities } from '../src/lib/activities';
import { prisma } from '../src/lib/db';

async function run(): Promise<void> {
  const failures: string[] = [];
  const check = (cond: unknown, label: string): void => {
    if (!cond) failures.push(label);
  };

  // === Lead — позитивный (все обязательные поля заполнены валидно)
  const l = await createLead({
    name:     'Test Lead',
    source:   'site',
    status:   'new',
    email:    'test@example.com',
    phone:    '',
    company:  '',
    budget:   '',
    timeline: '',
    comment:  '',
  });
  check(l.ok === true, 'createLead valid → ok');
  const leadId = l.ok ? l.data.id : null;

  // === Lead — негативный (name='' → fieldErrors.name)
  const lBad = await createLead({
    name:     '',
    source:   'site',
    status:   'new',
    email:    '',
    phone:    '',
    company:  '',
    budget:   '',
    timeline: '',
    comment:  '',
  });
  check(
    lBad.ok === false && Boolean(lBad.fieldErrors?.name),
    'createLead invalid name → fieldErrors.name'
  );

  // === toggleActivityDone Zod (D3)
  const t = await toggleActivityDone({ id: 'x' as never, done: 'yes' as never });
  check(
    t.ok === false && Boolean(t.fieldErrors?.done),
    'toggleActivityDone Zod (done: "yes") → fieldErrors.done'
  );

  // === Read-функции — sanity check (revalidatePath в них не вызывается)
  const leadsList = await getLeads({ page: 1, limit: 50 });
  check(Array.isArray(leadsList.items), 'getLeads returns array');

  const accountsList = await getAccounts({ page: 1, limit: 50 });
  check(Array.isArray(accountsList.items), 'getAccounts returns array');

  const contactsList = await getContacts({ page: 1, limit: 50 });
  check(Array.isArray(contactsList.items), 'getContacts returns array');

  const oppsList = await getOpportunities({ page: 1, limit: 50 });
  check(Array.isArray(oppsList.items), 'getOpportunities returns array');

  // === Очистка
  await prisma.lead.deleteMany({ where: { name: { startsWith: 'Test Lead' } } });

  if (failures.length > 0) {
    console.error('Smoke FAIL:');
    for (const f of failures) console.error('  - ' + f);
    process.exit(1);
  }
  console.log('Smoke: все action возвращают ожидаемые структуры');
}

run()
  .catch((e: unknown) => {
    console.error('Smoke EXCEPTION:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());