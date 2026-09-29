import client from './client';
import type { ApiResponse } from '../types';

export const agencyApi = {
  searchAgents: (q: string) =>
    client.get<ApiResponse<any[]>>('/agency/search', { params: { q } }),

  linkByAgent: (agentId: string) =>
    client.post<ApiResponse<any>>('/agency/link-by-agent', { agentId }),

  join: (code: string) =>
    client.post<ApiResponse<{ agency: { _id: string; name: string; code: string } }>>('/agency/join', { code }),

  leave: () =>
    client.post<ApiResponse<{ left: boolean }>>('/agency/leave'),

  getMyAgency: () =>
    client.get<ApiResponse<any>>('/agency/my-agency'),

  suggestAgents: (limit = 5) =>
    client.get<ApiResponse<any[]>>('/agency/suggest', { params: { limit } }),
};
