import client from './client';
import type { ApiResponse } from '../types';

export const reportApi = {
  createReport: (data: { targetType: 'user' | 'stream' | 'moment' | 'transaction' | 'chat' | 'message'; targetId: string; reason: string; details?: string }) =>
    client.post<ApiResponse>('/reports', data),
};
