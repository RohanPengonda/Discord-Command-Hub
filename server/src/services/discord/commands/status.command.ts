import { CommandStatus } from '@prisma/client';
import { getDbAvailable, checkDbConnection } from '../../../repositories/prisma.js';
import { LogRepository } from '../../../repositories/log.repository.js';
import { logger } from '../../../utils/logger.js';

export class StatusCommandHandler {
  static handle(interaction: any) {
    const interactionId = interaction.id;
    const userId = interaction.member?.user?.id || interaction.user?.id || 'unknown';
    const username = interaction.member?.user?.username || interaction.user?.username || 'unknown';
    const serverId = interaction.guild_id || null;

    // Reading the cached flag instead of SELECT 1 keeps this off Discord's 3 second budget.
    const dbConnected = getDbAvailable();
    void checkDbConnection().catch(() => undefined);

    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeStr = `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`;

    const statusMessage = `🟢 **System Operational**
• **Bot Status:** Online
• **Database:** ${dbConnected ? 'Connected ✅' : 'Disconnected ❌'}
• **Uptime:** ${uptimeStr}
• **Environment:** ${process.env.NODE_ENV || 'development'}`;

    // Logged after the reply is built, since only the acknowledgement is on Discord's clock.
    void LogRepository.createLog({
      interactionId,
      serverId,
      commandName: 'status',
      userId,
      username,
      rawOptions: {},
      status: CommandStatus.SUCCESS,
    })
      .then((log) => logger.info('Recorded /status command execution log', { logId: log.id }))
      .catch((err: any) => logger.error('Failed to log /status command to database', { error: err.message }));

    // Immediate inline Discord response (Type 4)
    return {
      type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        content: statusMessage,
      },
    };
  }
}