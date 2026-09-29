import { Router } from 'express';
import { referralController } from '../controllers/referral.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/summary', referralController.getSummary);
router.post('/claim', referralController.claim);
router.get('/rank', referralController.getRank);
router.get('/templates', referralController.getTemplates);
router.post('/templates/:id/share', referralController.shareTemplate);
router.get('/materials', referralController.getMaterials);
router.get('/tasks', referralController.getTasks);
router.get('/ticker', referralController.getTicker);

export default router;
