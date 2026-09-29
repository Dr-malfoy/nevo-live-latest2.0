import { OtpChannel, OtpPurpose } from '../../models';

export interface SendOtpOptions {
  phone: string;
  otp: string;
  channel: OtpChannel;
  purpose?: OtpPurpose;
  expiresInMinutes: number;
}

export interface SendOtpResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

/**
 * Standard Interface for all SMS and WhatsApp Provider Adapters
 */
export interface IOtpProvider {
  readonly name: string;
  readonly supportedChannels: OtpChannel[];

  sendOtp(options: SendOtpOptions): Promise<SendOtpResult>;
}
