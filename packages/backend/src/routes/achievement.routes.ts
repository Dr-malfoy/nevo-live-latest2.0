import { Router } from 'express';
import { achievementController } from '../controllers/achievement.controller';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// GET /api/achievements?category=milestones|merits|identity|all
router.get('/', optionalAuth, achievementController.get);

export default router;
