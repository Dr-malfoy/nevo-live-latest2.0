import client from './client';
import type { ApiResponse, RewardStatus } from '../types';

export const rewardApi = {
  getStatus: () => client.get<ApiResponse<RewardStatus>>('/rewards/status'),
  claim: () => client.post<ApiResponse<{ rewardCoins: number; tier: any; count: number; liveMinutes: number; balance: { coins: number; diamonds: number } }>>('/rewards/claim'),
};
