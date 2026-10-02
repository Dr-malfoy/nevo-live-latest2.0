import client from './client';
import type { ApiResponse } from '../types';

export interface CallSession {
  callId: string;
  channel: string;
  type: 'audio' | 'video';
  token: string;
  participantCount?: number;
  maxParticipants?: number;
  /** Coins per minute for priced 1:1 host calls. 0 for free/group calls. */
  coinsPerMinute?: number;
}

export interface CallParticipant {
  _id: string;
  uid?: string;
  nickname: string;
  avatar?: string;
}

export interface ActiveCallSummary {
  callId: string;
  type: 'audio' | 'video';
  startedAt?: string;
  participants: CallParticipant[];
  maxParticipants: number;
}

export interface CallRosterSession extends CallSession {
  participants: CallParticipant[];
}

export interface CallQuote {
  coinsPerMinute: number;
  balance: number;
  canCall: boolean;
  reason?: string;
  minBalance: number;
  hostNickname?: string;
  hostAvatar?: string;
}

export interface BillingTickResult {
  coinsFinished?: boolean;
  audienceCoins?: number;
  minutesBilled?: number;
  totalCoins?: number;
  skipped?: boolean;
}

export const callApi = {
  /**
   * Get a pricing quote before initiating a call.
   * Checks the audience's balance against the host's per-minute price.
   */
  getQuote: (hostId: string) =>
    client.get<ApiResponse<CallQuote>>(`/calls/quote/${hostId}`),

  /**
   * Start a 1:1 or group call.
   * source: 'profile' (from host profile) | 'messenger' (from chat).
   */
  create: (
    recipientIds: string[],
    type: 'audio' | 'video' = 'audio',
    source: 'profile' | 'messenger' = 'messenger'
  ) =>
    client.post<ApiResponse<CallSession>>('/calls', { recipientIds, type, source }),

  accept: (callId: string) =>
    client.post<ApiResponse<CallSession>>(`/calls/${callId}/accept`),

  /** Join an active call (the "Join" option). */
  join: (callId: string) =>
    client.post<ApiResponse<CallSession>>(`/calls/${callId}/join`),

  /** Active, joinable calls for the lobby (excludes my own). */
  getActive: () =>
    client.get<ApiResponse<ActiveCallSummary[]>>('/calls/active'),

  /** Current call session + roster (re-entry). */
  get: (callId: string) =>
    client.get<ApiResponse<CallRosterSession>>(`/calls/${callId}`),

  end: (callId: string, outcome: 'ended' | 'rejected' | 'missed' = 'ended') =>
    client.post<ApiResponse>(`/calls/${callId}/end`, { outcome }),

  /**
   * Billing heartbeat — sent every 60 s by the audience client.
   * The server is the authoritative billing source; this is a safety net.
   */
  billingTick: (callId: string) =>
    client.post<ApiResponse<BillingTickResult>>(`/calls/${callId}/billing-tick`),

  /** Explicitly finalize call billing (idempotent). Called on hangup. */
  finalize: (callId: string) =>
    client.post<ApiResponse>(`/calls/${callId}/finalize`),
};
