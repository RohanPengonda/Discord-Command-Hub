import { Router } from 'express';
import { DiscordController } from '../controllers/discord.controller.js';
import { verifyDiscordSignature } from '../middleware/discord_verify.middleware.js';
import { authenticateAdmin } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async_handler.js';

const router = Router();

// Public Discord interaction webhook endpoint verified by Ed25519 signature
router.post('/interactions', verifyDiscordSignature, asyncHandler(DiscordController.handleInteractions));

// Protected slash command sync route for admin
router.post('/sync-commands', authenticateAdmin as any, asyncHandler(DiscordController.syncCommands));

export default router;
