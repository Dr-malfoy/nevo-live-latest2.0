import { Router } from 'express';
import { rankingController } from '../controllers/ranking.controller';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// The board reads work signed-out; `optionalAuth` only fills in `me` when a
// token is present (#28, #35–#38, #71).
router.get('/', optionalAuth, rankingController.get);
router.get('/:board/config', optionalAuth, rankingController.getConfig);
router.get('/:board/history', optionalAuth, rankingController.getHistory);

export default router;
