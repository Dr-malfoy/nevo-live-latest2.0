import { Router } from 'express';
import { gamesHubController } from '../controllers/gamesHub.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/lucky-spin -> getLuckySpin
router.get('/', authenticate, gamesHubController.getSpinStatus);

// POST /api/lucky-spin/spin -> spin
router.post('/spin', authenticate, gamesHubController.executeSpin);

// Backwards compat alias: POST /api/lucky-spin
router.post('/', authenticate, gamesHubController.executeSpin);

export default router;
