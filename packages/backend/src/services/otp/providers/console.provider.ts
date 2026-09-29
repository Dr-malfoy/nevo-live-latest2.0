import { IOtpProvider, SendOtpOptions, SendOtpResult } from '../otp.types';
import { OtpChannel } from '../../../models';

export class ConsoleOtpProvider implements IOtpProvider {
  readonly name = 'console';
  readonly supportedChannels: OtpChannel[] = ['sms', 'whatsapp'];

  async sendOtp(options: SendOtpOptions): Promise<SendOtpResult> {
    const channelUpper = options.channel.toUpperCase();
    const divider = '━'.repeat(54);

    console.log(`\n\x1b[36m${divider}\x1b[0m`);
    console.log(`\x1b[1m\x1b[33m⚡ [OTP DEV MODE] Simulated ${channelUpper} Delivery\x1b[0m`);
    console.log(`${divider}`);
    console.log(`  \x1b[32mChannel:\x1b[0m   ${channelUpper}`);
    console.log(`  \x1b[32mPhone:\x1b[0m     ${options.phone}`);
    console.log(`  \x1b[32mPurpose:\x1b[0m   ${options.purpose || 'signup'}`);
    console.log(`  \x1b[35mOTP Code:\x1b[0m  \x1b[1m\x1b[37m\x1b[44m ${options.otp} \x1b[0m`);
    console.log(`  \x1b[32mExpires:\x1b[0m   ${options.expiresInMinutes} minutes`);
    console.log(`\x1b[36m${divider}\x1b[0m\n`);

    return {
      success: true,
      provider: 'console',
      messageId: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
  }
}
