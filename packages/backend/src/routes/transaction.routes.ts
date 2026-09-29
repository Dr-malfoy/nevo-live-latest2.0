import { Router } from 'express';
import { transactionController } from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, transactionController.getTransactions);

export default router;
