import client from './client';
import type { ApiResponse } from '../types';

/** Requirement #20 — crypto top-up networks. */
export interface CryptoNetwork {
  code: 'BEP20' | 'TRC20' | 'ERC20' | string;
  name: string;
  walletAddress: string;
  qrCode?: string;
  minAmount?: number;
}

export interface CryptoOption {
  currency: 'USDT' | 'USDC' | string;
  /** Coins per 1 unit of this currency, e.g. 9900. */
  ratio: number;
  networks: CryptoNetwork[];
}

export interface RecentRecharge {
  /** Masked on the server — `17****71`, never the full id. */
  maskedUid: string;
  amountUsd: number;
  at: string;
}

/** Requirement #23 — the 8 withdraw methods. */
export interface WithdrawMethod {
  key: string;
  name: string;
  logo?: string;
  feeType: 'percent' | 'points' | 'tiered';
  fee?: number;
  feeTiers?: number[];
  arrival: string;
  bound: boolean;
  preferred: boolean;
  /** Which inputs the bind form should render. */
  fields: string[];
}

export const paymentApi = {
  /* ── Exists ──────────────────────────────────────────────────────── */

  getMethods: () => client.get('/payment/methods'),
  getCustomMethods: () => client.get('/payment/custom-methods'),
  getAgents: () => client.get('/payment/agents'),
  createOrder: (data: {
    paymentMethod: string;
    amountBdt: number;
    screenshot: string;
    transactionId: string;
    currency?: string;
    agentId?: string;
    accountNumber?: string;
  }) => client.post('/payment/orders', data),
  getOrders: (params?: any) => client.get('/payment/orders', { params }),

  getUserPaymentInfo: () => client.get('/payment/user-info'),
  updateUserPaymentInfo: (data: {
    bybit?: { qrCode?: string; walletAddress?: string };
    binance?: { qrCode?: string; walletAddress?: string };
  }) => client.put('/payment/user-info', data),

  createWithdrawal: (data: { currency: string; amount: number; method: string; accountNumber: string }) =>
    client.post('/payment/withdraw', data),
  getWithdrawals: (params?: any) => client.get('/payment/withdrawals', { params }),

  getAdminPaymentInfo: () => client.get('/payment/admin-info'),

  /* ── Not built yet — specified in API-SPEC.md (#20 / #23) ─────────── */

  /** Crypto currencies with their coin ratio and chain options. */
  getCryptoOptions: () => client.get<ApiResponse<CryptoOption[]>>('/payment/crypto-options'),

  /** The orange auto-scrolling "someone just recharged" ticker. */
  getRecentRecharges: () => client.get<ApiResponse<RecentRecharge[]>>('/payment/recent-recharges'),

  /** The 8 payout methods for a country, with fee, arrival and bind state. */
  getWithdrawMethods: (country?: string) =>
    client.get<ApiResponse<WithdrawMethod[]>>('/payment/withdraw-methods', { params: { country } }),

  bindWithdrawMethod: (key: string, payload: Record<string, string>) =>
    client.post<ApiResponse<WithdrawMethod>>(`/payment/withdraw-methods/${key}/bind`, payload),

  setPreferredWithdrawMethod: (key: string) =>
    client.post<ApiResponse>(`/payment/withdraw-methods/${key}/preferred`),
};
