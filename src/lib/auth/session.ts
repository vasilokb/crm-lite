import { auth } from '@/auth';
import { createTenantPrisma } from '@/lib/db';

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
  if (!orgId) throw new Error('NO_ACTIVE_ORG');
  return orgId;
}

export async function getTenantPrisma() {
  return createTenantPrisma(await getCurrentOrgId());
}