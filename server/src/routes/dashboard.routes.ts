import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { authenticateAdmin } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async_handler.js';

const router = Router();

router.use(authenticateAdmin as any);

router.get('/stats', asyncHandler(DashboardController.getStats));
router.get('/logs', asyncHandler(DashboardController.getLogs));

export default router;
