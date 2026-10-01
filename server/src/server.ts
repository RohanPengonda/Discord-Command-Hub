import app from './app.js';
import { env, assertProductionDiscordConfig } from './config/env.js';
import { logger } from './utils/logger.js';
import { prisma, checkDbConnection, startDbReconnectMonitor } from './repositories/prisma.js';
import { ProvisioningService } from './services/provisioning.service.js';

const PORT = env.PORT || 5000;

async function startServer() {
  try {
    // Surface placeholder/missing Discord credentials here, not as an
    // opaque "application did not respond" inside Discord.
    assertProductionDiscordConfig();

    // Verify DB connectivity
    await prisma.$connect();
    const dbReady = await checkDbConnection();
    if (!dbReady) {
      logger.error(
        'Database is unreachable at boot. The dashboard will run on in-memory fallbacks and show empty data until the connection recovers. Retrying every 30s.'
      );
      startDbReconnectMonitor();
    } else {
      logger.info('Database connected successfully via Prisma ORM.');

      // Registering slash commands with Discord does not create DB rows, so
      // ensure the dashboard has a server + a config row per registered command.
      await ProvisioningService.ensureDashboardRows();
    }

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Discord Automation Backend listening on port ${PORT} [Mode: ${env.NODE_ENV}]`);
      logger.info(`Discord Interactions Endpoint: ${env.BACKEND_URL}/api/discord/interactions`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Closed HTTP server and disconnected DB. Exiting.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err: any) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

startServer();
