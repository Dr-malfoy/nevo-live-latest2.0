import { Router } from 'express';
import { rouletteController } from '../controllers/roulette.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleGuard';

const router = Router();

// User — own bet history
router.get('/history', authenticate, rouletteController.getMyHistory);

// Admin — game stats
router.get('/stats', authenticate, requireAdmin, rouletteController.getStats);

export default router;
