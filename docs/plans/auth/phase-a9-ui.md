# Phase A9 — Auth UI + workspace switch + route guards · F+B

> Детальный план для фазы A9 из [`auth-plan.md`](auth-plan.md) §9.
> **Контекст для агента:** прочитай [`../../auth-architecture-v4.md`](../../auth-architecture-v4.md) §7 + [`../../auth-implementation.md`](../../auth-implementation.md) §4.4. Фазы A5–A8 уже `[x]` (сборка зелёная).

## 1. Что делаем

UI аутентификации и tenancy: регистрация компании (owner), логин, приём приглашения, переключатель workspace, защита роутов через `(app)`-group + middleware.

> **Ключевое правило (исправление дефекта):** в транзакциях регистрации/приглашения **Session НЕ создаётся** — её создаёт `signIn` через адаптер Auth.js. `activeOrganizationId` выставляется session-callback'ом (фаза A5, авто-выбор при единственной активной membership). Ручное создание Session в транзакции = «мёртвая» сессия, на которую не указывает cookie.

## 2. Артефакты

### 2.1. Регистрация — `src/app/register/page.tsx` + action
```ts
// src/app/register/action.ts
'use server';
import { prisma } from '@/lib/db';
import { signIn } from '@/auth';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';

export async function registerCompany(formData: FormData) {
  // Zod-валидация ...
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const companyName = String(formData.get('companyName'));

  // slugify: Unicode-safe (включая кириллицу); + случайный суффикс для глобальной уникальности slug
  const slug = companyName.toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').slice(0, 40)
    + '-' + Math.random().toString(36).slice(2, 8);
  // Транзакция: User + Organization + Membership (БЕЗ Session!)
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email, passwordHash: bcrypt.hashSync(password, 10) } });
    const org = await tx.organization.create({ data: { name: companyName, slug } });
    await tx.membership.create({ data: { userId: user.id, organizationId: org.id, role: 'owner', status: 'active' } });
  });

  // signIn создаёт сессию через адаптер; session-callback (фаза A5)
  // авто-заполнит activeOrganizationId (у owner ровно одна membership)
  await signIn('credentials', { email, password, redirectTo: '/dashboard' });
  // redirect выполняется внутри signIn
}
```

### 2.2. Логин — `src/app/login/page.tsx`
Форма email/пароль → `signIn('credentials', { redirectTo: '/dashboard' })`.

### 2.3. Приглашение
- Создание (owner, server action):
```ts
const token = randomUUID();
await prisma.inviteToken.create({
  data: { organizationId: await getCurrentOrgId(), email, role, token, expiresAt: new Date(Date.now() + 7*864e5) },
});
const link = `${process.env.AUTH_URL}/invite/${token}`;
if (process.env.RESEND_API_KEY) {
  await resend.emails.send({ to: email, from: '...', subject: 'Приглашение', html: `<a href="${link}">Принять</a>` });
} else {
  console.log('[dev] invite link:', link);   // dev-fallback: тестировать без ключа Resend
}
```
- `src/app/invite/[token]/page.tsx`: валидация токена (срок, не использован) → форма (email предзаполнен, пароль).
- Принятие — action:
```ts
await prisma.$transaction(async (tx) => {
  const t = await tx.inviteToken.findFirst({ where: { token, expiresAt: { gt: new Date() } } });
  if (!t) throw new Error('invite_invalid');
  const user = await tx.user.upsert({ where: { email: t.email }, update: {}, create: { email: t.email, passwordHash: bcrypt.hashSync(password, 10) } });
  await tx.membership.upsert({ where: { userId_organizationId: { userId: user.id, organizationId: t.organizationId } }, update: {}, create: { userId: user.id, organizationId: t.organizationId, role: t.role, status: 'active' } });
  await tx.inviteToken.delete({ where: { id: t.id } });   // аннулировать
});
await signIn('credentials', { email, password, redirectTo: '/dashboard' });
// session-callback выставит activeOrganizationId (у нового member одна membership)
```

### 2.4. Переключение workspace — `src/app/(app)/actions/workspace.ts` (impl §4.4)
```ts
'use server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function switchWorkspace(organizationId: string) {
  const user = await getCurrentUser();
  const m = await prisma.membership.findFirst({ where: { userId: user.id, organizationId, status: 'active' } });
  if (!m) throw new Error('FORBIDDEN');
  await prisma.session.updateMany({
    where: { userId: user.id, expires: { gt: new Date() } },
    data: { activeOrganizationId: organizationId },
  });
  revalidatePath('/', 'layout');
}
```

### 2.5. Защита роутов
- `src/app/(app)/layout.tsx`: `const session = await auth(); if (!session) redirect('/login');`.
- Перенести бизнес-роуты (`/dashboard`, `/leads`, `/customers`, `/contacts`, `/opportunities`) внутрь `(app)`.
- `src/middleware.ts` (опц.) — редирект неавторизованных на `/login`; `/login`/`/register`/`/invite` доступны без сессии.
- **NavHeader на неавторизованных страницах:** `/login`/`/register`/`/invite` рендерятся вне `(app)`, поэтому `NavHeader` там **не должен** вызывать `getCurrentUser()`/`getCurrentOrgId()` (сессии нет → throw). Варианты: упрощённый `NavHeader` без данных пользователя в root-layout неавторизованных страниц, либо `try/catch` вокруг чтения сессии.

## 3. Порядок и риск Intercepting Routes
A9 ПОСЛЕ A5 (Auth.js) и A8 (actions/сборка). **Риск:** переезд сущностей под группу `(app)` может сломать Drawer-overlay (`home-work/Plan.md` §6.7), т.к. intercepting-routes `(.)` завязаны на относительное положение к parallel slot `@modal`. `@modal` остаётся на root-уровне `app/`. **Обязательно проверить** overlay/back/refresh после переезда; при поломке — пересчитать маркеры `(.)`/`(..)` или оставить intercept на корне.

## 4. Test-критерии

- `/register` (email + пароль + название компании) → owner залогинен, `getCurrentOrgId()` ≠ null (session-callback сработал).
- `/login` верный пароль → сессия; неверный → ошибка, редиректа нет.
- Приглашение: owner создаёт invite → сотрудник открывает `/invite/[token]` → регистрируется → залогинен в той org с ролью из токена; `getCurrentOrgId()` ≠ null.
- Просроченный/повторный токен → ошибка.
- Workspace switch: owner в 2 org → переключатель меняет данные; `switchWorkspace('чужаяOrg')` → `FORBIDDEN`.
- Неавторизованный → `/login`; `/login`/`/register`/`/invite` доступны без сессии.
- **Drawer не сломан** после переезда в `(app)`: overlay из списка, back, refresh, transition (по `home-work/Plan.md` §6.7).
- `npm run build` exit 0.

## 5. Коммит
```bash
git add 'src/app/login' 'src/app/register' 'src/app/invite' 'src/app/(app)' src/middleware.ts
git commit -m "feat(auth): register/login/invite UI, workspace switch, route guards — фаза A9"
```
После Test — `[x]` в `auth-plan.md` §2 (A9).
