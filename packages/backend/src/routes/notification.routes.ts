import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markRead);
router.put('/read-all', notificationController.markAllRead);
router.delete('/clear-all', notificationController.deleteAllNotifications);
router.delete('/:id', notificationController.deleteNotification);

// Push token management & testing
router.post('/push-token/register', notificationController.registerPushToken);
router.post('/push-token/unregister', notificationController.unregisterPushToken);
router.post('/test-push', notificationController.testPush);

export default router;
