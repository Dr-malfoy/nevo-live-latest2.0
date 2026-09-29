import { Router } from 'express';
import { incomeController } from '../controllers/income.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/summary', incomeController.getSummary);
router.get('/source/:key', incomeController.getSource);
router.post('/exchange', incomeController.exchange);

export default router;
