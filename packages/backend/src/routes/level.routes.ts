import { Router } from 'express';
import { levelController } from '../controllers/level.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/levels/achievements — MUST come before /:kind to avoid param collision
router.get('/achievements', authenticate, levelController.getAchievements);

// GET /api/levels/:kind  (wealth | livestream | any string for forward compat)
router.get('/:kind', levelController.getLevels);

export default router;
