import client from './client';
import type { ApiResponse } from '../types';

export interface AgencyAgentInfo {
  _id: string;
  uid: string;
  nickname: string;
  avatar: string;
  level: number;
  phone?: string;
  country?: string;
  bio?: string;
}

export interface AgencyMemberInfo {
  _id: string;
  uid: string;
  nickname: string;
  avatar: string;
  level: number;
  liveHours: number;
  contribution: number;
  coins: number;
  diamonds: number;
  lastActiveAt?: string;
}

export interface AgencyRelationship {
  isOwner: boolean;
  isMember: boolean;
  hasPendingJoinRequest: boolean;
  hasPendingLeaveRequest: boolean;
  joinRequestId?: string;
}

export interface AgencyItem {
  _id: string;
  name: string;
  code: string;
  avatar: string;
  cover?: string;
  description: string;
  type: 'public' | 'private';
  level: number;
  levelProgress: number;
  nextThreshold: number;
  score?: number;
  memberCount: number;
  commission: number;
  totalContribution: number;
  totalLiveHours: number;
  agent: AgencyAgentInfo;
  members?: AgencyMemberInfo[];
  userRelationship?: AgencyRelationship;
  createdAt: string;
}

export interface LeaveRequestData {
  _id: string;
  userId: string | { _id: string; uid: string; nickname: string; avatar?: string; level?: number; coins?: number; diamonds?: number; lastActiveAt?: string };
  agencyId: string | { _id: string; name: string; code: string };
  agentId: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JoinRequestData {
  _id: string;
  userId: string | { _id: string; uid: string; nickname: string; avatar?: string; level?: number; coins?: number; diamonds?: number; lastActiveAt?: string; gender?: string; country?: string };
  agencyId: string | { _id: string; name: string; code: string };
  agentId: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const agencyApi = {
  // Discovery & Search
  getAgencies: (params?: { filter?: 'all' | 'public' | 'private' | 'popular' | 'level'; search?: string; page?: number; limit?: number }) =>
    client.get<ApiResponse<AgencyItem[]>>('/agency', { params }),

  getAgencyDetails: (idOrCode: string) =>
    client.get<ApiResponse<AgencyItem>>(`/agency/${idOrCode}`),

  createAgency: (data: { name: string; description?: string; avatar?: string; cover?: string; type?: 'public' | 'private'; commission?: number; customCode?: string }) =>
    client.post<ApiResponse<AgencyItem>>('/agency/create', data),

  joinAgency: (idOrCode: string) =>
    client.post<ApiResponse<{ success: boolean; agency: { _id: string; name: string; code: string; type?: string }; message?: string }>>(`/agency/${idOrCode}/join`),

  requestJoin: (idOrCode: string, message?: string) =>
    client.post<ApiResponse<{ success: boolean; requestId: string; status: string; message: string }>>(`/agency/${idOrCode}/request-join`, { message }),

  getJoinRequests: (status?: string) =>
    client.get<ApiResponse<JoinRequestData[]>>('/agency/join-requests', { params: { status } })
      .catch((err) => {
        if (err?.response?.status === 404 || err?.response?.status === 403) {
          return { data: { success: true, data: [] } } as any;
        }
        throw err;
      }),

  decideJoinRequest: (requestId: string, decision: 'approve' | 'reject') =>
    client.post<ApiResponse<{ success: boolean; status: string; message?: string }>>(`/agency/join-requests/${requestId}/decide`, { decision }),

  updateSettings: (data: { name?: string; description?: string; avatar?: string; cover?: string; type?: 'public' | 'private'; commission?: number }) =>
    client.put<ApiResponse<any>>('/agency/settings', data),

  removeMember: (userId: string, reason?: string) =>
    client.delete<ApiResponse<{ success: boolean; message?: string }>>(`/agency/members/${userId}`, { data: { reason } }),

  // Agent Wallet & Currency Management
  agentSendCoins: (targetIdentifier: string, amount: number, note?: string) =>
    client.post<ApiResponse<{ success: boolean; amount: number; balance: number; recipient: any }>>('/agency/wallet/send-coins', { targetIdentifier, amount, note })
      .catch(async (err) => {
        if (err?.response?.status === 404) {
          // Fallback to legacy transfer endpoint
          return client.post<ApiResponse<any>>('/transfer', { receiverUid: targetIdentifier, points: amount });
        }
        throw err;
      }),

  agentSendDiamonds: (targetIdentifier: string, amount: number, note?: string) =>
    client.post<ApiResponse<{ success: boolean; amount: number; balance: number; recipient: any }>>('/agency/wallet/send-diamonds', { targetIdentifier, amount, note }),

  agentConvertCurrency: (from: 'coin' | 'diamond', amount: number) =>
    client.post<ApiResponse<{ success: boolean; from: string; to: string; deducted: number; credited: number; coins: number; diamonds: number }>>('/agency/wallet/convert', { from, amount })
      .catch(async (err) => {
        if (err?.response?.status === 404 && from === 'diamond') {
          // Fallback to /income/exchange for diamond-to-coin conversion
          return client.post<ApiResponse<any>>('/income/exchange', { points: amount });
        }
        throw err;
      }),

  // Legacy / Linking & Leave flows
  searchAgents: (q: string) =>
    client.get<ApiResponse<any[]>>('/agency/search', { params: { q } }),

  linkByAgent: (agentId: string) =>
    client.post<ApiResponse<any>>('/agency/link-by-agent', { agentId }),

  join: (code: string) =>
    client.post<ApiResponse<{ agency: { _id: string; name: string; code: string } }>>('/agency/join', { code }),

  leave: (reason?: string) =>
    client.post<ApiResponse<{ success: boolean; status: string; requestId?: string; message?: string }>>('/agency/leave', { reason }),

  requestLeave: (reason?: string) =>
    client.post<ApiResponse<{ success: boolean; status: string; requestId?: string; message?: string }>>('/agency/leave-request', { reason }),

  getLeaveStatus: () =>
    client.get<ApiResponse<{ hasPending: boolean; request: LeaveRequestData | null }>>('/agency/leave-status')
      .catch((err) => {
        if (err?.response?.status === 404) return { data: { success: true, data: { hasPending: false, request: null } } } as any;
        throw err;
      }),

  getLeaveRequests: (status?: string) =>
    client.get<ApiResponse<LeaveRequestData[]>>('/agency/leave-requests', { params: { status } })
      .catch((err) => {
        if (err?.response?.status === 404 || err?.response?.status === 403) {
          return { data: { success: true, data: [] } } as any;
        }
        throw err;
      }),

  decideLeaveRequest: (requestId: string, decision: 'approve' | 'reject') =>
    client.post<ApiResponse<{ success: boolean; status: string; message?: string }>>(`/agency/leave-requests/${requestId}/decide`, { decision }),

  getMyAgency: () =>
    client.get<ApiResponse<any>>('/agency/my-agency'),

  suggestAgents: (limit = 5) =>
    client.get<ApiResponse<any[]>>('/agency/suggest', { params: { limit } }),
};
