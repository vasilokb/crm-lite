import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.findFirst({ select: { id: true, name: true, organizationId: true } });
  console.log('prisma.customer.findFirst OK:', customer);

  const account = await prisma.account.findFirst({ select: { id: true, provider: true } });
  console.log('prisma.account.findFirst OK:', account);
}

main().finally(() => prisma.$disconnect());