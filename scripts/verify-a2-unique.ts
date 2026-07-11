import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirstOrThrow({ orderBy: { createdAt: 'asc' } });
  console.log('Demo Agency org id:', org.id);

  // 1. Same [org, name] -> should fail P2002
  const baseName = 'test-tenant-unique-' + Date.now();
  await prisma.stage.create({
    data: { name: baseName, position: 999, organizationId: org.id },
  });
  console.log('Stage created with name:', baseName);
  try {
    await prisma.stage.create({
      data: { name: baseName, position: 1000, organizationId: org.id },
    });
    console.error('FAIL: duplicate [org,name] was allowed');
    process.exitCode = 1;
  } catch (err: any) {
    if (err?.code === 'P2002') {
      console.log('OK: duplicate [org,name] rejected with P2002');
    } else {
      console.error('FAIL: unexpected error:', err);
      process.exitCode = 1;
    }
  }

  // 2. Same [org, position] -> should fail P2002
  try {
    await prisma.stage.create({
      data: { name: baseName + '-2', position: 999, organizationId: org.id },
    });
    console.error('FAIL: duplicate [org,position] was allowed');
    process.exitCode = 1;
  } catch (err: any) {
    if (err?.code === 'P2002') {
      console.log('OK: duplicate [org,position] rejected with P2002');
    } else {
      console.error('FAIL: unexpected error:', err);
      process.exitCode = 1;
    }
  }

  // 3. Different org -> OK (we'll insert a temp 2nd org for this)
  const org2 = await prisma.organization.create({
    data: { name: 'Test Org 2', slug: 'test-org-2-' + Date.now() },
  });
  try {
    await prisma.stage.create({
      data: { name: baseName, position: 999, organizationId: org2.id },
    });
    console.log('OK: same [name,position] with different org allowed');
  } catch (err: any) {
    console.error('FAIL: same name+position in different org was blocked:', err);
    process.exitCode = 1;
  }

  // cleanup
  await prisma.stage.deleteMany({ where: { name: { startsWith: baseName } } });
  await prisma.organization.delete({ where: { id: org2.id } });
  console.log('Cleanup done');
}

main().finally(() => prisma.$disconnect());