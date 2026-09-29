import client from './client';
import type { ApiResponse } from '../types';

export const rouletteApi = {
  getHistory: (params?: any) =>
    client.get<ApiResponse>('/roulette/history', { params }),
};
