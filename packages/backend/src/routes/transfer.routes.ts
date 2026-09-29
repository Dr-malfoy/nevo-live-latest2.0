import { Router } from 'express';
import { incomeController } from '../controllers/income.controller';
import { authenticate } from '../middleware/auth';
import { requireNidVerified } from '../middleware/roleGuard';

const router = Router();

router.use(authenticate);

router.get('/quote', incomeController.getTransferQuote);
router.post('/', requireNidVerified, incomeController.transfer);
router.get('/history', incomeController.getTransferHistory);

export default router;
