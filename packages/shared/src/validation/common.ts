import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

export const sendGiftSchema = z.object({
  receiverId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  giftId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  quantity: z.number().int().min(1).max(999).default(1),
});
