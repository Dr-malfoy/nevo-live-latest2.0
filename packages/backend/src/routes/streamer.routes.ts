import { Router } from 'express';
import { streamerController } from '../controllers/streamer.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/streamer/stats — streamer monthly dashboard
router.get('/stats', authenticate, streamerController.getStreamerStats);

// GET /api/streamer/creator-stats — creator content summary
router.get('/creator-stats', authenticate, streamerController.getCreatorStats);

// GET /api/streamer/videos — video/reel feed
router.get('/videos', streamerController.getVideoFeed);

// GET /api/streamer/history — past live sessions
router.get('/history', authenticate, streamerController.getStreamHistory);

export default router;
