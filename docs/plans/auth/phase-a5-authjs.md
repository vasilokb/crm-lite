# Phase A5+A6 — Auth.js v5 + контекст сессии · B

> Детальный план для фаз A5 и A6 из [`../../auth-plan.md`](../../auth-plan.md) §9.
> **Контекст для агента:** прочитай [`../../auth-architecture-v4.md`](../../auth-architecture-v4.md) §4 + [`../../auth-implementation.md`](../../auth-implementation.md) §4.2, §4.3. Фазы A1–A4 уже `[x]`.

## 1. Что делаем

Подключить Auth.js v5: Credentials provider (email/пароль), Prisma adapter, database-session. Реализовать session-callback, который прокидывает `activeOrganizationId` в `session.user`. Создать helpers `getCurrentUser` / `getCurrentOrgId`.

> **Gotcha (v4 §9, impl §5.4):** `activeOrganizationId` лежит на модели `Session`, а не `User`. Без явного подтягивания в callback `getCurrentOrgId()` всегда падает с `NO_ACTIVE_ORG`.

## 2. Артефакты

**Зависимости:**
```bash
npm i next-auth @auth/prisma-adapter bcryptjs resend && npm i -D @types/bcryptjs
```

**`src/auth.ts`** (полный код — `auth-implementation.md` §4.3):
```ts
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
      // activeOrganizationId на Session; если пусто — авто-выбор первой активной membership
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
```
> Альтернатива при нескольких одновременных сессиях: денормализовать `activeOrganizationId` на `User` (обновлять в `switchWorkspace`) — тогда callback читает его из `user` напрямую.

**`src/app/api/auth/[...nextauth]/route.ts`:**
```ts
export { GET, POST } from '@/auth';
```

**`src/lib/auth/session.ts`** (impl §4.2):
```ts
import { auth } from '@/auth';
export async function getCurrentUser() {
  const s = await auth();
  if (!s?.user) throw new Error('UNAUTHENTICATED');
  return s.user;
}
export async function getCurrentOrgId(): Promise<string> {
  const s = await auth();
  if (!s?.user) throw new Error('UNAUTHENTICATED');
  const orgId = (s.user as any).activeOrganizationId as string | null | undefined;
  if (!orgId) throw new Error('NO_ACTIVE_ORG');
  return orgId;
}
```

**`.env`** (в `.gitignore`): `AUTH_SECRET`, `AUTH_URL=http://localhost:3001`. В `.env.example` — плейсхолдеры.

## 3. Порядок
После A5+A6 авторизация работает, но login/register UI — фаза A9. Здесь проверяем через smoke/tsx.

## 4. Test-критерии (scoped — whole-project `tsc` восстановится в A8)

- Smoke (tsx): создать User (passwordHash) → `authorize({email,password})` возвращает пользователя; неверный пароль → `null`.
- Smoke (tsx): вставить Session с `activeOrganizationId=null` + Membership(user,org,active) → воспроизвести логику callback (или прочитать `getCurrentOrgId()`) → `activeOrganizationId` авто-заполнен, `getCurrentOrgId()` возвращает org.
- Полный тест login-флоу — в A9 (с реальным `/login`).

## 5. Коммит
```bash
git add src/auth.ts src/app/api/auth '[...nextauth]/route.ts' src/lib/auth/session.ts package.json .env.example
git commit -m "feat(auth): Auth.js v5 + database-session + getCurrentUser/getCurrentOrgId — фазы A5,A6"
```
После Test — `[x]` в `auth-plan.md` §2 (A5, A6).
