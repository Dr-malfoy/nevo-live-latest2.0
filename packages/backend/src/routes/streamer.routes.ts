import { Router } from 'express';
import { streamerController } from '../controllers/streamer.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/streamer/stats — streamer dashboard metrics
router.get('/stats', authenticate, streamerController.getStreamerStats);

// GET /api/streamer/last-report — last stream summary & AI feedback
router.get('/last-report', authenticate, streamerController.getLastReport);

// PUT /api/streamer/cover — update streamer live cover
router.put('/cover', authenticate, streamerController.updateCover);

// GET /api/streamer/inspiration — going live guidelines and interactive tools
router.get('/inspiration', streamerController.getInspiration);

// PUT /api/streamer/settings — stream defaults (title, tags, location)
router.put('/settings', authenticate, streamerController.updateSettings);

// GET /api/streamer/milestones — streamer progression & targets
router.get('/milestones', authenticate, streamerController.getMilestones);

// GET /api/streamer/creator-stats — creator content summary
router.get('/creator-stats', authenticate, streamerController.getCreatorStats);

// GET /api/streamer/videos — video/reel feed
router.get('/videos', streamerController.getVideoFeed);

// GET /api/streamer/history — past live sessions
router.get('/history', authenticate, streamerController.getStreamHistory);

export default router;
