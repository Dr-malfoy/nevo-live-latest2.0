import client from './client';
import type { ApiResponse } from '../types';

/** Requirement #15 — the five income sources on the diamond / coin dashboard. */
export type IncomeSourceKey =
  | 'livestream'
  | 'party'
  | 'commission'
  | 'transfer'
  | 'platform_rewards';

export type IncomeRange = '24h' | '7d' | '30d' | '1y' | 'all';

export const SOURCE_LABELS: Record<IncomeSourceKey, string> = {
  livestream: 'Live Stream Earning',
  party: 'Party Earning',
  commission: 'Commission',
  transfer: 'Transfer Point',
  platform_rewards: 'Platform Rewards',
};

export interface IncomeSource {
  key: IncomeSourceKey;
  label: string;
  points: number;
}

export interface IncomeSummary {
  available: number;
  total: number;
  unconfirmed: number;
  range: IncomeRange;
  sources: IncomeSource[];
}

export interface IncomeEntry {
  _id: string;
  txId?: string;
  from?: { _id: string; nickname: string; avatar?: string; uid?: string };
  points: number;
  currency?: string;
  type?: string;
  sourceType?: string;
  giftName?: string;
  giftIcon?: string;
  description?: string;
  status?: string;
  createdAt: string;
}

export const incomeApi = {
  getSummary: (range: IncomeRange = '30d') =>
    client.get<ApiResponse<IncomeSummary>>('/income/summary', { params: { range } }),

  getSource: (
    key: IncomeSourceKey,
    params?: { range?: IncomeRange | string; page?: number; limit?: number }
  ) =>
    client.get<ApiResponse<IncomeEntry[]> & { totalPoints?: number; range?: string }>(
      `/income/source/${key}`,
      { params }
    ),

  exchangePointsForCoins: (points: number) =>
    client.post<ApiResponse<{ coins: number; diamonds: number }>>('/income/exchange', { points }),

  /**
   * Raw ledger fallback.
   */
  getTransactions: (params?: { type?: string; page?: number; limit?: number }) =>
    client.get<ApiResponse<any[]>>('/transactions', { params }),
};
