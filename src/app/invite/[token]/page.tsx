import { prisma } from '@/lib/db';
import { InviteForm } from './InviteForm';

export const metadata = { title: 'Приглашение — CRM-lite' };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await prisma.inviteToken.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    include: { organization: true },
  });

  if (!invite) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm rounded border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-6">
          <h1 className="mb-2 text-xl font-bold text-rose-700 dark:text-rose-300">
            Приглашение недействительно
          </h1>
          <p className="text-sm text-rose-700/80 dark:text-rose-300/80">
            Срок действия ссылки истёк или она уже была использована.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Приглашение
        </h1>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Вас пригласили в компанию <strong>{invite.organization.name}</strong> с ролью{' '}
          <strong>{invite.role === 'owner' ? 'владелец' : 'участник'}</strong>. Задайте пароль
          для входа.
        </p>
        <InviteForm token={token} email={invite.email} />
      </div>
    </main>
  );
}