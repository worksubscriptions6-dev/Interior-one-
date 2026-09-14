import { PrismaClient } from '@prisma/client';

/**
 * One Prisma client per serverless container. Vercel reuses warm containers,
 * so caching this on globalThis stops us exhausting Supabase's pooler.
 * The pooled DATABASE_URL (pgbouncer, port 6543) is what the app talks to;
 * migrations use DIRECT_URL.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
