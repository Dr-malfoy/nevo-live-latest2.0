import client from './client';
import type { ApiResponse } from '../types';

export const teenPattiApi = {
  getHistory: (params?: any) =>
    client.get<ApiResponse>('/teenpatti/history', { params }),
};
