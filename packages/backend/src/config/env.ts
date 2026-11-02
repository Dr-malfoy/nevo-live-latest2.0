import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from environment or .env file across potential locations
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'packages/backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Parse Cloudinary credentials (supports individual vars OR unified CLOUDINARY_URL)
let cloudinaryCloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
let cloudinaryApiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
let cloudinaryApiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

if (process.env.CLOUDINARY_URL && (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret)) {
  try {
    const parsed = new URL(process.env.CLOUDINARY_URL);
    cloudinaryCloudName = parsed.hostname || cloudinaryCloudName;
    cloudinaryApiKey = decodeURIComponent(parsed.username || '') || cloudinaryApiKey;
    cloudinaryApiSecret = decodeURIComponent(parsed.password || '') || cloudinaryApiSecret;
  } catch {
    const match = process.env.CLOUDINARY_URL.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (match) {
      cloudinaryApiKey = match[1];
      cloudinaryApiSecret = match[2];
      cloudinaryCloudName = match[3];
    }
  }
}

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/bogolive',
  clientUrl: process.env.CLIENT_URL || 'https://nevo-live-app-user.onrender.com',
  nodeEnv: process.env.NODE_ENV || 'development',

  jwtSecret: process.env.JWT_SECRET || 'bogolive-jwt-secret-key-change-in-production',

  agora: {
    appId: process.env.AGORA_APP_ID || '',
    appCertificate: process.env.AGORA_APP_CERTIFICATE || '',
    appCertificateSecondary: process.env.AGORA_APP_CERTIFICATE_SECONDARY || '',
  },

  firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || '',

  cloudinary: {
    cloudName: cloudinaryCloudName,
    apiKey: cloudinaryApiKey,
    apiSecret: cloudinaryApiSecret,
    isConfigured: Boolean(cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret),
  },
} as const;

const required = (key: string, value: string | undefined): string => {
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

export const getRequired = (key: keyof typeof env): string => {
  return required(key, process.env[key]);
};
