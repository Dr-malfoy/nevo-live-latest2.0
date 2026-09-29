import { z } from 'zod';

export const updateProfileSchema = z.object({
  nickname: z.string().min(2).max(30).optional(),
  avatar: z.string().optional(),
  cover: z.string().optional(),
  /** ISO 3166-1 alpha-2, e.g. BD / IN / PK. Empty string clears it. */
  country: z
    .string()
    .regex(/^[A-Za-z]{2}$/, 'Country must be a 2-letter ISO code')
    .or(z.literal(''))
    .optional(),
  gender: z.enum(['male', 'female', 'other', 'unspecified']).optional(),
  /** ISO date string; empty string clears it. */
  birthday: z.string().datetime().or(z.string().date()).or(z.literal('')).optional(),
  bio: z.string().max(200).optional(),
  tags: z.array(z.string().min(1).max(20)).max(10).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});
