import { Router } from 'express';
import { rewardController } from '../controllers/reward.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Reward status (progress card) + daily claim — any authenticated user
router.get('/status', authenticate, rewardController.getStatus);
router.post('/claim', authenticate, rewardController.claim);

export default router;
