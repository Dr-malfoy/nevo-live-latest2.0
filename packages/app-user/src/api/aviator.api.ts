import client from './client';
import type { ApiResponse } from '../types';
import type { AviatorHistoryEntry } from '../types/aviator';

export const aviatorApi = {
  getHistory: (params?: any) =>
    client.get<ApiResponse>('/aviator/history', { params }),
  getRounds: () =>
    client.get<ApiResponse<AviatorHistoryEntry[]>>('/aviator/rounds'),
};
