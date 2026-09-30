import { Router } from 'express';
import { CommandController } from '../controllers/command.controller.js';
import { authenticateAdmin } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async_handler.js';

const router = Router();

router.use(authenticateAdmin as any);

router.get('/', asyncHandler(CommandController.getAllConfigs));
router.patch('/:id', asyncHandler(CommandController.updateConfig));

export default router;
