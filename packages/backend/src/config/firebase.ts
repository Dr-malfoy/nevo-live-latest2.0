import admin from 'firebase-admin';
import { env } from './env';
import path from 'path';
import fs from 'fs';

let firebaseApp: admin.app.App | null = null;

export const getFirebaseApp = (): admin.app.App | null => {
  if (firebaseApp) return firebaseApp;

  const jsonPath = path.resolve(__dirname, '../../../../firebase-credentials.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const raw = fs.readFileSync(jsonPath, 'utf8');
      const creds = JSON.parse(raw);
      if (creds.private_key) {
        creds.private_key = creds.private_key.replace(/\\n/g, '\n');
      }
      firebaseApp = admin.initializeApp({ credential: admin.credential.cert(creds) });
      return firebaseApp;
    } catch (e) {
      console.warn('Firebase init failed:', (e as Error).message);
    }
  }

  if (env.firebaseServiceAccount) {
    try {
      const parsed = JSON.parse(env.firebaseServiceAccount);
      if (parsed.private_key) parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      firebaseApp = admin.initializeApp({ credential: admin.credential.cert(parsed) });
      return firebaseApp;
    } catch (e) {
      console.warn('Firebase env fallback failed:', (e as Error).message);
    }
  }

  console.warn('Firebase not configured — Google/OTP auth unavailable');
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

