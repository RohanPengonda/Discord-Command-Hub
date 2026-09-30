import axios from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { COMMAND_DEFINITIONS } from './command_definitions.js';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export class DiscordApiService {
  private static getHeaders() {
    return {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Edit the original interaction response after deferring (Type 5)
   */
  static async editOriginalInteractionResponse(
    interactionToken: string,
    payload: {
      content?: string;
      embeds?: any[];
      components?: any[];
    }
  ) {
    const url = `${DISCORD_API_BASE}/webhooks/${env.DISCORD_APPLICATION_ID}/${interactionToken}/messages/@original`;
    try {
      const response = await axios.patch(url, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      return response.data;
    } catch (err: any) {
      logger.error('Failed to edit original Discord interaction response', {
        error: err.response?.data || err.message,
      });
      throw err;
    }
  }

  /**
   * Post message directly to a Discord Channel
   */
  static async postChannelMessage(
    channelId: string,
    payload: {
      content?: string;
      embeds?: any[];
      components?: any[];
    }
  ) {
    if (!env.DISCORD_BOT_TOKEN) {
      logger.warn('DISCORD_BOT_TOKEN not configured. Skipping Discord channel message.');
      return null;
    }

    const url = `${DISCORD_API_BASE}/channels/${channelId}/messages`;
    try {
      const response = await axios.post(url, payload, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (err: any) {
      logger.error(`Failed to post message to Discord channel ${channelId}`, {
        error: err.response?.data || err.message,
      });
      throw err;
    }
  }

  /**
   * Register slash commands with Discord API
   */
  static async registerGlobalCommands() {
    if (!env.DISCORD_APPLICATION_ID || !env.DISCORD_BOT_TOKEN) {
      logger.warn('DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN missing. Skipping slash command registration.');
      return;
    }

    const commands = COMMAND_DEFINITIONS;

    const url = env.DISCORD_GUILD_ID
      ? `${DISCORD_API_BASE}/applications/${env.DISCORD_APPLICATION_ID}/guilds/${env.DISCORD_GUILD_ID}/commands`
      : `${DISCORD_API_BASE}/applications/${env.DISCORD_APPLICATION_ID}/commands`;

    try {
      const res = await axios.put(url, commands, {
        headers: this.getHeaders(),
      });
      logger.info('Successfully registered Discord Slash Commands with Discord REST API', {
        commandCount: commands.length,
        url,
      });
      return res.data;
    } catch (err: any) {
      logger.error('Failed to register Discord Slash Commands', {
        error: err.response?.data || err.message,
      });
      throw err;
    }
  }
}
