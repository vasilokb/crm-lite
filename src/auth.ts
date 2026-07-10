import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const user = await prisma.user.findUnique({ where: { email: creds!.email as string } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(creds!.password as string, user.passwordHash);
        return ok ? { id: user.id, email: user.email, name: user.name } : null;
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      session.user = { ...session.user, id: user.id };
      // activeOrganizationId живёт на Session; если пусто — авто-выбор первой активной membership
      // (owner после register / member после invite имеют одну активную org)
      const active = await prisma.session.findFirst({
        where: { userId: user.id, expires: { gt: new Date() } },
        orderBy: { expires: 'desc' },
        select: { id: true, activeOrganizationId: true },
      });
      if (active && !active.activeOrganizationId) {
        const m = await prisma.membership.findFirst({
          where: { userId: user.id, status: 'active' },
          orderBy: { createdAt: 'asc' },
        });
        if (m) {
          await prisma.session.update({ where: { id: active.id }, data: { activeOrganizationId: m.organizationId } });
          active.activeOrganizationId = m.organizationId;
        }
      }
      (session.user as any).activeOrganizationId = active?.activeOrganizationId ?? null;
      return session;
    },
  },
});