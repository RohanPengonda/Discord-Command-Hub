import { prisma, getDbAvailable } from './prisma.js';
import { logger } from '../utils/logger.js';

const inMemoryInteractions = new Map<string, any>();

export class InteractionRepository {
  static async findInteraction(id: string) {
    if (!getDbAvailable()) {
      return inMemoryInteractions.get(id) || null;
    }

    try {
      return await prisma.processedInteraction.findUnique({
        where: { id },
        include: {
          commandLog: {
            include: {
              aiResult: true,
              notificationLog: true,
            },
          },
        },
      });
    } catch (err: any) {
      logger.warn('Database unreachable during findInteraction, using in-memory store fallback');
      return inMemoryInteractions.get(id) || null;
    }
  }

  static async recordInteraction(data: {
    id: string;
    type: number;
    commandName?: string;
    userId: string;
    username: string;
    serverId?: string;
    channelId?: string;
    token: string;
  }) {
    if (inMemoryInteractions.has(data.id)) {
      const dupError: any = new Error(`Duplicate interaction ID: ${data.id}`);
      dupError.code = 'P2002';
      throw dupError;
    }

    inMemoryInteractions.set(data.id, {
      ...data,
      processedAt: new Date(),
    });

    if (!getDbAvailable()) {
      return inMemoryInteractions.get(data.id);
    }

    try {
      return await prisma.processedInteraction.create({
        data: {
          id: data.id,
          type: data.type,
          commandName: data.commandName,
          userId: data.userId,
          username: data.username,
          serverId: data.serverId,
          channelId: data.channelId,
          token: data.token,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw err;
      }
      logger.warn(`Database connection error while recording interaction ${data.id}. Preserved in-memory.`, {
        error: err.message,
      });
      return inMemoryInteractions.get(data.id);
    }
  }

  static async isProcessed(id: string): Promise<boolean> {
    if (inMemoryInteractions.has(id)) {
      return true;
    }

    if (!getDbAvailable()) {
      return false;
    }

    try {
      const existing = await prisma.processedInteraction.findUnique({
        where: { id },
        select: { id: true },
      });
      return !!existing;
    } catch (err: any) {
      return inMemoryInteractions.has(id);
    }
  }
}
