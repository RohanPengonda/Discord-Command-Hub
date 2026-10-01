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

    // getDbAvailable() holds the result of the last successful probe, so the
    // reply costs no query. A `SELECT 1` on this path cost ~250ms of Discord's
    // 3 second budget. Re-probing in the background keeps the value fresh for
    // the next invocation.
    const dbConnected = getDbAvailable();
    void checkDbConnection().catch(() => undefined);

    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeStr = `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`;

    const statusMessage = `🟢 **System Operational**
• **Bot Status:** Online
• **Database:** ${dbConnected ? 'Connected ✅' : 'Disconnected ❌'}
• **Uptime:** ${uptimeStr}
• **Environment:** ${process.env.NODE_ENV || 'development'}`;

    // Audited after the reply is built: the acknowledgement must leave inside
    // Discord's 3 second window, the log row does not have to.
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