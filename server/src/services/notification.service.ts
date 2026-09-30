import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { DiscordApiService } from './discord/discord_api.service.js';

export class NotificationService {
  /**
   * Sends mirror notification to a second Discord channel or Slack incoming webhook
   */
  static async sendMirrorNotification(data: {
    commandName: string;
    username: string;
    reportText: string;
    summary: string;
    category: string;
    priority: string;
    targetChannelId?: string;
  }): Promise<{ status: 'SUCCESS' | 'FAILED'; channelType: string; channelId: string; error?: string }> {
    // 1. Prefer Second Discord Channel
    const discordChannelId = data.targetChannelId || env.DISCORD_MIRROR_CHANNEL_ID;

    if (discordChannelId && discordChannelId !== '123456789012345678') {
      try {
        const colorMap: Record<string, number> = {
          LOW: 0x57f287, // Green
          MEDIUM: 0xfee75c, // Yellow
          HIGH: 0xeb459e, // Pink/Fuchsia
          CRITICAL: 0xed4245, // Red
        };

        const embed = {
          title: `🔔 [MIRROR NOTIFICATION] New Issue Reported`,
          description: `**Original Report:** ${data.reportText}`,
          color: colorMap[data.priority] || 0x5865f2,
          fields: [
            { name: 'Summary', value: data.summary, inline: true },
            { name: 'Category', value: data.category, inline: true },
            { name: 'Priority', value: data.priority, inline: true },
            { name: 'Reported By', value: data.username, inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Discord Automation Dashboard' },
        };

        await DiscordApiService.postChannelMessage(discordChannelId, {
          embeds: [embed],
        });

        logger.info(`Successfully mirrored notification to second Discord channel ${discordChannelId}`);
        return {
          status: 'SUCCESS',
          channelType: 'DISCORD_CHANNEL',
          channelId: discordChannelId,
        };
      } catch (err: any) {
        logger.error(`Failed to post mirror notification to Discord channel ${discordChannelId}`, {
          error: err.message,
        });
        // Continue to fallback Slack webhook if available
      }
    }

    // 2. Fallback to Slack Webhook if configured
    if (env.SLACK_WEBHOOK_URL) {
      try {
        await axios.post(env.SLACK_WEBHOOK_URL, {
          text: `*🔔 New Report Notification* from *@${data.username}*\n*Summary:* ${data.summary}\n*Category:* ${data.category} | *Priority:* ${data.priority}\n> ${data.reportText}`,
        });

        logger.info('Successfully mirrored notification to Slack Webhook');
        return {
          status: 'SUCCESS',
          channelType: 'SLACK_WEBHOOK',
          channelId: env.SLACK_WEBHOOK_URL,
        };
      } catch (err: any) {
        logger.error('Failed to post mirror notification to Slack Webhook', { error: err.message });
        return {
          status: 'FAILED',
          channelType: 'SLACK_WEBHOOK',
          channelId: env.SLACK_WEBHOOK_URL,
          error: err.message,
        };
      }
    }

    logger.warn('No valid mirror channel or Slack webhook configured. Skipping notification.');
    return {
      status: 'FAILED',
      channelType: 'NONE',
      channelId: 'NONE',
      error: 'No target mirror channel or webhook configured',
    };
  }
}
