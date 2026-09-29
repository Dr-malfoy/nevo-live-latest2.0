import { Router } from 'express';
import { giftController } from '../controllers/gift.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendGiftSchema } from '@bogolive/shared';

const router = Router();

router.get('/', giftController.listGifts);
router.post('/send', authenticate, validate(sendGiftSchema), giftController.sendGift);

export default router;
