import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'owner@demo.agency' } });
  console.log('user:', !!user, 'hash:', !!user?.passwordHash);
  console.log('authorize ok:', await bcrypt.compare('demo1234', user!.passwordHash!));
  console.log('authorize wrong:', await bcrypt.compare('nope', user!.passwordHash!));

  await prisma.session.deleteMany({ where: { userId: user!.id } });
  await prisma.session.create({
    data: {
      sessionToken: 'smoke-tmp',
      userId: user!.id,
      expires: new Date(Date.now() + 86_400_000),
      activeOrganizationId: null,
    },
  });
  const active = await prisma.session.findFirst({
    where: { userId: user!.id, expires: { gt: new Date() } },
    orderBy: { expires: 'desc' },
    select: { id: true, activeOrganizationId: true },
  });
  if (active && !active.activeOrganizationId) {
    const m = await prisma.membership.findFirst({
      where: { userId: user!.id, status: 'active' },
      orderBy: { createdAt: 'asc' },
    });
    if (m) {
      await prisma.session.update({
        where: { id: active.id },
        data: { activeOrganizationId: m.organizationId },
      });
    }
  }
  const s = await prisma.session.findFirst({ where: { userId: user!.id } });
  console.log('activeOrganizationId auto-filled:', s?.activeOrganizationId);
  await prisma.session.deleteMany({ where: { userId: user!.id } });
}

main().finally(() => prisma.$disconnect());