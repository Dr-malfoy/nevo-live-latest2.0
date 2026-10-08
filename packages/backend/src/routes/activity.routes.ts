import { Router } from 'express';
import { gamesHubController } from '../controllers/gamesHub.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// GET /api/activities - list ongoing/closed activities with user progress
router.get('/', optionalAuth, gamesHubController.getActivities);

// GET /api/activities/rewards - user's claimed activity rewards history
router.get('/rewards', authenticate, gamesHubController.getActivityRewards);

// POST /api/activities/progress - record live watch / streaming progress
router.post('/progress', authenticate, gamesHubController.recordLiveProgress);

// POST /api/activities/claim-all - collect all ready activity tasks
router.post('/claim-all', authenticate, gamesHubController.claimAllActivityTasks);

// GET /api/activities/:key - activity details with live tasks and leaderboard
router.get('/:key', optionalAuth, gamesHubController.getActivity);

// POST /api/activities/:key/claim/:taskKey - collect coins for an activity task
router.post('/:key/claim/:taskKey', authenticate, gamesHubController.claimActivityTask);

export default router;
