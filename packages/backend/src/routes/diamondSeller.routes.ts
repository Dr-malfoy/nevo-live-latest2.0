import { Router } from 'express';
import { diamondSellerController } from '../controllers/diamondSeller.controller';
import { authenticate } from '../middleware/auth';
import { requireNidVerified } from '../middleware/roleGuard';

const router = Router();

router.get('/eligibility', authenticate, diamondSellerController.getEligibility);
router.post('/apply', authenticate, requireNidVerified, diamondSellerController.submitApplication);
router.get('/my-application', authenticate, diamondSellerController.getMyApplication);

export default router;
