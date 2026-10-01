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
    // Discord validates the Interactions Endpoint URL by sending a signed PING
    // and refuses to save the URL if the reply is not an immediate PONG. A PING
    // carries no side effect worth auditing, so it must never reach the database.
    if (type === 1) {
      return { type: 1 }; // PONG
    }

    // 2. Idempotency guard. `ProcessedInteraction.id` is the Discord interaction
    // ID, so the unique insert is itself the duplicate check: a replayed
    // interaction fails with P2002 instead of re-running its side effects. One
    // round trip, and it runs before any side effect.
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
      if (err.code === 'P2002') {
        logger.warn(`Duplicate interaction detected [ID: ${id}]. Skipping duplicate side effects.`);
        return {
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: {
            content: '⚠️ This command interaction was already processed.',
            flags: 64, // Ephemeral
          },
        };
      }
      logger.error(`Failed to record interaction ${id}`, { error: err.message });
    }

    // 3. Handle Type 2: Slash Commands
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

    // 4. Handle Type 3: Interactive Components (Buttons)
    if (type === 3) {
      return ButtonComponentHandler.handle(interaction);
    }

    // 5. Handle Type 5: Modal Submissions
    if (type === 5) {
      return ModalComponentHandler.handle(interaction);
    }

    return {
      type: 4,
      data: { content: 'Unsupported interaction type' },
    };
  }
}
