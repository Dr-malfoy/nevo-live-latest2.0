import { Router } from 'express';
import { gamesHubController } from '../controllers/gamesHub.controller';

const router = Router();

// GET /api/activities
router.get('/', gamesHubController.getActivities);

// GET /api/activities/:key
router.get('/:key', gamesHubController.getActivity);

export default router;
