import { Router } from 'express';
import { contactController } from '../controllers/contact.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public telegram links config
router.get('/telegram-config', contactController.getTelegramConfig);

router.use(authenticate);

// User sends a support ticket / message + views own tickets
router.post('/', contactController.sendMessage);
router.get('/mine', contactController.getMyMessages);
router.get('/:id', contactController.getMessageById);
router.post('/:id/reply', contactController.addReply);

export default router;


