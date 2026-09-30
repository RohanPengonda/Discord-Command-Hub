import { DiscordApiService } from '../services/discord/discord_api.service.js';
import { logger } from '../utils/logger.js';

async function main() {
  logger.info('Registering slash commands with Discord API...');
  try {
    const result = await DiscordApiService.registerGlobalCommands();
    logger.info('Slash command registration completed successfully!', { result });
    process.exit(0);
  } catch (err: any) {
    logger.error('Slash command registration failed', { error: err.message });
    process.exit(1);
  }
}

main();
