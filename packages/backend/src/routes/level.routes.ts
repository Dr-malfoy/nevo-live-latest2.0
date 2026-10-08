import { Router } from 'express';
import { levelController } from '../controllers/level.controller';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// GET /api/levels/achievements — MUST come before /:kind to avoid param collision
router.get('/achievements', optionalAuth, levelController.getAchievements);

// GET /api/levels/:kind  (wealth | livestream)
router.get('/:kind', optionalAuth, levelController.getLevels);

export default router;
