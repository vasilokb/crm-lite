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

// ===== A7: Tenant-aware Prisma client =====
// ПРИ ДОБАВЛЕНИИ tenant-сущности в schema.prisma — обязательно добавить имя модели
// (lowercase) в этот массив, иначе createTenantPrisma не фильтрует её по organizationId
// и изоляция молча ломается (arch §9.1).
const TENANT_MODELS = [
  'lead', 'customer', 'contact', 'opportunity', 'activity', 'stage',
  'product', 'lineItem', 'productComponent',
] as const;
const AUTO_WHERE = new Set(['findMany', 'findFirst', 'count', 'aggregate', 'groupBy', 'updateMany', 'deleteMany']);

// Фабрика: возвращает клиент, ограниченный одной организацией.
export function createTenantPrisma(orgId: string) {
  return prisma.$extends({
    name: 'tenant-scope',
    query: Object.fromEntries(
      TENANT_MODELS.map((model) => [
        model,
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          async $allOperations({ operation, args, query }: any) {
            if (operation === 'create') {
              args.data = { ...args.data, organizationId: orgId };            // инжект, перекрывает попытку подмены
            } else if (operation === 'createMany') {
              args.data = Array.isArray(args.data)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? args.data.map((d: any) => ({ ...d, organizationId: orgId }))
                : { ...args.data, organizationId: orgId };
            } else if (operation === 'upsert') {
              // where НЕ инжектится — вызывающий код обязан использовать compound-unique
              args.create = { ...args.create, organizationId: orgId };
              args.update = { ...args.update, organizationId: orgId };
            } else if (AUTO_WHERE.has(operation)) {
              args.where = { ...args.where, organizationId: orgId };
            }
            // update/delete (single) НЕ инжектятся → контракт: findFirst({id, organizationId}) → update({where:{id}})
            return query(args);
          },
        },
      ]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any,
  });
}