import client from './client';
import type { ApiResponse, VerificationRequest, VerificationState, User } from '../types';

export interface SubmitVerificationPayload {
  accountType?: 'host' | 'agency' | 'user';
  fullName?: string;
  olaId?: string;
  nidNumber?: string;
  dateOfBirth?: string;
  documentType?: 'nid' | 'olaid' | 'passport' | 'driving_license';
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
  facePhotoUrl?: string;
}

export interface VerifyFacePayload {
  selfieUrl?: string;
  base64Image?: string;
}

export interface SubmitNidPayload {
  fullName: string;
  nidNumber: string;
  dateOfBirth: string;
  documentType?: 'nid' | 'olaid' | 'passport' | 'driving_license';
  documentFrontUrl: string;
  documentBackUrl: string;
  selfieUrl?: string;
  accountType?: 'host' | 'agency' | 'user';
  autoApprove?: boolean;
}

export interface VerificationMyResponse {
  verification: VerificationState;
  request: VerificationRequest | null;
  requests?: VerificationRequest[];
}

export interface VerificationResultResponse {
  request: VerificationRequest;
  user: User;
  verified: boolean;
  faceVerified?: boolean;
  nidVerified?: boolean;
}

export const verificationApi = {
  getMyRequest: () =>
    client.get<ApiResponse<VerificationMyResponse>>('/verification/my'),

  verifyFace: (data: VerifyFacePayload) =>
    client.post<ApiResponse<VerificationResultResponse>>('/verification/face', data),

  submitNid: (data: SubmitNidPayload) =>
    client.post<ApiResponse<VerificationResultResponse>>('/verification/nid', data),

  submit: (data: SubmitVerificationPayload) =>
    client.post<ApiResponse<VerificationRequest>>('/verification/submit', data),
};
