import { IOtpProvider, SendOtpOptions, SendOtpResult } from '../otp.types';
import { OtpChannel } from '../../../models';
import { otpConfig } from '../../../config/otp.config';

export class SmsBdProvider implements IOtpProvider {
  readonly name = 'smsbd';
  readonly supportedChannels: OtpChannel[] = ['sms'];

  async sendOtp(options: SendOtpOptions): Promise<SendOtpResult> {
    const config = otpConfig.providers.smsbd;
    if (!config.apiKey) {
      console.error('[SMSBD] Missing API key in environment variables (SMSBD_API_KEY / SMS_API_KEY)');
      return {
        success: false,
        provider: this.name,
        error: 'SMS provider is not properly configured',
      };
    }

    try {
      // Format 8801XXXXXXXXX for SMSBD
      const rawNumber = options.phone.replace(/^\+/, '');
      const message = `Your Navo Live verification code is ${options.otp}. Valid for ${options.expiresInMinutes} minutes. Do not share this with anyone.`;

      const params = new URLSearchParams({
        api_key: config.apiKey,
        type: 'text',
        number: rawNumber,
        senderid: config.senderId,
        message,
      });

      const response = await fetch(`${config.apiUrl}?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (!response.ok) {
        console.error(`[SMSBD] HTTP error: ${response.status} ${response.statusText}`);
        return {
          success: false,
          provider: this.name,
          error: 'Failed to deliver SMS',
        };
      }

      const data = (await response.json().catch(() => null)) as any;

      // Check response_code from SMSBD (202 or 1000 indicates success)
      if (data && (data.response_code === 202 || data.response_code === 1000 || data.success === true)) {
        return {
          success: true,
          provider: this.name,
          messageId: data.message_id || `smsbd_${Date.now()}`,
        };
      }

      console.error('[SMSBD] API returned failure response:', data?.error_message || data?.msg || data);
      return {
        success: false,
        provider: this.name,
        error: data?.error_message || 'SMS delivery failed',
      };
    } catch (err: any) {
      console.error('[SMSBD] Network/Gateway exception:', err?.message || err);
      return {
        success: false,
        provider: this.name,
        error: 'SMS gateway timeout or network error',
      };
    }
  }
}
