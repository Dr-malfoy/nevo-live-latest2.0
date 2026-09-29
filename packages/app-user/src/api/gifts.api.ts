import client from './client';
import type { ApiResponse, Gift } from '../types';

export interface SendGiftResult {
  senderBalance?: number;
  senderCoins?: number;
  senderDiamonds?: number;
  receiverEarned?: number;
  receiverDiamonds?: number;
  receiverCoins?: number;
  totalCost: number;
}

export const giftsApi = {
  list: () =>
    client.get<ApiResponse<Gift[]>>('/gifts'),

  send: (receiverId: string, giftId: string, quantity = 1, sourceType: 'live' | 'party' | 'call' | 'other' = 'live') =>
    client.post<ApiResponse<SendGiftResult>>('/gifts/send', { receiverId, giftId, quantity, sourceType }),
};
