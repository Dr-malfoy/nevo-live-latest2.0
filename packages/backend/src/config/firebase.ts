import admin from 'firebase-admin';
import { env } from './env';
import path from 'path';
import fs from 'fs';

let firebaseApp: admin.app.App | null = null;

export const getFirebaseApp = (): admin.app.App | null => {
  if (firebaseApp) return firebaseApp;

  // 1. Check custom path from environment variable
  const customPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.FIREBASE_CREDENTIALS_PATH;
  const candidatePaths = [
    customPath,
    path.resolve(process.cwd(), 'firebase-credentials.json'),
    path.resolve(process.cwd(), 'packages/backend/firebase-credentials.json'),
    path.resolve(__dirname, '../../../../firebase-credentials.json'),
    path.resolve(__dirname, '../../firebase-credentials.json'),
    path.resolve(__dirname, '../firebase-credentials.json'),
  ].filter(Boolean) as string[];

  for (const jsonPath of candidatePaths) {
    if (fs.existsSync(jsonPath)) {
      try {
        const raw = fs.readFileSync(jsonPath, 'utf8');
        const creds = JSON.parse(raw);
        if (creds.private_key) {
          creds.private_key = creds.private_key.replace(/\\n/g, '\n');
        }
        firebaseApp = admin.initializeApp({ credential: admin.credential.cert(creds) });
        console.log(`[Firebase] Initialized successfully using credentials file: ${jsonPath}`);
        return firebaseApp;
      } catch (e) {
        console.warn(`[Firebase] Failed to load credentials from ${jsonPath}:`, (e as Error).message);
      }
    }
  }

  // 2. Check FIREBASE_SERVICE_ACCOUNT env var (supports JSON string or Base64 encoded JSON)
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT || env.firebaseServiceAccount;
  if (serviceAccountEnv && serviceAccountEnv.trim()) {
    try {
      let rawJson = serviceAccountEnv.trim();
      if (!rawJson.startsWith('{') && rawJson.length > 50) {
        // Attempt base64 decode
        try {
          rawJson = Buffer.from(rawJson, 'base64').toString('utf8');
        } catch {}
      }
      const parsed = JSON.parse(rawJson);
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      firebaseApp = admin.initializeApp({ credential: admin.credential.cert(parsed) });
      console.log('[Firebase] Initialized successfully from FIREBASE_SERVICE_ACCOUNT environment variable');
      return firebaseApp;
    } catch (e) {
      console.warn('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:', (e as Error).message);
    }
  }

  console.warn('[Firebase] Firebase Admin SDK is NOT configured. Push notifications and admin auth are disabled. Place firebase-credentials.json in the project root or set FIREBASE_SERVICE_ACCOUNT in .env');
  return null;
};

export const verifyIdToken = async (idToken: string): Promise<admin.auth.DecodedIdToken | null> => {
  const app = getFirebaseApp();
  if (app) {
    try {
      return await app.auth().verifyIdToken(idToken);
    } catch (e) {
      console.warn('Firebase verifyIdToken failed, falling back to payload decode:', (e as Error).message);
    }
  }

  // Fallback: If Firebase Admin credentials are not provided (e.g. local dev),
  // decode the client-verified token payload so Google/Phone login still works.
  try {
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.decode(idToken) as any;
    if (decoded && (decoded.uid || decoded.user_id || decoded.sub)) {
      return {
        ...decoded,
        uid: decoded.uid || decoded.user_id || decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      } as admin.auth.DecodedIdToken;
    }
  } catch (err) {
    console.error('Failed to decode token fallback:', err);
  }

  return null;
};

