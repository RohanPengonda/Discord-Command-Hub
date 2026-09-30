import { InteractionRepository } from '../../repositories/interaction.repository.js';
import { StatusCommandHandler } from './commands/status.command.js';
import { ReportCommandHandler } from './commands/report.command.js';
import { ButtonComponentHandler } from './components/button.handler.js';
import { ModalComponentHandler } from './components/modal.handler.js';
import { logger } from '../../utils/logger.js';

export class DiscordInteractionService {
  static async handleInteraction(interaction: any): Promise<any> {
    const { id, type, token } = interaction;
    const userId = interaction.member?.user?.id || interaction.user?.id || 'unknown';
    const username = interaction.member?.user?.username || interaction.user?.username || 'unknown';
    const serverId = interaction.guild_id || null;
    const channelId = interaction.channel_id || null;
    const commandName = interaction.data?.name || null;

    logger.info(`Received Discord Interaction [ID: ${id}, Type: ${type}, Command: ${commandName}]`);

    // 1. Handle Type 1: PING interaction immediately
    if (type === 1) {
      // Record PING interaction so idempotency tracking captures it
      try {
        await InteractionRepository.recordInteraction({
          id,
          type,
          commandName: 'ping',
          userId,
          username,
          token: token || 'ping_token',
        });
      } catch (e) {}
      return { type: 1 }; // PONG
    }

    // 2. Check Idempotency (Duplicate Interaction Protection)
    const isAlreadyProcessed = await InteractionRepository.isProcessed(id);
    if (isAlreadyProcessed) {
      logger.warn(`Duplicate interaction detected [ID: ${id}]. Skipping duplicate side effects.`);
      return {
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: '⚠️ This command interaction was already processed.',
          flags: 64, // Ephemeral
        },
      };
    }

    // 3. Record processed interaction to enforce uniqueness
    try {
      await InteractionRepository.recordInteraction({
        id,
        type,
        commandName: commandName || undefined,
        userId,
        username,
        serverId: serverId || undefined,
        channelId: channelId || undefined,
        token,
      });
    } catch (err: any) {
      logger.error(`Failed to record interaction ${id}`, { error: err.message });
      if (err.code === 'P2002') {
        return {
          type: 4,
          data: { content: '⚠️ Duplicate interaction request ignored.', flags: 64 },
        };
      }
    }

    // 4. Handle Type 2: Slash Commands
    if (type === 2) {
      switch (commandName) {
        case 'status':
          return StatusCommandHandler.handle(interaction);
        case 'report':
          return ReportCommandHandler.handle(interaction);
        default:
          return {
            type: 4,
            data: { content: `Unknown slash command: /${commandName}` },
          };
      }
    }

    // 5. Handle Type 3: Interactive Components (Buttons)
    if (type === 3) {
      return ButtonComponentHandler.handle(interaction);
    }

    // 6. Handle Type 5: Modal Submissions
    if (type === 5) {
      return ModalComponentHandler.handle(interaction);
    }

    return {
      type: 4,
      data: { content: 'Unsupported interaction type' },
    };
  }
}
