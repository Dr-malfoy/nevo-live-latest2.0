import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
  secure: true,
});

export async function verifyCloudinary(): Promise<boolean> {
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    console.warn('⚠️  [Cloudinary] Credentials not fully configured. Cloud storage is not active.');
    return false;
  }
  try {
    const res = await cloudinary.api.ping();
    console.log(`☁️  [Cloudinary] Connected successfully: cloud="${env.cloudinary.cloudName}", status="${res.status}"`);
    return true;
  } catch (error: any) {
    console.error(`❌ [Cloudinary] Connection test failed: ${error.message || error}`);
    return false;
  }
}

export default cloudinary;
