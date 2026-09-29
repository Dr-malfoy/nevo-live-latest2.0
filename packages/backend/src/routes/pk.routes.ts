import { Router } from 'express';
import { pkController } from '../controllers/pk.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/types', pkController.getPkTypes);
router.get('/rank', optionalAuth, pkController.getPkRank);
router.post('/invite', authenticate, pkController.invitePk);
router.post('/match', authenticate, pkController.matchPk);
router.post('/:battleId/match', authenticate, pkController.matchPk);
router.post('/team', authenticate, pkController.teamPk);
router.post('/:battleId/team', authenticate, pkController.teamPk);
router.get('/history', authenticate, pkController.getPkHistory);
router.post('/:battleId/end', authenticate, pkController.endPk);

export default router;
