import client from './client';
import type { ApiResponse } from '../types';

/** Requirement #24 — transfer points to an agent. */
export interface TransferQuote {
  receiver: {
    _id?: string;
    uid: string;
    nickname: string;
    avatar?: string;
    coins?: number;
    diamonds?: number;
    isAgent: boolean;
    role?: string;
    isMyAgent?: boolean;
    allowed?: boolean;
    restrictionMessage?: string;
  };
}

export interface TransferRecord {
  _id: string;
  txId?: string;
  receiver: { _id?: string; uid: string; nickname: string; avatar?: string; isAgent?: boolean };
  points: number;
  currency?: string;
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  createdAt: string;
}

/** The doc's rules, mirrored client-side for instant feedback. */
export const TRANSFER_UNIT = 1;
export const TRANSFER_MIN_UNITS = 1;
export const TRANSFER_MIN_POINTS = 1;
export const TRANSFER_CHARGE_PERCENT = 0; // 0% transfer charge (free)

export interface TransferBreakdown {
  units?: number;
  transferAmount: number;
  charge: number;
  finalAmount: number;
}

/** Calculate 0% transfer charge breakdown (100% credited) */
export function calculateTransferBreakdown(amount: number): TransferBreakdown {
  const transferAmount = Math.max(0, Math.floor(amount || 0));
  const charge = 0;
  const finalAmount = transferAmount;
  return {
    units: transferAmount,
    transferAmount,
    charge,
    finalAmount,
  };
}

/** Returns an error string, or null when the amount is valid. */
export function validateTransferUnits(amount: number): string | null {
  if (!amount || amount <= 0) return 'Enter a diamond amount';
  return null;
}

/** Returns an error string, or null when the amount is valid. */
export function validateTransferAmount(points: number): string | null {
  if (!points || points <= 0) return 'Enter a transfer amount';
  return null;
}

export const transferApi = {
  /** Look up the receiver so the UI can show their nickname before confirming. */
  getQuote: (receiverUid: string) =>
    client.get<ApiResponse<TransferQuote>>('/transfer/quote', { params: { receiverUid } }),

  transfer: (receiverUid: string, points: number, currency: 'diamond' | 'coin' = 'diamond') =>
    client.post<ApiResponse<{
      points: number;
      units: number;
      charge: number;
      finalAmount: number;
      balance: number;
      currency?: string;
    }>>('/transfer', { receiverUid, points, currency }),

  getHistory: (page = 1) =>
    client.get<ApiResponse<TransferRecord[]>>('/transfer/history', { params: { page } }),
};
