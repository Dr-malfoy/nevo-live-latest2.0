import client from './client';
import type { ApiResponse } from '../types';

/** Requirement #24 — transfer points to an agent. */
export interface TransferQuote {
  receiver: {
    uid: string;
    nickname: string;
    avatar?: string;
    isAgent: boolean;
  };
}

export interface TransferRecord {
  _id: string;
  receiver: { uid: string; nickname: string; avatar?: string };
  points: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

/** The doc's rules, mirrored client-side for instant feedback. */
export const TRANSFER_MIN_POINTS = 500_000;
export const TRANSFER_UNIT = 100_000;

/** Returns an error string, or null when the amount is valid. */
export function validateTransferAmount(points: number): string | null {
  if (!points || points <= 0) return 'Enter a transfer amount';
  if (points < TRANSFER_MIN_POINTS) return `Minimum transfer amount is ${TRANSFER_MIN_POINTS.toLocaleString()} coins`;
  return null;
}

export const transferApi = {
  /* ── Not built yet — specified in API-SPEC.md (#24) ───────────────── */

  /** Look up the receiver so the UI can show their nickname before confirming. */
  getQuote: (receiverUid: string) =>
    client.get<ApiResponse<TransferQuote>>('/transfer/quote', { params: { receiverUid } }),

  transfer: (receiverUid: string, points: number) =>
    client.post<ApiResponse<{ points: number; balance: number }>>('/transfer', { receiverUid, points }),

  getHistory: (page = 1) =>
    client.get<ApiResponse<TransferRecord[]>>('/transfer/history', { params: { page } }),
};
