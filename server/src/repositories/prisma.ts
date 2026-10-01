import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

// Default isDbAvailable to false during unit test mode unless explicitly enabled with real DB
let isDbAvailable = process.env.NODE_ENV !== 'test';

export async function checkDbConnection(): Promise<boolean> {
  if (process.env.NODE_ENV === 'test') {
    return isDbAvailable;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbAvailable = true;
    return true;
  } catch (err) {
    isDbAvailable = false;
    return false;
  }
}

export function getDbAvailable(): boolean {
  return isDbAvailable;
}

// Neon scales to zero, so one failed boot probe would otherwise leave every repository on its empty in-memory fallback forever.
export function startDbReconnectMonitor(intervalMs = 30_000): void {
  if (isDbAvailable) return;

  const timer = setInterval(async () => {
    try {
      await prisma.$connect();
      const recovered = await checkDbConnection();
      if (recovered) {
        logger.info('Database connection recovered. Resuming persistent reads and writes.');
        clearInterval(timer);
      }
    } catch (err: any) {
      logger.warn('Database still unreachable, will retry', { error: err.message });
    }
  }, intervalMs);

  // Never hold the process open just for the health check.
  if (typeof timer.unref === 'function') timer.unref();
}

prisma.$on('error' as never, (e: any) => {
  logger.error('Prisma Error', { message: e.message });
});

prisma.$on('warn' as never, (e: any) => {
  logger.warn('Prisma Warning', { message: e.message });
});
