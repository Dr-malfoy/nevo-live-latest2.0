import { IOtpProvider, SendOtpOptions, SendOtpResult } from '../otp.types';
import { OtpChannel } from '../../../models';
import { otpConfig } from '../../../config/otp.config';

export class TwilioProvider implements IOtpProvider {
  readonly name = 'twilio';
  readonly supportedChannels: OtpChannel[] = ['sms', 'whatsapp'];

  async sendOtp(options: SendOtpOptions): Promise<SendOtpResult> {
    const config = otpConfig.providers.twilio;

    if (!config.accountSid || !config.authToken) {
      console.error('[Twilio] Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
      return {
        success: false,
        provider: this.name,
        error: 'Twilio provider is not properly configured',
      };
    }

    const isWhatsApp = options.channel === 'whatsapp';
    const from = isWhatsApp ? config.fromWhatsapp : config.fromSms;
    const to = isWhatsApp ? `whatsapp:${options.phone}` : options.phone;

    if (!from) {
      console.error(`[Twilio] Missing sender ${isWhatsApp ? 'TWILIO_WHATSAPP_NUMBER' : 'TWILIO_PHONE_NUMBER'}`);
      return {
        success: false,
        provider: this.name,
        error: `Twilio ${options.channel} sender number is missing`,
      };
    }

    try {
      const messageBody = `Your Navo Live verification code is ${options.otp}. Valid for ${options.expiresInMinutes} minutes.`;

      const params = new URLSearchParams();
      params.append('From', from);
      params.append('To', to);
      params.append('Body', messageBody);

      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
      const authHeader = 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        signal: AbortSignal.timeout(10000),
      });

      const data = (await response.json().catch(() => null)) as any;

      if (response.ok && data?.sid) {
        return {
          success: true,
          provider: this.name,
          messageId: data.sid,
        };
      }

      console.error('[Twilio] API Error:', data?.message || data?.code || response.statusText);
      return {
        success: false,
        provider: this.name,
        error: data?.message || 'Twilio delivery failed',
      };
    } catch (err: any) {
      console.error('[Twilio] Network Exception:', err?.message || err);
      return {
        success: false,
        provider: this.name,
        error: 'Twilio connection timeout or network error',
      };
    }
  }
}
