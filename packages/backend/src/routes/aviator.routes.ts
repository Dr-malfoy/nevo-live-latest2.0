import { Router } from 'express';
import { aviatorController } from '../controllers/aviator.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleGuard';

const router = Router();

// User — own bet history
router.get('/history', authenticate, aviatorController.getMyHistory);

// Admin — game stats
router.get('/stats', authenticate, requireAdmin, aviatorController.getStats);

export default router;
