import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { createTenantPrisma, prisma } from '@/lib/db';

export async function getCurrentUser() {
  const s = await auth();
  if (!s?.user) {
    console.warn('[auth] no session → /login');
    redirect('/login');
  }
  return s!.user;
}

export async function getCurrentOrgId(): Promise<string> {
  const s = await auth();
  if (!s?.user) {
    console.warn('[auth] no session → /login');
    redirect('/login');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userAny = s!.user as any;
  const orgId = userAny.activeOrganizationId as string | null | undefined;
  if (orgId) return orgId;

  // Defensive fallback: JWT-callback иногда не прокидывает activeOrganizationId
  // (после db:reset, при стейл-cookie, при смене user.id в БД).
  // Стратегия поиска membership (по убыванию надёжности):
  // 1) по userId из JWT
  // 2) по email из JWT — резерв на случай, если userId из JWT устарел (до db:reset)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = s!.user as any;
  const userId = u.id as string | undefined;
  const email = u.email as string | undefined;
  let m = userId
    ? await prisma.membership.findFirst({
        where: { userId, status: 'active' },
        orderBy: { createdAt: 'asc' },
        select: { organizationId: true },
      })
    : null;
  if (!m && email) {
    const userRow = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (userRow) {
      m = await prisma.membership.findFirst({
        where: { userId: userRow.id, status: 'active' },
        orderBy: { createdAt: 'asc' },
        select: { organizationId: true },
      });
    }
  }
  if (!m) {
    console.warn('[auth] no membership → /login', { userId, email });
    redirect('/login');
  }
  return m.organizationId;
}

export async function getTenantPrisma() {
  return createTenantPrisma(await getCurrentOrgId());
}