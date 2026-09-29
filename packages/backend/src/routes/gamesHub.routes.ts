import { Router } from 'express';
import { gamesHubController } from '../controllers/gamesHub.controller';

const router = Router();

// GET /api/games -> list
router.get('/', gamesHubController.getGames);
// GET /api/games/home -> home
router.get('/home', gamesHubController.getHome);
// GET /api/games/winners -> winners
router.get('/winners', gamesHubController.getWinners);

export default router;
