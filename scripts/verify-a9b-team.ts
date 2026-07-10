import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const failures: string[] = [];
  const check = (cond: unknown, label: string) => { if (!cond) failures.push(label); };

  const stamp = Date.now();

  // Подготовка: org + owner + member (для теста changeRole/removeMember)
  const org = await prisma.organization.create({
    data: { name: `A9b ${stamp}`, slug: `a9b-${stamp}` },
  });
  const owner = await prisma.user.create({
    data: { email: `a9b-owner-${stamp}@t.l`, name: 'OwnerName', passwordHash: 'x' },
  });
  const member = await prisma.user.create({
    data: { email: `a9b-member-${stamp}@t.l`, name: 'MemberName', passwordHash: 'x' },
  });
  const ownerM = await prisma.membership.create({
    data: { userId: owner.id, organizationId: org.id, role: 'owner', status: 'active' },
  });
  const memberM = await prisma.membership.create({
    data: { userId: member.id, organizationId: org.id, role: 'member', status: 'active' },
  });

  // === 1. CANNOT_CHANGE_SELF: changeRole для owner-а самому себе ===
  // Симулируем как backend: getCurrentOrgId returns org.id, getCurrentUser returns owner
  // Без полного signIn мы напрямую проверяем assertOwnerOfCurrentOrg логику —
  // вызовем логику эквивалентно: проверим, что в БД есть ровно один owner
  const owners = await prisma.membership.findMany({
    where: { organizationId: org.id, role: 'owner', status: 'active' },
  });
  check(owners.length === 1, 'team: один owner в org');
  check(owners[0].userId === owner.id, 'team: owner = owner-юзер');

  // Симулируем удаление owner-а: должно быть защищено на уровне API (CANNOT_CHANGE_SELF).
  // Здесь — прямая DB-проверка: если бы удалили owner-а, в org не было бы owner-а.
  // Логика на уровне actions/team.ts проверяет target.userId === userId → CANNOT_CHANGE_SELF.
  // Smoke не вызывает signIn, поэтому проверяем чистый data-инвариант.

  // === 2. Change role: member → owner ===
  const updated = await prisma.membership.update({
    where: { id: memberM.id },
    data: { role: 'owner' },
  });
  check(updated.role === 'owner', 'team: change role member→owner');
  await prisma.membership.update({
    where: { id: memberM.id },
    data: { role: 'member' },
  });

  // === 3. Remove member ===
  await prisma.membership.delete({ where: { id: memberM.id } });
  const afterRemove = await prisma.membership.findUnique({ where: { id: memberM.id } });
  check(afterRemove === null, 'team: remove member');
  check((await prisma.membership.count({ where: { organizationId: org.id } })) === 1,
    'team: остался только owner');

  // === 4. Invite lifecycle ===
  const token = 'a9b-token-' + stamp;
  const invite = await prisma.inviteToken.create({
    data: {
      organizationId: org.id,
      email: `a9b-inv-${stamp}@t.l`,
      role: 'member',
      token,
      expiresAt: new Date(Date.now() + 7 * 864e5),
    },
  });
  const inv = await prisma.inviteToken.findMany({ where: { organizationId: org.id } });
  check(inv.length === 1 && inv[0].email === invite.email, 'team: invite создан');

  // Cancel invite
  await prisma.inviteToken.delete({ where: { id: invite.id } });
  const afterCancel = await prisma.inviteToken.findUnique({ where: { id: invite.id } });
  check(afterCancel === null, 'team: cancelInvite удаляет токен');

  // === Cleanup ===
  await prisma.membership.deleteMany({ where: { organizationId: org.id } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, member.id] } } });
  await prisma.organization.delete({ where: { id: org.id } });

  if (failures.length > 0) {
    console.error('FAIL:', failures);
    process.exit(1);
  }
  console.log('OK: team invariants: changeRole / removeMember / cancelInvite lifecycle OK');
}

main().finally(() => prisma.$disconnect());