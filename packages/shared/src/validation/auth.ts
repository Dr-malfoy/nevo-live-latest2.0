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

export const passwordLoginSchema = z
  .object({
    phone: z.string().optional(),
    identifier: z.string().optional(),
    email: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  })
  .refine((data) => !!(data.phone || data.identifier || data.email), {
    message: 'Phone number or Gmail is required',
  });

export const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'Google ID token required'),
});

export const facebookLoginSchema = z.object({
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
}).refine((data) => !!(data.idToken || data.accessToken), {
  message: 'idToken or accessToken is required for Facebook login',
});

export const searchAccountSchema = z.object({
  query: z.string().min(2, 'Enter a phone number, account ID, or username'),
});

export const registerSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required').max(100),
    username: z.string().min(2).max(30).optional(),
    phone: z.string().optional().or(z.literal('')),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6).optional(),
    dob: z.string().optional(),
    birthday: z.string().optional(),
    gender: z.enum(['male', 'female', 'other', 'unspecified']).optional(),
    inviteCode: z.string().optional(),
    inviter: z.string().optional(),
    nickname: z.string().min(1).max(30).optional(),
    avatar: z.string().optional(),
    code: z.string().optional(),
    verificationToken: z.string().optional(),
    idToken: z.string().optional(),
  })
  .refine((data) => !!((data.phone && data.phone.trim()) || (data.email && data.email.trim())), {
    message: 'Phone number or Gmail is required',
  });

export const resetPasswordSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  code: z.string().optional(),
  verificationToken: z.string().optional(),
  idToken: z.string().optional(),
});


