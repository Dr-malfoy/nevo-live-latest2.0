import client from './client';
import type { ApiResponse, UserPublic } from '../types';

/**
 * Agent dashboard — #5, #34, #52, #54. Specified in BACKEND-GUIDE.md §4.7.
 *
 * `/agent/dashboard`, `/orders`, `/customers`, `/wallet` and `/payment-info`
 * already exist; everything below the divider does not.
 */

/** The exact 8 options in the #54 dropdown. */
export type AgentRange =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'last_week'
  | 'month'
  | 'last_month'
  | '7d'
  | '30d';

export const AGENT_RANGES: { key: AgentRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'Current Week' },
  { key: 'last_week', label: 'Last Week' },
  { key: 'month', label: 'This Month' },
  { key: 'last_month', label: 'Last month' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 days' },
];

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface AgentEarnings {
  earnedToday: number;
  points: number;
  accumulated: number;
  levelProgress: number;
  maxed?: boolean;
  totals: {
    totalEarnings: number;
    hostEarnings: number;
    inviteAgentEarnings: number;
    totalCommission: number;
    hostCommission: number;
    inviteAgentCommission: number;
  };
  series: SeriesPoint[];
  refreshedAt?: string;
}

export interface AgentHostData {
  new: number;
  newBaseSalary: number;
  liveDurationSec: number;
  validHosts: number;
  series: SeriesPoint[];
  refreshedAt?: string;
}

export interface AgentInviteData {
  new: number;
  haveIncome: number;
  series: SeriesPoint[];
  refreshedAt?: string;
}

export interface AgentHostRow {
  _id: string;
  serial: number;
  user: UserPublic;
  liveDurationSec: number;
  partyDurationSec: number;
  earnings: number;
  commission: number;
}

export interface HostApplication {
  _id: string;
  user: UserPublic;
  hostCode?: string;
  appliedAt: string;
}

export interface HostGroup {
  _id: string;
  name: string;
  memberCount: number;
}

export const agentApi = {
  /* ── Exists ─────────────────────────────────────────────────────── */
  getDashboard: () => client.get<ApiResponse<any>>('/agent/dashboard'),
  getCustomers: (params?: any) => client.get<ApiResponse<any[]>>('/agent/customers', { params }),
  getWallet: () => client.get<ApiResponse<any>>('/agent/wallet'),
  getOrders: (params?: any) => client.get<ApiResponse<any[]>>('/agent/orders', { params }),

  /* ── Not built yet — §4.7 ───────────────────────────────────────── */
  getEarnings: (range: AgentRange = '30d') =>
    client.get<ApiResponse<AgentEarnings>>('/agent/earnings', { params: { range } }),

  getHostData: (range: AgentRange = 'week') =>
    client.get<ApiResponse<AgentHostData>>('/agent/host-data', { params: { range } }),

  getInviteAgentData: (range: AgentRange = 'week') =>
    client.get<ApiResponse<AgentInviteData>>('/agent/invite-agent-data', { params: { range } }),

  getHosts: (params?: { range?: AgentRange; search?: string; page?: number }) =>
    client.get<ApiResponse<AgentHostRow[]>>('/agent/hosts', { params }),

  getApplications: () => client.get<ApiResponse<HostApplication[]>>('/agent/applications'),
  acceptApplication: (id: string) => client.post<ApiResponse>(`/agent/applications/${id}/accept`),
  rejectApplication: (id: string) => client.post<ApiResponse>(`/agent/applications/${id}/reject`),

  getHostGroups: () => client.get<ApiResponse<HostGroup[]>>('/agent/host-groups'),
  createHostGroup: (name: string) => client.post<ApiResponse<HostGroup>>('/agent/host-groups', { name }),
};
