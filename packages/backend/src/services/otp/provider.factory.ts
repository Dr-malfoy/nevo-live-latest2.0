import { IOtpProvider, SendOtpOptions, SendOtpResult } from './otp.types';
import { OtpChannel } from '../../models';
import { otpConfig } from '../../config/otp.config';
import { ConsoleOtpProvider } from './providers/console.provider';
import { SmsBdProvider } from './providers/smsbd.provider';
import { TwilioProvider } from './providers/twilio.provider';
import { CustomProvider } from './providers/custom.provider';

export class OtpProviderFactory {
  private static providers: Map<string, IOtpProvider> = new Map();

  static {
    // Register built-in providers
    this.register(new ConsoleOtpProvider());
    this.register(new SmsBdProvider());
    this.register(new TwilioProvider());
    this.register(new CustomProvider());
  }

  public static register(provider: IOtpProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  public static getProvider(name: string): IOtpProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  /**
   * Resolves the primary provider adapter for a channel.
   * If OTP_DEV_MODE is true, always defaults to the Console provider.
   */
  public static resolveProvider(channel: OtpChannel): IOtpProvider {
    if (otpConfig.isDevMode) {
      return this.providers.get('console')!;
    }

    const targetName =
      channel === 'whatsapp' ? otpConfig.whatsappProvider : otpConfig.smsProvider;

    const provider = this.providers.get(targetName);
    if (provider && provider.supportedChannels.includes(channel)) {
      return provider;
    }

    // Default to console fallback if provider not found
    console.warn(`[OTP] Configured provider "${targetName}" for channel "${channel}" not available. Falling back to Console provider.`);
    return this.providers.get('console')!;
  }

  /**
   * Resolves an optional fallback provider for a channel if configured.
   */
  public static resolveFallbackProvider(channel: OtpChannel): IOtpProvider | null {
    if (otpConfig.isDevMode) return null;

    const fallbackName =
      channel === 'whatsapp'
        ? otpConfig.whatsappFallbackProvider
        : otpConfig.smsFallbackProvider;

    if (!fallbackName) return null;

    const provider = this.providers.get(fallbackName);
    if (provider && provider.supportedChannels.includes(channel)) {
      return provider;
    }

    return null;
  }

  /**
   * Sends OTP with automatic fallback support if the primary provider fails.
   */
  public static async dispatchOtp(options: SendOtpOptions): Promise<SendOtpResult> {
    const primary = this.resolveProvider(options.channel);

    try {
      const result = await primary.sendOtp(options);
      if (result.success) {
        return result;
      }

      console.warn(`[OTP] Primary provider "${primary.name}" failed: ${result.error}`);
    } catch (err: any) {
      console.error(`[OTP] Primary provider "${primary.name}" threw error:`, err?.message || err);
    }

    // Try fallback provider if configured
    const fallback = this.resolveFallbackProvider(options.channel);
    if (fallback && fallback.name !== primary.name) {
      console.log(`[OTP] Attempting fallback provider "${fallback.name}" for channel "${options.channel}"...`);
      try {
        const fallbackResult = await fallback.sendOtp(options);
        if (fallbackResult.success) {
          return fallbackResult;
        }
        console.error(`[OTP] Fallback provider "${fallback.name}" also failed: ${fallbackResult.error}`);
      } catch (err: any) {
        console.error(`[OTP] Fallback provider "${fallback.name}" threw error:`, err?.message || err);
      }
    }

    return {
      success: false,
      provider: primary.name,
      error: 'Unable to deliver verification code. Please try again or choose another channel.',
    };
  }
}
