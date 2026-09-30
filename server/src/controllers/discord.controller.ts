import { Request, Response } from 'express';
import { DiscordInteractionService } from '../services/discord/interaction.service.js';
import { DiscordApiService } from '../services/discord/discord_api.service.js';
import { logger } from '../utils/logger.js';

export class DiscordController {
  static async handleInteractions(req: Request, res: Response) {
    try {
      const interaction = req.body;
      const responsePayload = await DiscordInteractionService.handleInteraction(interaction);
      return res.status(200).json(responsePayload);
    } catch (err: any) {
      logger.error('Error handling Discord interaction endpoint', { error: err.message });
      return res.status(500).json({
        type: 4,
        data: { content: 'Internal server error processing Discord interaction' },
      });
    }
  }

  static async syncCommands(_req: Request, res: Response) {
    try {
      const result = await DiscordApiService.registerGlobalCommands();
      return res.json({ message: 'Successfully synchronized slash commands with Discord', result });
    } catch (err: any) {
      logger.error('Error syncing Discord commands', { error: err.message });
      return res.status(500).json({ error: 'Failed to sync slash commands with Discord', details: err.message });
    }
  }
}
