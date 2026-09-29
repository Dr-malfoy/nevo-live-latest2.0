import { Router } from 'express';
import { teenPattiController } from '../controllers/teenpatti.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleGuard';

const router = Router();

// User — own bet history
router.get('/history', authenticate, teenPattiController.getMyHistory);

// Admin — game stats
router.get('/stats', authenticate, requireAdmin, teenPattiController.getStats);

export default router;
