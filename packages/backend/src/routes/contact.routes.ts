import { Router } from 'express';
import { contactController } from '../controllers/contact.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// User sends a message to admin + views own history
router.post('/', contactController.sendMessage);
router.get('/mine', contactController.getMyMessages);

export default router;
