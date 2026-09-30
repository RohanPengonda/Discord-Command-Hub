import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticateAdmin } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async_handler.js';

const router = Router();

router.post('/login', asyncHandler(AuthController.login));
router.post('/register', asyncHandler(AuthController.register));
router.post('/logout', asyncHandler(AuthController.logout));
router.get('/me', authenticateAdmin as any, asyncHandler(AuthController.me));

export default router;
