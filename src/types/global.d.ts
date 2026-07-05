declare global {
  var __db: import('@prisma/client').PrismaClient | undefined;
}

export {};