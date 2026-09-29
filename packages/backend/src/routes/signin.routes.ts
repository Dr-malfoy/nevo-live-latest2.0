import { Router } from 'express';
import { gamesHubController } from '../controllers/gamesHub.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/signin -> getSignIn
router.get('/', authenticate, gamesHubController.getSignInCalendar);

// POST /api/signin/claim -> claimSignIn
router.post('/claim', authenticate, gamesHubController.signIn);

// Alias: POST /api/signin
router.post('/', authenticate, gamesHubController.signIn);

export default router;
