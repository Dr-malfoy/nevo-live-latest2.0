import { Router } from 'express';
import { storeController } from '../controllers/store.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// Store catalogue and honor items
router.get('/items', optionalAuth, storeController.getItems);
router.get('/honor', optionalAuth, storeController.getHonor);
router.post('/buy', authenticate, storeController.buy);

export default router;
