import { Router } from 'express';
import { historyController } from '../controllers/history.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/history/watch — get watch history (live or video)
router.get('/watch', authenticate, historyController.getWatchHistory);

// POST /api/history/watch — record watch history
router.post('/watch', authenticate, historyController.recordWatch);

// DELETE /api/history/watch — clear watch history
router.delete('/watch', authenticate, historyController.clearWatchHistory);

export default router;
