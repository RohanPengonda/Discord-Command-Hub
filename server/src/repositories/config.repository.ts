import { prisma, getDbAvailable } from './prisma.js';
import { logger } from '../utils/logger.js';
import { COMMAND_NAMES, DEFAULT_COMMAND_SETTINGS } from '../services/discord/command_definitions.js';

const inMemoryConfigs = new Map<string, any>();

export class ConfigRepository {
  static async getConfig(serverId: string, commandName: string) {
    const key = `${serverId}_${commandName}`;

    if (!inMemoryConfigs.has(key)) {
      inMemoryConfigs.set(key, {
        id: 'cfg_' + key,
        serverId,
        commandName,
        ...DEFAULT_COMMAND_SETTINGS,
        primaryChannelId: null,
        mirrorChannelId: null,
      });
    }

    if (!getDbAvailable()) {
      return inMemoryConfigs.get(key);
    }

    try {
      let config = await prisma.commandConfiguration.findUnique({
        where: {
          serverId_commandName: {
            serverId,
            commandName,
          },
        },
      });

      if (!config) {
        config = await prisma.commandConfiguration.create({
          data: {
            serverId,
            commandName,
            ...DEFAULT_COMMAND_SETTINGS,
          },
        });
      }
      inMemoryConfigs.set(key, config);
      return config;
    } catch (err: any) {
      logger.warn(`Database unreachable during getConfig(${key}), using in-memory config fallback`);
      return inMemoryConfigs.get(key);
    }
  }

  static async getAllConfigs() {
    if (!getDbAvailable()) {
      logger.warn('getAllConfigs: database unavailable, returning in-memory configs only');
      return Array.from(inMemoryConfigs.values());
    }

    try {
      return await prisma.commandConfiguration.findMany({
        include: { server: true },
        orderBy: { commandName: 'asc' },
      });
    } catch (err: any) {
      logger.error('getAllConfigs: database query failed', { error: err.message });
      return Array.from(inMemoryConfigs.values());
    }
  }

  // Creates a row per registered command without touching existing rows, so admin toggles survive re-provisioning.
  static async ensureConfigsForServer(serverId: string) {
    if (!getDbAvailable()) {
      for (const commandName of COMMAND_NAMES) {
        await this.getConfig(serverId, commandName);
      }
      return COMMAND_NAMES;
    }

    try {
      const existing = await prisma.commandConfiguration.findMany({
        where: { serverId },
        select: { commandName: true },
      });
      const existingNames = new Set(existing.map((c) => c.commandName));
      const missing = COMMAND_NAMES.filter((name) => !existingNames.has(name));

      if (missing.length > 0) {
        await prisma.commandConfiguration.createMany({
          data: missing.map((commandName) => ({
            serverId,
            commandName,
            ...DEFAULT_COMMAND_SETTINGS,
          })),
        });
        logger.info(`Provisioned ${missing.length} command config(s) for server ${serverId}`, {
          commands: missing,
        });
      }

      for (const key of Array.from(inMemoryConfigs.keys())) {
        if (key.startsWith(`${serverId}_`)) inMemoryConfigs.delete(key);
      }

      return missing;
    } catch (err: any) {
      logger.error(`ensureConfigsForServer failed for ${serverId}`, { error: err.message });
      return [];
    }
  }

  static async updateConfig(
    id: string,
    data: Partial<{
      enabled: boolean;
      saveLogs: boolean;
      replyInDiscord: boolean;
      mirrorNotification: boolean;
      aiProcessing: boolean;
      primaryChannelId: string | null;
      mirrorChannelId: string | null;
    }>
  ) {
    for (const [key, cfg] of inMemoryConfigs.entries()) {
      if (cfg.id === id) {
        const updated = { ...cfg, ...data };
        inMemoryConfigs.set(key, updated);
      }
    }

    if (!getDbAvailable()) {
      return Array.from(inMemoryConfigs.values()).find((c) => c.id === id) || { id, ...data };
    }

    try {
      return await prisma.commandConfiguration.update({
        where: { id },
        data,
      });
    } catch (err: any) {
      logger.warn(`Database unreachable while updating config ${id}, updated in-memory`);
      return Array.from(inMemoryConfigs.values()).find((c) => c.id === id) || { id, ...data };
    }
  }

  static async upsertConfig(
    serverId: string,
    commandName: string,
    data: Partial<{
      enabled: boolean;
      saveLogs: boolean;
      replyInDiscord: boolean;
      mirrorNotification: boolean;
      aiProcessing: boolean;
      primaryChannelId: string | null;
      mirrorChannelId: string | null;
    }>
  ) {
    const key = `${serverId}_${commandName}`;
    const current = inMemoryConfigs.get(key) || {
      id: 'cfg_' + key,
      serverId,
      commandName,
      enabled: true,
      saveLogs: true,
      replyInDiscord: true,
      mirrorNotification: true,
      aiProcessing: true,
    };
    const updated = { ...current, ...data };
    inMemoryConfigs.set(key, updated);

    if (!getDbAvailable()) {
      return updated;
    }

    try {
      return await prisma.commandConfiguration.upsert({
        where: {
          serverId_commandName: {
            serverId,
            commandName,
          },
        },
        update: data,
        create: {
          serverId,
          commandName,
          enabled: data.enabled ?? true,
          saveLogs: data.saveLogs ?? true,
          replyInDiscord: data.replyInDiscord ?? true,
          mirrorNotification: data.mirrorNotification ?? true,
          aiProcessing: data.aiProcessing ?? true,
          primaryChannelId: data.primaryChannelId,
          mirrorChannelId: data.mirrorChannelId,
        },
      });
    } catch (err: any) {
      return updated;
    }
  }
}
