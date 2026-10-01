import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ServerRepository } from '../repositories/server.repository.js';
import { ConfigRepository } from '../repositories/config.repository.js';
import { COMMAND_DEFINITIONS } from './discord/command_definitions.js';

// Slash command registration never touches the database, so these rows are what the Commands page renders.
export class ProvisioningService {
  static async ensureDashboardRows(): Promise<void> {
    if (!env.DISCORD_GUILD_ID) {
      logger.warn('DISCORD_GUILD_ID is not set. Skipping dashboard row provisioning.');
      return;
    }

    const serverId = env.DISCORD_GUILD_ID;
    await ServerRepository.upsertServer({
      id: serverId,
      name: 'Default Discord Server',
    });

    const channelDefaults = [
      env.DISCORD_PRIMARY_CHANNEL_ID
        ? {
            id: env.DISCORD_PRIMARY_CHANNEL_ID,
            name: 'primary-response-channel',
            isPrimary: true,
            isMirror: false,
          }
        : null,
      env.DISCORD_MIRROR_CHANNEL_ID
        ? {
            id: env.DISCORD_MIRROR_CHANNEL_ID,
            name: 'mirror-notification-channel',
            isPrimary: false,
            isMirror: true,
          }
        : null,
    ].filter((c): c is NonNullable<typeof c> => c !== null);

    for (const channel of channelDefaults) {
      await ServerRepository.upsertChannel({
        id: channel.id,
        serverId,
        name: channel.name,
        type: 'GUILD_TEXT',
        isPrimary: channel.isPrimary,
        isMirror: channel.isMirror,
      });
    }

await ConfigRepository.ensureConfigsForServer(serverId);

for (const command of COMMAND_DEFINITIONS) {
      const config = await ConfigRepository.getConfig(serverId, command.name);
      if (!config) continue;

      // Backfill channel ids only where an admin has never set one.
      const patch: { primaryChannelId?: string; mirrorChannelId?: string } = {};
      if (env.DISCORD_PRIMARY_CHANNEL_ID && !config.primaryChannelId) {
        patch.primaryChannelId = env.DISCORD_PRIMARY_CHANNEL_ID;
      }
      if (env.DISCORD_MIRROR_CHANNEL_ID && !config.mirrorChannelId) {
        patch.mirrorChannelId = env.DISCORD_MIRROR_CHANNEL_ID;
      }
      if (Object.keys(patch).length > 0) {
        await ConfigRepository.upsertConfig(serverId, command.name, patch);
      }
    }

    logger.info(`Dashboard rows provisioned for server ${serverId}`, {
      commands: COMMAND_DEFINITIONS.map((c) => c.name),
      channels: channelDefaults.length,
    });
  }
}