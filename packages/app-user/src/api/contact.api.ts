import client from './client';
import type { ApiResponse } from '../types';

export interface SupportTicket {
  _id: string;
  ticketId: string;
  category: string;
  subject: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  adminReply?: string;
  replies?: Array<{
    _id?: string;
    sender: 'user' | 'admin' | 'support';
    senderName?: string;
    message: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramConfigData {
  channelUrl: string;
  supportUrl: string;
  groupUrl: string;
}

export const contactApi = {
  sendMessage: (data: { subject: string; message: string; category?: string }) =>
    client.post<ApiResponse<SupportTicket>>('/contact', data),

  getMyMessages: (params?: { page?: number; limit?: number; status?: string }) =>
    client.get<ApiResponse<SupportTicket[]>>('/contact/mine', { params }),

  getMessageById: (id: string) =>
    client.get<ApiResponse<SupportTicket>>(`/contact/${id}`),

  addReply: (id: string, data: { message: string }) =>
    client.post<ApiResponse<SupportTicket>>(`/contact/${id}/reply`, data),

  getTelegramConfig: () =>
    client.get<ApiResponse<TelegramConfigData>>('/contact/telegram-config'),
};


