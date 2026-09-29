import { Router } from 'express';
import { securityController } from '../controllers/security.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/asset-password', securityController.getState);
router.post('/asset-password', securityController.setPassword);
router.put('/asset-password', securityController.changePassword);
router.post('/asset-password/verify', securityController.verify);
router.post('/asset-password/reset', securityController.reset);

export default router;
