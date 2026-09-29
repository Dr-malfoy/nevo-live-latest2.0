import { Router } from 'express';
import { officialNotificationController } from '../controllers/officialNotification.controller';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// optionalAuth so logged-out website visitors can also read official notices.
router.use(optionalAuth);

router.get('/', officialNotificationController.getForUser);
router.get('/unread-count', officialNotificationController.getUnreadCount);
router.put('/:id/seen', officialNotificationController.markSeen);
router.put('/seen-all', officialNotificationController.markAllSeen);

export default router;
