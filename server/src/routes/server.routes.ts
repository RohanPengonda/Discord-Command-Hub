import { Router } from 'express';
import { ServerController } from '../controllers/server.controller.js';
import { authenticateAdmin } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async_handler.js';

const router = Router();

router.use(authenticateAdmin as any);

router.get('/', asyncHandler(ServerController.getServers));
router.post('/settings', asyncHandler(ServerController.updateServerSettings));

export default router;
