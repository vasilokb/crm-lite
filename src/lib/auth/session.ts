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
  // (например, после db:reset или при стейл-cookie). Достаём первую активную membership напрямую.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = ((s.user as any).id ?? null) as string | null;
  if (!userId) throw new Error('NO_ACTIVE_ORG');
  const m = await prisma.membership.findFirst({
    where: { userId, status: 'active' },
    orderBy: { createdAt: 'asc' },
    select: { organizationId: true },
  });
  if (!m) throw new Error('NO_ACTIVE_ORG');
  return m.organizationId;
}

export async function getTenantPrisma() {
  return createTenantPrisma(await getCurrentOrgId());
}