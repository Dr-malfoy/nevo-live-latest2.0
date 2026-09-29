import { Router } from 'express';
import { verificationController } from '../controllers/verification.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';
import { submitVerificationSchema, verifyFaceSchema, submitNidSchema } from '@bogolive/shared';

const router = Router();

// User routes
router.get('/my', authenticate, verificationController.getMyRequest);
router.post('/face', authenticate, validate(verifyFaceSchema), verificationController.verifyFace);
router.post('/nid', authenticate, validate(submitNidSchema), verificationController.submitNid);
router.post('/submit', authenticate, validate(submitVerificationSchema), verificationController.submit);

// Admin routes
router.get('/', authenticate, requireAdmin, verificationController.getAll);
router.put('/:id/approve', authenticate, requireAdmin, verificationController.approve);
router.put('/:id/reject', authenticate, requireAdmin, verificationController.reject);

export default router;
