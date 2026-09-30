import { Request, Response } from 'express';
import { ServerRepository } from '../repositories/server.repository.js';
import { ConfigRepository } from '../repositories/config.repository.js';
import { env } from '../config/env.js';
import { z } from 'zod';

const updateServerConfigSchema = z.object({
  serverId: z.string(),
  serverName: z.string().optional(),
  primaryChannelId: z.string().optional(),
  mirrorChannelId: z.string().optional(),
});

export class ServerController {
  static async getServers(_req: Request, res: Response) {
    let servers = await ServerRepository.findAllServers();

    // If no servers exist yet, return environment default server as fallback
    if (servers.length === 0 && env.DISCORD_GUILD_ID) {
      const defaultServer = await ServerRepository.upsertServer({
        id: env.DISCORD_GUILD_ID,
        name: 'Default Discord Server',
      });
      servers = [defaultServer as any];
    }

    return res.json({ servers });
  }

  static async updateServerSettings(req: Request, res: Response) {
    const { serverId, serverName, primaryChannelId, mirrorChannelId } = updateServerConfigSchema.parse(req.body);

    const server = await ServerRepository.upsertServer({
      id: serverId,
      name: serverName || 'Discord Server',
    });

    await ConfigRepository.ensureConfigsForServer(serverId);

    if (primaryChannelId) {
      await ServerRepository.upsertChannel({
        id: primaryChannelId,
        serverId,
        name: 'primary-response-channel',
        type: 'GUILD_TEXT',
        isPrimary: true,
      });
      await ServerRepository.setChannelFlags(serverId, primaryChannelId, true, false);
      await ConfigRepository.upsertConfig(serverId, 'report', { primaryChannelId });
      await ConfigRepository.upsertConfig(serverId, 'status', { primaryChannelId });
    }

    if (mirrorChannelId) {
      await ServerRepository.upsertChannel({
        id: mirrorChannelId,
        serverId,
        name: 'mirror-notification-channel',
        type: 'GUILD_TEXT',
        isMirror: true,
      });
      await ServerRepository.setChannelFlags(serverId, mirrorChannelId, false, true);
      await ConfigRepository.upsertConfig(serverId, 'report', { mirrorChannelId });
      await ConfigRepository.upsertConfig(serverId, 'status', { mirrorChannelId });
    }

    return res.json({ message: 'Server settings updated successfully', server });
  }
}
