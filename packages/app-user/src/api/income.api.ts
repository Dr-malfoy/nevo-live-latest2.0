import client from './client';
import type { ApiResponse } from '../types';

/** Requirement #15 — the five income sources on the diamond dashboard. */
export type IncomeSourceKey =
  | 'livestream'
  | 'party'
  | 'commission'
  | 'transfer'
  | 'platform_rewards';

export type IncomeRange = '24h' | '7d' | '30d';

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
  from?: { _id: string; nickname: string; avatar?: string; uid?: string };
  points: number;
  giftName?: string;
  createdAt: string;
}

export const incomeApi = {
  /* ── Not built yet — specified in API-SPEC.md (#15) ──────────────── */

  getSummary: (range: IncomeRange = '30d') =>
    client.get<ApiResponse<IncomeSummary>>('/income/summary', { params: { range } }),

  getSource: (key: IncomeSourceKey, params?: { range?: IncomeRange; page?: number }) =>
    client.get<ApiResponse<IncomeEntry[]>>(`/income/source/${key}`, { params }),

  exchangePointsForCoins: (points: number) =>
    client.post<ApiResponse<{ coins: number; diamonds: number }>>('/income/exchange', { points }),

  /* ── Exists ──────────────────────────────────────────────────────── */

  /**
   * Raw ledger. Used as the fallback so the dashboard still shows real
   * numbers before `/income/summary` ships: the client groups these rows by
   * `type` into the five sources.
   */
  getTransactions: (params?: { type?: string; page?: number; limit?: number }) =>
    client.get<ApiResponse<any[]>>('/transactions', { params }),
};
