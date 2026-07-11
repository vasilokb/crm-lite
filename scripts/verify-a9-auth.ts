import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const failures: string[] = [];
  const check = (cond: unknown, label: string) => { if (!cond) failures.push(label); };

  const stamp = Date.now();
  const ownerEmail = `a9-smoke-${stamp}@test.local`;
  const password = 'demo1234';
  const companyName = `Smoke Co ${stamp}`;

  // === 1. Регистрация: User + Organization + Membership, NO Session ===
  const owner = await prisma.user.create({
    data: { email: ownerEmail, passwordHash: bcrypt.hashSync(password, 10), name: ownerEmail },
  });
  const slug = `smoke-${stamp}-` + Math.random().toString(36).slice(2, 8);
  const org = await prisma.organization.create({ data: { name: companyName, slug } });
  const m = await prisma.membership.create({
    data: { userId: owner.id, organizationId: org.id, role: 'owner', status: 'active' },
  });
  check(!!owner.id, 'register: user created');
  check(!!org.id, 'register: org created');
  check(m.role === 'owner' && m.status === 'active', 'register: membership owner/active');
  // CRUCIAL: никакой Session
  const sessionsAfterRegister = await prisma.session.count({ where: { userId: owner.id } });
  check(sessionsAfterRegister === 0, 'register: NO session created (Auth.js signIn сделает это)');

  // === 2. Симуляция session-callback (фаза A5): авто-выбор первой активной membership ===
  const sessionToken = 'a9-test-' + randomUUID();
  const createdSession = await prisma.session.create({
    data: {
      sessionToken,
      userId: owner.id,
      expires: new Date(Date.now() + 864e5),
      activeOrganizationId: null, // signIn создаст без activeOrganizationId — callback заполнит
    },
  });
  const callback = await prisma.session.findFirst({
    where: { userId: owner.id, expires: { gt: new Date() } },
    orderBy: { expires: 'desc' },
    select: { id: true, activeOrganizationId: true },
  });
  if (callback && !callback.activeOrganizationId) {
    const mFirst = await prisma.membership.findFirst({
      where: { userId: owner.id, status: 'active' },
      orderBy: { createdAt: 'asc' },
    });
    if (mFirst) {
      await prisma.session.update({
        where: { id: callback.id },
        data: { activeOrganizationId: mFirst.organizationId },
      });
    }
  }
  const finalSession = await prisma.session.findUnique({ where: { sessionToken } });
  check(finalSession?.activeOrganizationId === org.id, 'session-callback: activeOrganizationId set');

  // === 3. switchWorkspace: владелец во 2 org → переключение работает ===
  const org2 = await prisma.organization.create({
    data: { name: `Other Co ${stamp}`, slug: `other-${stamp}-` + Math.random().toString(36).slice(2, 8) },
  });
  await prisma.membership.create({
    data: { userId: owner.id, organizationId: org2.id, role: 'member', status: 'active' },
  });

  // switch в org2
  const switchMembership = await prisma.membership.findFirst({
    where: { userId: owner.id, organizationId: org2.id, status: 'active' },
  });
  check(!!switchMembership, 'switch: target membership exists');

  await prisma.session.updateMany({
    where: { userId: owner.id, expires: { gt: new Date() } },
    data: { activeOrganizationId: org2.id },
  });
  const afterSwitch = await prisma.session.findUnique({ where: { sessionToken } });
  check(afterSwitch?.activeOrganizationId === org2.id, 'switch: activeOrganizationId updated');

  // FORBIDDEN: чужая org
  const strangerOrg = await prisma.organization.create({
    data: { name: `Stranger ${stamp}`, slug: `stranger-${stamp}` },
  });
  const strangerCheck = await prisma.membership.findFirst({
    where: { userId: owner.id, organizationId: strangerOrg.id, status: 'active' },
  });
  check(strangerCheck === null, 'switch FORBIDDEN: no membership in stranger org → switchWorkspace throws');

  // === 4. Invite: создание + принятие ===
  const inviteEmail = `invitee-${stamp}@test.local`;
  const invitePassword = 'demo1234';
  const inviteToken = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 864e5);
  await prisma.inviteToken.create({
    data: {
      organizationId: org.id,
      email: inviteEmail,
      role: 'member',
      token: inviteToken,
      expiresAt,
    },
  });
  const inv = await prisma.inviteToken.findFirst({ where: { token: inviteToken, expiresAt: { gt: new Date() } } });
  check(!!inv, 'invite: token created and not expired');

  // acceptInviteAction: $transaction (find-or-create user + membership upsert + delete token)
  await prisma.$transaction(async (tx) => {
    const t = await tx.inviteToken.findFirst({ where: { token: inviteToken, expiresAt: { gt: new Date() } } });
    if (!t) throw new Error('invite_invalid');
    if (t.email !== inviteEmail) throw new Error('invite_email_mismatch');
    const passwordHash = bcrypt.hashSync(invitePassword, 10);
    const invitee = await tx.user.upsert({
      where: { email: inviteEmail },
      update: { passwordHash },
      create: { email: inviteEmail, passwordHash, name: inviteEmail },
    });
    await tx.membership.upsert({
      where: { userId_organizationId: { userId: invitee.id, organizationId: t.organizationId } },
      update: { status: 'active', role: t.role },
      create: { userId: invitee.id, organizationId: t.organizationId, role: t.role, status: 'active' },
    });
    await tx.inviteToken.delete({ where: { id: t.id } });
  });
  const invitee = await prisma.user.findUnique({ where: { email: inviteEmail } });
  const memberM = await prisma.membership.findFirst({
    where: { userId: invitee!.id, organizationId: org.id, status: 'active' },
  });
  check(!!invitee, 'invite: invitee user created');
  check(memberM?.role === 'member', 'invite: member role from token');
  const expiredCheck = await prisma.inviteToken.findUnique({ where: { id: inv!.id } });
  check(expiredCheck === null, 'invite: token аннулирован после принятия');

  // повторное использование токена → invite_invalid
  let doubleUseError = false;
  try {
    await prisma.$transaction(async (tx) => {
      const t = await tx.inviteToken.findFirst({ where: { token: inviteToken, expiresAt: { gt: new Date() } } });
      if (!t) throw new Error('invite_invalid');
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'invite_invalid') doubleUseError = true;
  }
  check(doubleUseError, 'invite: повторное использование → invite_invalid');

  // === Cleanup ===
  await prisma.inviteToken.deleteMany({ where: { email: { contains: stamp.toString() } } });
  await prisma.membership.deleteMany({ where: { organizationId: { in: [org.id, org2.id, strangerOrg.id] } } });
  await prisma.session.deleteMany({ where: { userId: { in: [owner.id, invitee!.id] } } });
  await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, inviteEmail] } } });
  await prisma.organization.deleteMany({ where: { id: { in: [org.id, org2.id, strangerOrg.id] } } });

  if (failures.length > 0) {
    console.error('FAIL:', failures);
    process.exit(1);
  }
  console.log('OK: register/session-callback/switchWorkspace/invite acceptance all passed');
}

main().finally(() => prisma.$disconnect());