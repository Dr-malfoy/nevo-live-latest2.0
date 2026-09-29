import { Router } from 'express';
import { taskController } from '../controllers/task.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', taskController.getBoard);
router.post('/:key/claim', taskController.claim);

export default router;
