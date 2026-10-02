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
export const TRANSFER_UNIT = 100_000;
export const TRANSFER_MIN_UNITS = 1;
export const TRANSFER_MIN_POINTS = 100_000; // 1 Unit = 100,000 fixed
export const TRANSFER_CHARGE_PERCENT = 5; // 5% transfer charge

export interface TransferBreakdown {
  units: number;
  transferAmount: number;
  charge: number;
  finalAmount: number;
}

/** Calculate 1 Unit = 100,000 and 5% transfer charge breakdown */
export function calculateTransferBreakdown(units: number): TransferBreakdown {
  const safeUnits = Math.max(0, Math.floor(units || 0));
  const transferAmount = safeUnits * TRANSFER_UNIT;
  const charge = Math.round(transferAmount * (TRANSFER_CHARGE_PERCENT / 100));
  const finalAmount = Math.max(0, transferAmount - charge);
  return {
    units: safeUnits,
    transferAmount,
    charge,
    finalAmount,
  };
}

/** Returns an error string, or null when the units/amount is valid. */
export function validateTransferUnits(units: number): string | null {
  if (!units || units <= 0) return 'Enter at least 1 Unit';
  if (!Number.isInteger(units)) return 'Units must be a whole number';
  if (units < TRANSFER_MIN_UNITS) return `Minimum transfer is ${TRANSFER_MIN_UNITS} Unit (${TRANSFER_MIN_POINTS.toLocaleString()} Coins)`;
  return null;
}

/** Returns an error string, or null when the amount is valid. */
export function validateTransferAmount(points: number): string | null {
  if (!points || points <= 0) return 'Enter a transfer amount';
  if (points < TRANSFER_MIN_POINTS) return `Minimum transfer is 1 Unit (${TRANSFER_MIN_POINTS.toLocaleString()} Coins)`;
  if (points % TRANSFER_UNIT !== 0) return `Amount must be in exact multiples of 1 Unit (${TRANSFER_UNIT.toLocaleString()} Coins)`;
  return null;
}

export const transferApi = {
  /** Look up the receiver so the UI can show their nickname before confirming. */
  getQuote: (receiverUid: string) =>
    client.get<ApiResponse<TransferQuote>>('/transfer/quote', { params: { receiverUid } }),

  transfer: (receiverUid: string, points: number) =>
    client.post<ApiResponse<{
      points: number;
      units: number;
      charge: number;
      finalAmount: number;
      balance: number;
    }>>('/transfer', { receiverUid, points }),

  getHistory: (page = 1) =>
    client.get<ApiResponse<TransferRecord[]>>('/transfer/history', { params: { page } }),
};
