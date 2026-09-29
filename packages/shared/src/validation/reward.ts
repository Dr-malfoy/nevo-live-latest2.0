import { z } from 'zod';

export const rewardTierSchema = z.object({
  count: z.number().min(0),
  rewardCoins: z.number().min(0),
  requiredHours: z.number().min(0),
});

export const updateRewardConfigSchema = z.object({
  giftUserShare: z.number().min(0).max(100).optional(),
  giftAdminShare: z.number().min(0).max(100).optional(),
  tiers: z.array(rewardTierSchema).optional(),
});
