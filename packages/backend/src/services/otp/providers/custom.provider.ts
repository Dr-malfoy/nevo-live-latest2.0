import { IOtpProvider, SendOtpOptions, SendOtpResult } from '../otp.types';
import { OtpChannel } from '../../../models';
import { otpConfig } from '../../../config/otp.config';

export class CustomProvider implements IOtpProvider {
  readonly name = 'custom';
  readonly supportedChannels: OtpChannel[] = ['sms', 'whatsapp'];

  async sendOtp(options: SendOtpOptions): Promise<SendOtpResult> {
    const config = otpConfig.providers.custom;
    const endpoint = options.channel === 'whatsapp' ? config.whatsappEndpoint : config.smsEndpoint;

    if (!endpoint) {
      console.error(`[CustomProvider] Missing endpoint for channel: ${options.channel}`);
      return {
        success: false,
        provider: this.name,
        error: `Custom ${options.channel} endpoint is not configured`,
      };
    }

    try {
      const payload = {
        phone: options.phone,
        otp: options.otp,
        channel: options.channel,
        message: `Your Navo Live verification code is ${options.otp}`,
        expiresInMinutes: options.expiresInMinutes,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        ...config.headers,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        return {
          success: true,
          provider: this.name,
          messageId: `custom_${Date.now()}`,
        };
      }

      return {
        success: false,
        provider: this.name,
        error: `Custom gateway returned HTTP ${response.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        error: err?.message || 'Custom gateway error',
      };
    }
  }
}
