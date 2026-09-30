import { CommandStatus } from '@prisma/client';
import { LogRepository } from '../../../repositories/log.repository.js';
import { logger } from '../../../utils/logger.js';

export class ButtonComponentHandler {
  static async handle(interaction: any): Promise<any> {
    const customId = interaction.data?.custom_id || '';
    const username = interaction.member?.user?.username || interaction.user?.username || 'Admin';

    if (customId.startsWith('btn_resolve_')) {
      const logId = customId.replace('btn_resolve_', '');
      try {
        await LogRepository.updateLogStatus(logId, CommandStatus.SUCCESS);
      } catch (err) {}

      logger.info(`Report ${logId} marked as Resolved by ${username}`);

      return {
        type: 7, // UPDATE_MESSAGE
        data: {
          content: `✅ **Report Resolved** by *@${username}*`,
          components: [], // Remove buttons
        },
      };
    }

    if (customId.startsWith('btn_dismiss_')) {
      const logId = customId.replace('btn_dismiss_', '');
      try {
        await LogRepository.updateLogStatus(logId, CommandStatus.FAILED, `Dismissed by ${username}`);
      } catch (err) {}

      logger.info(`Report ${logId} Dismissed by ${username}`);

      return {
        type: 7, // UPDATE_MESSAGE
        data: {
          content: `❌ **Report Dismissed** by *@${username}*`,
          components: [], // Remove buttons
        },
      };
    }

    return {
      type: 4,
      data: { content: 'Unknown button component action' },
    };
  }
}
