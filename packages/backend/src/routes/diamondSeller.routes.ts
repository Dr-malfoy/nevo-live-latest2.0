import { Router } from 'express';
import { diamondSellerController } from '../controllers/diamondSeller.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/eligibility', authenticate, diamondSellerController.getEligibility);
router.post('/apply', authenticate, diamondSellerController.submitApplication);
router.get('/my-application', authenticate, diamondSellerController.getMyApplication);

export default router;
