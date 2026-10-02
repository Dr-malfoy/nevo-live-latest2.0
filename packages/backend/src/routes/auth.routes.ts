import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import {
  sendOtpSchema,
  resendOtpSchema,
  verifyOtpSchema,
  passwordLoginSchema,
  googleLoginSchema,
  facebookLoginSchema,
  registerSchema,
  resetPasswordSchema,
  searchAccountSchema,
} from '@bogolive/shared';

const router = Router();

router.post('/search-account', validate(searchAccountSchema), authController.searchAccount);
router.post('/send-otp', validate(sendOtpSchema), authController.sendOtp);
router.post('/resend-otp', validate(resendOtpSchema), authController.resendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/login', validate(passwordLoginSchema), authController.passwordLogin);
router.post('/google', validate(googleLoginSchema), authController.googleLogin);
router.post('/facebook', validate(facebookLoginSchema), authController.facebookLogin);
router.post('/signup', validate(registerSchema), authController.register);
router.post('/register', validate(registerSchema), authController.register);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/dev', authController.devLogin);

export default router;

