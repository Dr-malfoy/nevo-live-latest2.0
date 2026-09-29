import { Router } from 'express';
import { fanclubController } from '../controllers/fanclub.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Fan groups (mounted at /api/fangroups)
router.get('/', authenticate, fanclubController.getFanGroups);
router.post('/', authenticate, fanclubController.createFanGroup);
router.post('/:groupId/join', authenticate, fanclubController.joinFanGroup);
router.get('/:groupId/members', authenticate, fanclubController.getGroupMembers);

export default router;
