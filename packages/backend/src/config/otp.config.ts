import dotenv from 'dotenv';
import path from 'path';

// Ensure .env at monorepo root is loaded
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const otpConfig = {
  // Environment & Mode
  env: process.env.OTP_ENV || process.env.NODE_ENV || 'development',
  isDevMode: process.env.OTP_DEV_MODE !== 'false', // Defaults to true in development

  // OTP Parameters
  length: parseInt(process.env.OTP_LENGTH || '6', 10),
  expirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10), // 5 minutes
  resendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10), // 60 seconds
  maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  maxRequestsPerWindow: parseInt(process.env.OTP_MAX_REQUESTS || '5', 10),
  rateLimitWindowSeconds: parseInt(process.env.OTP_RATE_LIMIT_WINDOW_SECONDS || '900', 10), // 15 minutes

  // Providers Selection
  smsProvider: (process.env.OTP_SMS_PROVIDER || 'console').toLowerCase(),
  smsFallbackProvider: (process.env.OTP_SMS_FALLBACK_PROVIDER || '').toLowerCase(),
  whatsappProvider: (process.env.OTP_WHATSAPP_PROVIDER || 'console').toLowerCase(),
  whatsappFallbackProvider: (process.env.OTP_WHATSAPP_FALLBACK_PROVIDER || '').toLowerCase(),

  // Provider Credentials
  providers: {
    // SMSBD Credentials (Bangladesh Gateway)
    smsbd: {
      apiKey: process.env.SMSBD_API_KEY || process.env.SMS_API_KEY || '',
      senderId: process.env.SMSBD_SENDER_ID || process.env.SMS_SENDER_ID || 'NAVOMSG',
      apiUrl: process.env.SMSBD_API_URL || 'http://bulksmsbd.net/api/smsapi',
    },
    // Twilio Credentials (SMS & WhatsApp)
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || process.env.SMS_API_KEY || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || process.env.SMS_API_SECRET || '',
      fromSms: process.env.TWILIO_PHONE_NUMBER || process.env.SMS_SENDER_ID || '',
      fromWhatsapp: process.env.TWILIO_WHATSAPP_NUMBER || process.env.WHATSAPP_SENDER_ID || 'whatsapp:+14155238886',
    },
    // Generic HTTP Provider config
    custom: {
      smsEndpoint: process.env.CUSTOM_SMS_ENDPOINT || '',
      whatsappEndpoint: process.env.CUSTOM_WHATSAPP_ENDPOINT || '',
      apiKey: process.env.CUSTOM_OTP_API_KEY || '',
      headers: process.env.CUSTOM_OTP_HEADERS ? JSON.parse(process.env.CUSTOM_OTP_HEADERS) : {},
    },
  },
} as const;
