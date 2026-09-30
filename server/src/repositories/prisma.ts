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

export function setDbAvailable(available: boolean) {
  isDbAvailable = available;
}

export function getDbAvailable(): boolean {
  return isDbAvailable;
}

prisma.$on('error' as never, (e: any) => {
  logger.error('Prisma Error', { message: e.message });
});

prisma.$on('warn' as never, (e: any) => {
  logger.warn('Prisma Warning', { message: e.message });
});
