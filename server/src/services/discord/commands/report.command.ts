import { CommandStatus } from '@prisma/client';
import { ConfigRepository } from '../../../repositories/config.repository.js';
import { LogRepository } from '../../../repositories/log.repository.js';
import { AIService } from '../../ai/ai.service.js';
import { DiscordApiService } from '../discord_api.service.js';
import { NotificationService } from '../../notification.service.js';
import { logger } from '../../../utils/logger.js';

export class ReportCommandHandler {
  /**
   * Handle initial /report interaction
   */
  static async handle(interaction: any): Promise<any> {
    const options = interaction.data?.options || [];
    const issueOption = options.find((opt: any) => opt.name === 'issue');
    const reportText = issueOption?.value;

    // If no issue option was provided inline, present a Discord Modal
    if (!reportText) {
      return {
        type: 9, // MODAL response
        data: {
          custom_id: 'report_modal_submit',
          title: 'Submit an Issue Report',
          components: [
            {
              type: 1, // Action Row
              components: [
                {
                  type: 4, // Text Input
                  custom_id: 'report_issue_input',
                  label: 'Describe the issue or bug',
                  style: 2, // Paragraph
                  placeholder: 'e.g. Website checkout page is failing when paying with UPI...',
                  required: true,
                  min_length: 10,
                  max_length: 1000,
                },
              ],
            },
          ],
        },
      };
    }

    // Direct execution with inline issue parameter -> Immediate Deferral (Type 5)
    const interactionToken = interaction.token;
    const interactionId = interaction.id;
    const userId = interaction.member?.user?.id || interaction.user?.id || 'unknown';
    const username = interaction.member?.user?.username || interaction.user?.username || 'unknown';
    const serverId = interaction.guild_id || 'default_server';

    // Asynchronously process report in background without blocking 3s window
    setImmediate(() => {
      this.processAsyncReport({
        interactionId,
        interactionToken,
        userId,
        username,
        serverId,
        reportText,
      }).catch((err) => {
        logger.error('Background report processing error', { error: err.message });
      });
    });

    // Immediate Type 5 response to satisfy Discord SLA
    return {
      type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    };
  }

  /**
   * Asynchronous background processor for report pipeline
   */
  static async processAsyncReport(params: {
    interactionId: string;
    interactionToken: string;
    userId: string;
    username: string;
    serverId: string;
    reportText: string;
  }) {
    const { interactionId, interactionToken, userId, username, serverId, reportText } = params;

    try {
      // 1. Fetch server & command configuration
      const config = await ConfigRepository.getConfig(serverId, 'report');

      if (!config.enabled) {
        if (process.env.NODE_ENV !== 'test') {
          await DiscordApiService.editOriginalInteractionResponse(interactionToken, {
            content: '⚠️ The `/report` command is currently disabled by the system administrator.',
          });
        }
        return;
      }

      // 2. Create initial CommandLog in DB
      let commandLog = await LogRepository.createLog({
        interactionId,
        serverId,
        commandName: 'report',
        userId,
        username,
        rawOptions: { issue: reportText },
        status: CommandStatus.PROCESSING,
      });

      // 3. AI Processing (if enabled in UI config)
      let aiResult = {
        summary: reportText.length > 80 ? `${reportText.substring(0, 77)}...` : reportText,
        category: 'General',
        priority: 'MEDIUM' as any,
      };

      if (config.aiProcessing) {
        const aiOutput = await AIService.analyzeReport(reportText);
        aiResult = aiOutput;

        await LogRepository.attachAIResult({
          commandLogId: commandLog.id,
          summary: aiOutput.summary,
          category: aiOutput.category,
          priority: aiOutput.priority,
          rawAiOutput: aiOutput.rawResponse,
        });
      }

      // Priority badge colors
      const priorityColors: Record<string, number> = {
        LOW: 0x57f287,
        MEDIUM: 0xfee75c,
        HIGH: 0xeb459e,
        CRITICAL: 0xed4245,
      };

      // 4. Send/Edit Discord Response Embed with interactive buttons (skip network calls during unit test)
      if (config.replyInDiscord && process.env.NODE_ENV !== 'test') {
        const embed = {
          title: `📋 Report Received: ${aiResult.summary}`,
          description: `**Details:** ${reportText}`,
          color: priorityColors[aiResult.priority] || 0x5865f2,
          fields: [
            { name: 'Category', value: aiResult.category, inline: true },
            { name: 'Priority', value: aiResult.priority, inline: true },
            { name: 'Submitted By', value: `<@${userId}>`, inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: `Report ID: ${commandLog.id.substring(0, 8)}` },
        };

        const components = [
          {
            type: 1, // Action Row
            components: [
              {
                type: 2, // Button
                custom_id: `btn_resolve_${commandLog.id}`,
                label: 'Resolve',
                style: 3, // Success / Green
                emoji: { name: '✅' },
              },
              {
                type: 2, // Button
                custom_id: `btn_dismiss_${commandLog.id}`,
                label: 'Dismiss',
                style: 4, // Danger / Red
                emoji: { name: '❌' },
              },
            ],
          },
        ];

        await DiscordApiService.editOriginalInteractionResponse(interactionToken, {
          embeds: [embed],
          components,
        });
      }

      // 5. Send Second-Channel Mirror Notification
      if (config.mirrorNotification && process.env.NODE_ENV !== 'test') {
        const notifRes = await NotificationService.sendMirrorNotification({
          commandName: 'report',
          username,
          reportText,
          summary: aiResult.summary,
          category: aiResult.category,
          priority: aiResult.priority,
          targetChannelId: config.mirrorChannelId || undefined,
        });

        await LogRepository.attachNotificationLog({
          commandLogId: commandLog.id,
          channelId: notifRes.channelId,
          channelType: notifRes.channelType,
          status: notifRes.status,
          errorMessage: notifRes.error,
        });
      }

      // 6. Update log status to SUCCESS
      await LogRepository.updateLogStatus(commandLog.id, CommandStatus.SUCCESS);
      logger.info(`Successfully completed async processing for /report interaction ${interactionId}`);
    } catch (err: any) {
      logger.error(`Failed async processing for /report interaction ${interactionId}`, {
        error: err.message,
      });
    }
  }
}
