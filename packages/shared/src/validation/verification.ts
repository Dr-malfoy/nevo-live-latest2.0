import { z } from 'zod';

export const verifyFaceSchema = z.object({
  selfieUrl: z.string().optional(),
  base64Image: z.string().optional(),
});

export const submitNidSchema = z.object({
  fullName: z.string().min(2).max(100),
  nidNumber: z.string().min(4).max(50),
  dateOfBirth: z.string().min(4).max(30),
  documentType: z.enum(['nid', 'olaid', 'passport', 'driving_license']).default('nid'),
  documentFrontUrl: z.string().min(1),
  documentBackUrl: z.string().min(1),
  selfieUrl: z.string().optional(),
  accountType: z.enum(['host', 'agency', 'user']).optional().default('user'),
  autoApprove: z.boolean().optional().default(true),
});

export const submitVerificationSchema = z.object({
  accountType: z.enum(['host', 'agency', 'user']).default('host'),
  fullName: z.string().min(2).max(100).optional(),
  olaId: z.string().min(4).max(50).optional(),
  nidNumber: z.string().min(4).max(50).optional(),
  dateOfBirth: z.string().min(4).max(30).optional(),
  documentType: z.enum(['nid', 'olaid', 'passport', 'driving_license']).default('nid'),
  documentFrontUrl: z.string().optional(),
  documentBackUrl: z.string().optional(),
  selfieUrl: z.string().optional(),
  facePhotoUrl: z.string().optional(),
});

export const verificationStatusQuerySchema = z.object({
  status: z.enum(['pending', 'under_review', 'verified', 'rejected']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

