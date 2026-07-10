# Phase A9b — Команда (members/invites) + профиль-меню + имя · F+B

> Продолжение A9. A9 закрыл механику (login/register/приём приглашения/switch). A9b закрывает **owner-side UI**, которого не было: управление командой, выход, имя сотрудника, «глазок» на паролях.
> **Контекст для агента:** прочитай [`auth-plan.md`](auth-plan.md) §2 (A9b), [`phase-a9-ui.md`](phase-a9-ui.md) (текущий auth UI), [`../../auth-architecture-v4.md`](../../auth-architecture-v4.md) §3 (роли owner/member), §7 (invite).

## 1. Что делаем
- **Профиль-меню в шапке + «Выйти»** (`signOut`).
- **«Глазок»** на password-полях (login/register/invite).
- **Поле «Имя»** (`User.name`, без миграции) в register и invite-accept.
- **Раздел «Команда» (`/team`):** участники, роли, исключение, отправка приглашений, висящие приглашения (отмена).

## 2. Решения (зафиксированы)
- **Роль = `owner`/`member` (2 уровня).** Гейтит **только** админку команды (owner-only: `invite`/`changeRole`/`removeMember`/`cancelInvite`). Данные — по org (оба видят ВСЁ). Тонких прав сейчас нет (перспектива).
- **Имя = одно поле `User.name`** (колонка уже есть, миграции нет). Вводится руками: owner при регистрации, сотрудник при приёме приглашения. Перестаём писать туда email.
- **Owner не может понизить/исключить себя** (защита от org без владельца).
- Кнопки управления в `/team` показываются только если текущий пользователь — `owner` активной org.

## 3. Ограничения
- **Сборка остаётся зелёной** (`tsc`+`lint`+`build` exit 0).
- Все мутации команды проверяют «текущий пользователь — `owner` активной org» → иначе `FORBIDDEN`.
- Prisma 6.19.3, без `@prisma/adapter-pg`. Не читать `.env`.

## 4. Бэкенд — `src/app/actions/team.ts` (server actions)
```ts
// helper (переиспользуется во всех мутациях)
async function assertOwnerOfCurrentOrg(): Promise<{ userId: string; organizationId: string }> {
  const user = await getCurrentUser();
  const organizationId = await getCurrentOrgId();
  const m = await prisma.membership.findFirst({
    where: { userId: user.id, organizationId, role: 'owner', status: 'active' },
  });
  if (!m) throw new Error('FORBIDDEN');
  return { userId: user.id, organizationId };
}

// чтение (для страницы /team)
export async function getMembers() { /* membership.findMany по getCurrentOrgId, include user */ }
export async function getInvites() { /* inviteToken.findMany по getCurrentOrgId */ }

// мутации (owner-only)
export async function changeRole(membershipId: string, role: 'owner' | 'member') {
  const { organizationId, userId } = await assertOwnerOfCurrentOrg();
  const target = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!target || target.organizationId !== organizationId) throw new Error('NOT_FOUND');
  if (target.userId === userId) throw new Error('CANNOT_CHANGE_SELF'); // не понизить себя
  await prisma.membership.update({ where: { id: membershipId }, data: { role } });
  revalidatePath('/team');
}
export async function removeMember(membershipId: string) {
  // assertOwner; target в этой org; target.userId !== userId; delete membership
}
export async function cancelInvite(inviteId: string) {
  // assertOwner; invite в этой org; delete inviteToken
}
// createInvite уже есть (src/app/actions/workspace.ts) — переиспользовать
```
`logout` (для профиль-меню) — серверная обёртка: `export async function logout() { await signOut({ redirectTo: '/login' }); }` (или вызывать `signOut` напрямую).

## 5. Фронтенд
- **`NavHeader`**: email справа → кнопка-меню → дропдаун: активная org (текст), «Команда» (`/team`), **«Выйти»** (вызывает `logout`). На guest-страницах меню не показывается. В `NAV_ITEMS` добавить `/team` → «Команда».
- **`PasswordInput`** (малый клиент-компонент): `<input type=password>` + кнопка 👁 toggle `password`↔`text`. Использовать в `LoginForm`, `RegisterForm`, `InviteForm`.
- **`register`**: в `RegisterForm` поле «Ваше имя» (`name`) → `registerAction` пишет `name` в `User.create`.
- **`invite-accept`**: в `InviteForm` поле «Имя» (`name`) → `acceptInviteAction` пишет `name` в `User.upsert`.
- **`/team` page** (server component): `getMembers()` + `getInvites()`; определяет, owner ли текущий (отдельный `getCurrentUser` + проверка role); owner → рендерит действия.
  - **Участники:** имя (`user.name`), email, роль (badge owner/member), действия «Сменить роль»/«Исключить» — только owner и **не для себя**.
  - **«Пригласить сотрудника»** (кнопка вверху) → модалка/инлайн-форма: `email` + `role` (select, default `member`) → `createInvite` → успех: при `RESEND_API_KEY` — «письмо отправлено», в dev — показать ссылку.
  - **Висящие приглашения:** email, роль, `expiresAt`, «Отменить» (`cancelInvite`), «Копировать ссылку» (dev).

## 6. Test-критерии
- `tsc`+`lint`+`build` exit 0; в карте маршрутов `/team`.
- **owner** на `/team`: видит участников + кнопки; приглашает → в dev видна ссылка → открыть `/invite/<token>` → принять (ввести имя+пароль) → новый участник появляется; «Сменить роль»/«Исключить» member работают; «Отменить приглашение» удаляет.
- **member** на `/team`: видит список **read-only** (без кнопок).
- owner **не может** исключить/понизить себя (`CANNOT_CHANGE_SELF`).
- «Выйти» → редирект на `/login`; повторный вход — ок.
- **Имя:** регистрация нового owner → `User.name` сохранён (не email); приём приглашения → `User.name` сохранён; шапка и `/team` показывают имя.
- «Глазок» toggles тип пароля на login/register/invite.
- Drawer-overlay для лидов/компаний/контактов/сделок не сломан.

## 7. Коммит
```bash
git add src/app/actions/team.ts src/app/team/ src/components/NavHeader.tsx src/components/PasswordInput.tsx 'src/app/register' 'src/app/invite'
git commit -m "feat(auth): team management UI + profile menu/logout + name field + password toggle — фаза A9b"
```
После Test — `[x]` в `auth-plan.md` §2 (A9b).
