import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { __db?: PrismaClient };

export const prisma =
  globalForPrisma.__db ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.__db = prisma;

const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);