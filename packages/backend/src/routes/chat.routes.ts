import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';
import { requireFaceVerified } from '../middleware/roleGuard';

const router = Router();

router.use(authenticate);

router.get('/', chatController.getChats);
router.get('/unread-count', chatController.getUnreadCount);
router.get('/active-users', chatController.getActiveUsers);

// Official inbox (static routes — must be ABOVE /:chatId)
router.get('/official', chatController.getOfficialChats);
router.get('/official/:key', chatController.getOfficialMessages);
router.post('/official/:key/read', chatController.markOfficialRead);

router.post('/group', chatController.createGroupChat);
router.post('/', chatController.getOrCreateChat);
router.get('/:chatId', chatController.getChat);
router.patch('/:chatId/group', chatController.updateGroupChat);
router.put('/:chatId/group', chatController.updateGroupChat);
router.post('/:chatId/members', chatController.addGroupMembers);
router.post('/:chatId/read', chatController.markChatRead);
router.get('/:chatId/messages', chatController.getMessages);
router.post('/:chatId/messages', chatController.sendMessage);
router.put('/:chatId/messages/:messageId', chatController.editMessage);
router.delete('/:chatId/messages/:messageId', chatController.deleteMessage);
router.delete('/:chatId/clear', chatController.clearChat);
router.get('/:chatId/streak', chatController.getChatStreak);
router.delete('/:chatId', chatController.deleteChat);

export default router;
