import dotenv from 'dotenv';
import path from 'path';

// __dirname resolves to packages/backend/src/config/
// Going up 4 levels reaches the project root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

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
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
} as const;

const required = (key: string, value: string | undefined): string => {
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

export const getRequired = (key: keyof typeof env): string => {
  return required(key, process.env[key]);
};
