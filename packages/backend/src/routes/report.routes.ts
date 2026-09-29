import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Any authenticated user/agent can report
router.post('/', authenticate, reportController.createReport);

export default router;
