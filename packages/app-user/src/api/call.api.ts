import client from './client';
import type { ApiResponse } from '../types';

export interface CallSession {
  callId: string;
  channel: string;
  type: 'audio' | 'video';
  token: string;
  participantCount?: number;
  maxParticipants?: number;
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

export const callApi = {
  /** Start a 1:1 or group call (1..9 recipients, max 10 total participants). */
  create: (recipientIds: string[], type: 'audio' | 'video' = 'audio') =>
    client.post<ApiResponse<CallSession>>('/calls', { recipientIds, type }),

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
};
