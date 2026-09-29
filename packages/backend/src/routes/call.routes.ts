import { Router } from 'express';
import { callController } from '../controllers/call.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', callController.createCall);
router.get('/active', callController.getActiveCalls); // MUST be before /:id
router.get('/quote/:hostId', callController.getCallQuote); // Quote must be before /:id
router.get('/:id', callController.getCall);
router.post('/:id/accept', callController.acceptCall);
router.post('/:id/join', callController.joinCall);
router.post('/:id/end', callController.endCall);

export default router;
