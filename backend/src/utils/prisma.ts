// VaultFinance — Prisma Client Singleton
// © 2025 VaultFinance. All Rights Reserved.

import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

if (process.env.NODE_ENV !== 'production') {
  prisma.$on('error' as never, (e: any) => {
    logger.error('Prisma error:', e);
  });

  prisma.$on('warn' as never, (e: any) => {
    logger.warn('Prisma warning:', e);
  });
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
