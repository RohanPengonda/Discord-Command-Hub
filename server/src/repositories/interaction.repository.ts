import { prisma, getDbAvailable } from './prisma.js';
import { logger } from '../utils/logger.js';

const inMemoryInteractions = new Map<string, any>();

export class InteractionRepository {
  // The unique primary key on interactionId makes this insert the idempotency check: a replay throws P2002.
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

    inMemoryInteractions.set(data.id, { ...data, processedAt: new Date() });

    if (!getDbAvailable()) {
      return inMemoryInteractions.get(data.id);
    }

    try {
      return await prisma.processedInteraction.create({ data });
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw err;
      }
      logger.warn(`Database unreachable while recording interaction ${data.id}, kept in-memory`, {
        error: err.message,
      });
      return inMemoryInteractions.get(data.id);
    }
  }
}