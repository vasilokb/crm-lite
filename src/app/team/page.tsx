import { prisma } from '@/lib/db';
import { getCurrentUser, getCurrentOrgId } from '@/lib/auth/session';
import { getMembers, getInvites } from '@/app/actions/team';
import { InviteForm, MembersTable, InvitesList } from './TeamControls';

export const metadata = { title: 'Команда — CRM-lite' };
export const revalidate = 0;

export default async function TeamPage() {
  const user = await getCurrentUser();
  const organizationId = await getCurrentOrgId();
  const userId = (user as { id?: string }).id;
  if (!userId) throw new Error('UNAUTHENTICATED');

  const [membership, members, invites] = await Promise.all([
    prisma.membership.findFirst({
      where: { userId, organizationId, status: 'active' },
    }),
    getMembers(),
    getInvites(),
  ]);

  const isOwner = membership?.role === 'owner';

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Команда</h1>
        {isOwner && <InviteForm />}
      </header>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Участники ({members.length})
        </h2>
        <MembersTable
          members={members.map((m) => ({
            id: m.id,
            role: m.role as 'owner' | 'member',
            user: {
              id: m.user.id,
              name: m.user.name,
              email: m.user.email,
            },
          }))}
          currentUserId={userId}
          isOwner={isOwner}
        />
      </section>

      {isOwner && invites.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Висящие приглашения ({invites.length})
          </h2>
          <InvitesList
            invites={invites.map((inv) => ({
              id: inv.id,
              email: inv.email,
              role: inv.role as 'owner' | 'member',
              expiresAt: inv.expiresAt,
              token: inv.token,
            }))}
            isOwner={isOwner}
            currentUserId={userId}
          />
        </section>
      )}
    </main>
  );
}