import { Router } from 'express';
import { momentController } from '../controllers/moment.controller';
import { streamerController } from '../controllers/streamer.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// GET /api/videos/feed
router.get('/feed', optionalAuth, streamerController.getVideoFeed);

// POST /api/videos/:id/view
router.post('/:id/view', optionalAuth, momentController.recordView);

// POST /api/videos/:id/share
router.post('/:id/share', optionalAuth, momentController.shareMoment);

// POST /api/videos/:id/like
router.post('/:id/like', authenticate, momentController.toggleLike);

// POST /api/videos/:id/comment
router.post('/:id/comment', authenticate, momentController.addComment);

export default router;
