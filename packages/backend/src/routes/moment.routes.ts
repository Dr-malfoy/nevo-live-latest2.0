import { Router } from 'express';
import { momentController } from '../controllers/moment.controller';
import { authenticate } from '../middleware/auth';
import { requireFaceVerified } from '../middleware/roleGuard';

const router = Router();

router.get('/', momentController.getFeed);
router.post('/', authenticate, requireFaceVerified, momentController.createMoment);
router.get('/:id', momentController.getMoment);
router.put('/:id', authenticate, momentController.updateMoment);
router.delete('/:id', authenticate, momentController.deleteMoment);
router.post('/:id/like', authenticate, momentController.toggleLike);
router.post('/:id/comment', authenticate, momentController.addComment);
router.post('/:id/share', authenticate, momentController.shareMoment);

export default router;
