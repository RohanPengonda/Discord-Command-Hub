import { CommandStatus, PriorityLevel } from '@prisma/client';
import { prisma, getDbAvailable } from './prisma.js';
import { logger } from '../utils/logger.js';

const inMemoryLogs = new Map<string, any>();

export class LogRepository {
  static async createLog(data: {
    interactionId: string;
    serverId?: string;
    commandName: string;
    userId: string;
    username: string;
    rawOptions?: any;
    status?: CommandStatus;
    errorMessage?: string;
  }) {
    const log = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      interactionId: data.interactionId,
      serverId: data.serverId,
      commandName: data.commandName,
      userId: data.userId,
      username: data.username,
      rawOptions: data.rawOptions ?? {},
      status: data.status ?? CommandStatus.RECEIVED,
      errorMessage: data.errorMessage,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryLogs.set(log.id, log);

    if (!getDbAvailable()) {
      return log;
    }

    try {
      const created = await prisma.commandLog.create({
        data: {
          interactionId: data.interactionId,
          serverId: data.serverId,
          commandName: data.commandName,
          userId: data.userId,
          username: data.username,
          rawOptions: data.rawOptions ?? {},
          status: data.status ?? CommandStatus.RECEIVED,
          errorMessage: data.errorMessage,
        },
      });
      inMemoryLogs.set(created.id, created);
      return created;
    } catch (err: any) {
      logger.warn('Database unreachable while creating command log, saved in-memory', { error: err.message });
      return log;
    }
  }

  static async updateLogStatus(id: string, status: CommandStatus, errorMessage?: string) {
    const existing = inMemoryLogs.get(id);
    if (existing) {
      existing.status = status;
      if (errorMessage) existing.errorMessage = errorMessage;
      existing.updatedAt = new Date();
    }

    if (!getDbAvailable()) {
      return existing || { id, status, errorMessage };
    }

    try {
      return await prisma.commandLog.update({
        where: { id },
        data: {
          status,
          ...(errorMessage && { errorMessage }),
        },
      });
    } catch (err: any) {
      return existing || { id, status, errorMessage };
    }
  }

  static async attachAIResult(data: {
    commandLogId: string;
    summary: string;
    category: string;
    priority: PriorityLevel;
    rawAiOutput?: any;
  }) {
    const aiRes = {
      id: 'ai_' + Date.now(),
      commandLogId: data.commandLogId,
      summary: data.summary,
      category: data.category,
      priority: data.priority,
      rawAiOutput: data.rawAiOutput ?? {},
      createdAt: new Date(),
    };

    const log = inMemoryLogs.get(data.commandLogId);
    if (log) {
      log.aiResult = aiRes;
    }

    if (!getDbAvailable()) {
      return aiRes;
    }

    try {
      return await prisma.aIResult.create({
        data: {
          commandLogId: data.commandLogId,
          summary: data.summary,
          category: data.category,
          priority: data.priority,
          rawAiOutput: data.rawAiOutput ?? {},
        },
      });
    } catch (err: any) {
      return aiRes;
    }
  }

  static async attachNotificationLog(data: {
    commandLogId: string;
    channelId: string;
    channelType: string;
    status: string;
    errorMessage?: string;
    payload?: any;
  }) {
    const notif = {
      id: 'notif_' + Date.now(),
      commandLogId: data.commandLogId,
      channelId: data.channelId,
      channelType: data.channelType,
      status: data.status,
      errorMessage: data.errorMessage,
      payload: data.payload ?? {},
      sentAt: new Date(),
    };

    const log = inMemoryLogs.get(data.commandLogId);
    if (log) {
      log.notificationLog = notif;
    }

    if (!getDbAvailable()) {
      return notif;
    }

    try {
      return await prisma.notificationLog.create({
        data: {
          commandLogId: data.commandLogId,
          channelId: data.channelId,
          channelType: data.channelType,
          status: data.status,
          errorMessage: data.errorMessage,
          payload: data.payload ?? {},
        },
      });
    } catch (err: any) {
      return notif;
    }
  }

  static async getLogs(page = 1, limit = 20, filterStatus?: CommandStatus, filterCommand?: string) {
    if (!getDbAvailable()) {
      let memoryList = Array.from(inMemoryLogs.values());
      if (filterStatus) memoryList = memoryList.filter((l) => l.status === filterStatus);
      if (filterCommand) memoryList = memoryList.filter((l) => l.commandName === filterCommand);

      const total = memoryList.length;
      const paginated = memoryList.slice((page - 1) * limit, page * limit);
      return { logs: paginated, total, page, totalPages: Math.ceil(total / limit) };
    }

    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (filterStatus) where.status = filterStatus;
      if (filterCommand) where.commandName = filterCommand;

      const [logs, total] = await Promise.all([
        prisma.commandLog.findMany({
          where,
          include: {
            interaction: true,
            server: true,
            aiResult: true,
            notificationLog: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.commandLog.count({ where }),
      ]);

      return { logs, total, page, totalPages: Math.ceil(total / limit) };
    } catch (err: any) {
      let memoryList = Array.from(inMemoryLogs.values());
      if (filterStatus) memoryList = memoryList.filter((l) => l.status === filterStatus);
      if (filterCommand) memoryList = memoryList.filter((l) => l.commandName === filterCommand);

      const total = memoryList.length;
      const paginated = memoryList.slice((page - 1) * limit, page * limit);
      return { logs: paginated, total, page, totalPages: Math.ceil(total / limit) };
    }
  }

  static async getDashboardStats() {
    if (!getDbAvailable()) {
      const allLogs = Array.from(inMemoryLogs.values());
      return {
        totalCommands: allLogs.length,
        successfulCommands: allLogs.filter((l) => l.status === CommandStatus.SUCCESS).length,
        failedCommands: allLogs.filter((l) => l.status === CommandStatus.FAILED).length,
        deferredCommands: allLogs.filter((l) => l.status === CommandStatus.DEFERRED).length,
        totalAiProcessed: allLogs.filter((l) => l.aiResult).length,
        totalNotifications: allLogs.filter((l) => l.notificationLog?.status === 'SUCCESS').length,
      };
    }

    try {
      const totalCommands = await prisma.commandLog.count();
      const successfulCommands = await prisma.commandLog.count({
        where: { status: CommandStatus.SUCCESS },
      });
      const failedCommands = await prisma.commandLog.count({
        where: { status: CommandStatus.FAILED },
      });
      const deferredCommands = await prisma.commandLog.count({
        where: { status: CommandStatus.DEFERRED },
      });
      const totalAiProcessed = await prisma.aIResult.count();
      const totalNotifications = await prisma.notificationLog.count({
        where: { status: 'SUCCESS' },
      });

      return {
        totalCommands,
        successfulCommands,
        failedCommands,
        deferredCommands,
        totalAiProcessed,
        totalNotifications,
      };
    } catch (err: any) {
      const allLogs = Array.from(inMemoryLogs.values());
      return {
        totalCommands: allLogs.length,
        successfulCommands: allLogs.filter((l) => l.status === CommandStatus.SUCCESS).length,
        failedCommands: allLogs.filter((l) => l.status === CommandStatus.FAILED).length,
        deferredCommands: allLogs.filter((l) => l.status === CommandStatus.DEFERRED).length,
        totalAiProcessed: allLogs.filter((l) => l.aiResult).length,
        totalNotifications: allLogs.filter((l) => l.notificationLog?.status === 'SUCCESS').length,
      };
    }
  }
}
