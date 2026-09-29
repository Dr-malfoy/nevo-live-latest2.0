import client from './client';
import type { ApiResponse } from '../types';

export const aviatorApi = {
  getHistory: (params?: any) =>
    client.get<ApiResponse>('/aviator/history', { params }),
};
