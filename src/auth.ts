import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // JWT обязателен для Credentials в Auth.js v5 (database-session не поддерживает Credentials).
  // activeOrganizationId всё ещё храним в БД (Session-таблица) и подтягиваем в jwt-callback.
  session: { strategy: 'jwt' },
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
    // При первом sign-in user есть — кладём id в token.
    // На каждом запросе — подтягиваем актуальный activeOrganizationId из последней активной Session.
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
      }
      if (token.id) {
        const userId = token.id as string;
        // Берём самую свежую активную Session пользователя (по expires desc).
        // switchWorkspace (A9) делает session.updateMany для всех живых сессий — этого достаточно.
        const s = await prisma.session.findFirst({
          where: { userId, expires: { gt: new Date() } },
          orderBy: { expires: 'desc' },
          select: { id: true, activeOrganizationId: true },
        });
        if (s && s.activeOrganizationId) {
          // Счастливый путь: Session есть и activeOrganizationId заполнен.
          token.activeOrganizationId = s.activeOrganizationId;
        } else {
          // Авто-выбор первой активной membership (для юзеров, у которых Session не создалась при signIn —
          // например, после миграции с database-session на JWT, или для свежезарегенных).
          const m = await prisma.membership.findFirst({
            where: { userId, status: 'active' },
            orderBy: { createdAt: 'asc' },
            select: { organizationId: true },
          });
          if (m) {
            const activeOrganizationId = m.organizationId;
            if (s) {
              await prisma.session.update({
                where: { id: s.id },
                data: { activeOrganizationId },
              });
            } else {
              await prisma.session.create({
                data: {
                  sessionToken: `jwt-${token.jti ?? userId}-${Date.now()}`,
                  userId,
                  expires: new Date(Date.now() + 30 * 864e5),
                  activeOrganizationId,
                },
              });
            }
            token.activeOrganizationId = activeOrganizationId;
          } else {
            token.activeOrganizationId = null;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).id = token.id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).activeOrganizationId = token.activeOrganizationId ?? null;
      return session;
    },
  },
});