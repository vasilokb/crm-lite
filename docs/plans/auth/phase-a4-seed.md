# Phase A4 — Обновление seed под multi-tenant · D

> Детальный план для фазы A4 из [`../../auth-plan.md`](../../auth-plan.md) §9.
> **Контекст для агента:** прочитай [`../../auth-implementation.md`](../../auth-implementation.md) §3.4 + [`../../final-mvp.md`](../../final-mvp.md) §3.2. Фазы A1–A3 уже `[x]`.

## 1. Что делаем

После A2 все бизнес-таблицы имеют NOT NULL `organizationId`, но seed его не задаёт → `db:reset` упадёт. Обновляем `prisma/seed.ts`: создаём дефолтную Organization + owner User + Membership, всем seed-строкам проставляем `organizationId`.

## 2. Артефакты — правки `prisma/seed.ts`

В начале seed (после очистки) создать тенант-якорь:
```ts
import bcrypt from 'bcryptjs';
// ...
const org = await prisma.organization.upsert({
  where: { slug: 'demo-agency' },
  update: {},
  create: { name: 'Demo Agency', slug: 'demo-agency' },
});
const owner = await prisma.user.upsert({
  where: { email: 'owner@demo.agency' },
  update: {},
  create: { email: 'owner@demo.agency', name: 'Demo Owner', passwordHash: bcrypt.hashSync('demo1234', 10) },
});
await prisma.membership.upsert({
  where: { userId_organizationId: { userId: owner.id, organizationId: org.id } },
  update: {},
  create: { userId: owner.id, organizationId: org.id, role: 'owner', status: 'active' },
});
```

Затем ко всем созданиям бизнес-сущностей добавить `organizationId: org.id`:
- **Stage** (5 стадий): `organizationId: org.id`; ключ upsert — `[organizationId, name]`.
- **Account → Customer**: `prisma.account.create/upsert` → `prisma.customer.create/upsert` (+ `organizationId`).
- **Contact**: `+ organizationId: org.id`; уникальность `[organizationId, email]`.
- **Lead**: `+ organizationId: org.id`; `owner: 'строка'` → `ownerUserId: owner.id`.
- **Opportunity**, **Activity**: `+ organizationId: org.id`.

## 3. Порядок
A4 ПОСЛЕ A1–A3 (schema финальна: `Customer`, `organizationId`, per-tenant unique).

## 4. Test-критерии

```bash
npm run db:reset   # только после подтверждения пользователя
```
- Счётчики совпадают со спецификацией: **5** Stage / **4** Customer / **5** Contact / **6** Lead / **6** Opportunity / **8** Activity; ≥2 просроченные task (`dueDate < today`, `done=false`) + ≥2 на сегодня.
- `prisma studio`: каждая бизнес-строка имеет `organizationId = demo-agency`.
- `Lead.ownerUserId` → owner User (не пустая строка).
- per-tenant unique работает: можно создать второй Organization + Stage «qualification» без конфликта.
- Seed идемпотентен (повторный `db:seed` не дублирует).

## 5. Коммит
```bash
git add prisma/seed.ts
git commit -m "feat(db): seed под multi-tenant (default org + owner + organizationId) — фаза A4"
```
После Test — `[x]` в `auth-plan.md` §2 (A4).
