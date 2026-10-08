import { Router } from 'express';
import { momentController } from '../controllers/moment.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requireFaceVerified } from '../middleware/roleGuard';

const router = Router();

router.get('/', momentController.getFeed);
router.post('/', authenticate, requireFaceVerified, momentController.createMoment);
router.get('/:id', momentController.getMoment);
router.put('/:id', authenticate, momentController.updateMoment);
router.delete('/:id', authenticate, momentController.deleteMoment);
router.post('/:id/like', authenticate, momentController.toggleLike);
router.post('/:id/comment', authenticate, momentController.addComment);
router.post('/:id/share', optionalAuth, momentController.shareMoment);
router.post('/:id/view', optionalAuth, momentController.recordView);

export default router;
