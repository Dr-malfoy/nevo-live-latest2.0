import { z } from 'zod';

export const sendOtpSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  channel: z.enum(['sms', 'whatsapp']).optional().default('sms'),
  purpose: z.enum(['signup', 'login', 'reset_password']).optional().default('signup'),
});

export const resendOtpSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  channel: z.enum(['sms', 'whatsapp']).optional().default('sms'),
  purpose: z.enum(['signup', 'login', 'reset_password']).optional().default('signup'),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  code: z.string().min(4).max(10).optional(),
  idToken: z.string().optional(),
  purpose: z.enum(['signup', 'login', 'reset_password']).optional().default('signup'),
});

export const passwordLoginSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'Google ID token required'),
});

export const searchAccountSchema = z.object({
  query: z.string().min(2, 'Enter a phone number, account ID, or username'),
});

export const registerSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  username: z.string().min(2).max(30).optional(),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  confirmPassword: z.string().min(6).optional(),
  nickname: z.string().min(1).max(30).optional(),
  avatar: z.string().optional(),
  code: z.string().optional(),
  verificationToken: z.string().optional(),
});

export const resetPasswordSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  code: z.string().optional(),
  verificationToken: z.string().optional(),
  idToken: z.string().optional(),
});

