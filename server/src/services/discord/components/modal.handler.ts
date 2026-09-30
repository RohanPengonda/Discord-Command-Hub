import { ReportCommandHandler } from '../commands/report.command.js';
import { logger } from '../../../utils/logger.js';

export class ModalComponentHandler {
  static async handle(interaction: any): Promise<any> {
    const customId = interaction.data?.custom_id;

    if (customId === 'report_modal_submit') {
      const components = interaction.data?.components || [];
      let reportText = '';

      for (const row of components) {
        for (const input of row.components || []) {
          if (input.custom_id === 'report_issue_input') {
            reportText = input.value;
          }
        }
      }

      const interactionToken = interaction.token;
      const interactionId = interaction.id;
      const userId = interaction.member?.user?.id || interaction.user?.id || 'unknown';
      const username = interaction.member?.user?.username || interaction.user?.username || 'unknown';
      const serverId = interaction.guild_id || 'default_server';

      logger.info(`Received Modal Submission for report from ${username}`);

      // Process report asynchronously
      setImmediate(() => {
        ReportCommandHandler.processAsyncReport({
          interactionId,
          interactionToken,
          userId,
          username,
          serverId,
          reportText,
        });
      });

      // Immediate Type 5 response to satisfy Discord SLA
      return {
        type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
      };
    }

    return {
      type: 4,
      data: { content: 'Unknown modal submission' },
    };
  }
}
