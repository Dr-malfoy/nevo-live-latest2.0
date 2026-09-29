import client from './client';
import type { ApiResponse } from '../types';

export const contactApi = {
  sendMessage: (data: { subject: string; message: string }) =>
    client.post<ApiResponse>('/contact', data),

  getMyMessages: (params?: any) =>
    client.get<ApiResponse>('/contact/mine', { params }),
};
