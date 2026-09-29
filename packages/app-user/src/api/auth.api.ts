import client from './client';
import type { ApiResponse } from '../types';

export interface SendOtpResponseData {
  phone: string;
  channel: 'sms' | 'whatsapp';
  cooldownSeconds: number;
  expiresInSeconds: number;
  devOtp?: string;
}

export interface VerifyOtpOnlyResponseData {
  phone: string;
  verificationToken: string;
}

export interface SearchAccountResponseData {
  uid: string;
  nickname: string;
  username?: string;
  avatar?: string;
  phone: string;
  rawPhone: string;
  email?: string;
}

export const authApi = {
  searchAccount: (query: string) =>
    client.post<ApiResponse<SearchAccountResponseData>>('/auth/search-account', { query }),

  sendOtp: (phone: string, channel: 'sms' | 'whatsapp' = 'sms', purpose: 'signup' | 'login' | 'reset_password' = 'signup') =>
    client.post<ApiResponse<SendOtpResponseData>>('/auth/send-otp', { phone, channel, purpose }),

  resendOtp: (phone: string, channel: 'sms' | 'whatsapp' = 'sms', purpose: 'signup' | 'login' | 'reset_password' = 'signup') =>
    client.post<ApiResponse<SendOtpResponseData>>('/auth/resend-otp', { phone, channel, purpose }),

  verifyOtpOnly: (phone: string, code: string, purpose: 'signup' | 'login' | 'reset_password' = 'signup') =>
    client.post<ApiResponse<VerifyOtpOnlyResponseData>>('/auth/verify-otp', { phone, code, purpose }),

  verifyOtp: (phone: string, code?: string, idToken?: string, purpose: 'signup' | 'login' | 'reset_password' = 'login') =>
    client.post<ApiResponse<{ token: string; user: any }>>('/auth/verify-otp', {
      phone,
      code,
      idToken,
      purpose,
    }),

  passwordLogin: (phone: string, password: string) =>
    client.post<ApiResponse<{ token: string; user: any }>>('/auth/login', {
      phone,
      password,
    }),

  googleLogin: (idToken: string) =>
    client.post<ApiResponse<{ token: string; user: any }>>('/auth/google', {
      idToken,
    }),

  register: (payload: {
    fullName?: string;
    username?: string;
    phone: string;
    email?: string;
    nickname?: string;
    password?: string;
    confirmPassword?: string;
    verificationToken?: string;
    code?: string;
  }) =>
    client.post<ApiResponse<{ token: string; user: any }>>('/auth/register', payload),

  devLogin: (phone: string, nickname?: string) =>
    client.post<ApiResponse<{ token: string; user: any }>>('/auth/dev', {
      phone,
      nickname,
    }),

  resetPassword: (payload: {
    phone: string;
    newPassword: string;
    code?: string;
    idToken?: string;
    verificationToken?: string;
  }) =>
    client.post<ApiResponse>('/auth/reset-password', payload),
};

