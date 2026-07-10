'use server';

import { prisma } from '@/lib/db';
import { getCurrentUser, getCurrentOrgId } from '@/lib/auth/session';
import { signOut } from '@/auth';
import { revalidatePath } from 'next/cache';

type Role = 'owner' | 'member';

async function assertOwnerOfCurrentOrg(): Promise<{ userId: string; organizationId: string }> {
  const user = await getCurrentUser();
  const userId = (user as { id?: string }).id;
  if (!userId) throw new Error('UNAUTHENTICATED');
  const organizationId = await getCurrentOrgId();
  const m = await prisma.membership.findFirst({
    where: { userId, organizationId, role: 'owner', status: 'active' },
  });
  if (!m) throw new Error('FORBIDDEN');
  return { userId, organizationId };
}

export async function getMembers() {
  const organizationId = await getCurrentOrgId();
  return prisma.membership.findMany({
    where: { organizationId, status: 'active' },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getInvites() {
  const organizationId = await getCurrentOrgId();
  return prisma.inviteToken.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function changeRole(membershipId: string, role: Role) {
  const { userId, organizationId } = await assertOwnerOfCurrentOrg();
  const target = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!target || target.organizationId !== organizationId) throw new Error('NOT_FOUND');
  if (target.userId === userId) throw new Error('CANNOT_CHANGE_SELF');
  await prisma.membership.update({ where: { id: membershipId }, data: { role } });
  revalidatePath('/team');
}

export async function removeMember(membershipId: string) {
  const { userId, organizationId } = await assertOwnerOfCurrentOrg();
  const target = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!target || target.organizationId !== organizationId) throw new Error('NOT_FOUND');
  if (target.userId === userId) throw new Error('CANNOT_CHANGE_SELF');
  await prisma.membership.delete({ where: { id: membershipId } });
  revalidatePath('/team');
}

export async function cancelInvite(inviteId: string) {
  const { organizationId } = await assertOwnerOfCurrentOrg();
  const inv = await prisma.inviteToken.findUnique({ where: { id: inviteId } });
  if (!inv || inv.organizationId !== organizationId) throw new Error('NOT_FOUND');
  await prisma.inviteToken.delete({ where: { id: inviteId } });
  revalidatePath('/team');
}

export async function logout() {
  await signOut({ redirectTo: '/login' });
}