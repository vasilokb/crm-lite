import { auth } from '@/auth';
import { createTenantPrisma, prisma } from '@/lib/db';

export async function getCurrentUser() {
  const s = await auth();
  if (!s?.user) throw new Error('UNAUTHENTICATED');
  return s.user;
}

export async function getCurrentOrgId(): Promise<string> {
  const s = await auth();
  if (!s?.user) throw new Error('UNAUTHENTICATED');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgId = (s.user as any).activeOrganizationId as string | null | undefined;
  if (orgId) return orgId;

  // Defensive fallback: JWT-callback иногда не прокидывает activeOrganizationId
  // (после db:reset, при стейл-cookie, при смене user.id в БД).
  // Стратегия поиска membership (по убыванию надёжности):
  // 1) по userId из JWT
  // 2) по email из JWT — резерв на случай, если userId из JWT устарел (до db:reset)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = s.user as any;
  let m = u.id
    ? await prisma.membership.findFirst({
        where: { userId: u.id, status: 'active' },
        orderBy: { createdAt: 'asc' },
        select: { organizationId: true },
      })
    : null;
  if (!m && u.email) {
    const userRow = await prisma.user.findUnique({
      where: { email: u.email },
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
  if (!m) throw new Error('NO_ACTIVE_ORG');
  return m.organizationId;
}

export async function getTenantPrisma() {
  return createTenantPrisma(await getCurrentOrgId());
}