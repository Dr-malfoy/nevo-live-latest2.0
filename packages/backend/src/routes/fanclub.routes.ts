import { Router } from 'express';
import { fanclubController } from '../controllers/fanclub.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Fan clubs
router.get('/joined', authenticate, fanclubController.getJoined);
router.get('/mine', authenticate, fanclubController.getMine);
router.post('/:hostId/join', authenticate, fanclubController.joinFanClub);
router.post('/:hostId/light-up', authenticate, fanclubController.lightUp);

// Fan groups
router.get('/groups', fanclubController.getFanGroups);
router.post('/groups', authenticate, fanclubController.createFanGroup);
router.post('/groups/:groupId/join', authenticate, fanclubController.joinFanGroup);

export default router;
