import { z } from 'zod';

export const createStreamSchema = z.object({
  title: z.string().min(1).max(100),
  cover: z.string().optional(),
  type: z.enum(['video', 'voice', 'game']),
  category: z.enum(['talk', 'game', 'music', 'other']).default('talk'),
});

export const streamFeedQuerySchema = z.object({
  tab: z.enum(['popular', 'follow', 'newest']).optional(),
  type: z.enum(['video', 'voice', 'game']).optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
