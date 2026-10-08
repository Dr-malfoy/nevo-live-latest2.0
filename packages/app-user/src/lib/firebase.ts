import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  getRedirectResult,
  signInWithCredential,
  PhoneAuthProvider,
  ConfirmationResult,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';

const GOOGLE_WEB_CLIENT_ID = '240298940237-smbba5g08k46atvtsi4o5idrt82qgc98.apps.googleusercontent.com';

const firebaseConfig = {
  apiKey: 'AIzaSyAGbWH41wBsRN2ZPce5RxyOh2zFN8lSJ1U',
  authDomain: 'nevo-live-latest.firebaseapp.com',
  projectId: 'nevo-live-latest',
  storageBucket: 'nevo-live-latest.firebasestorage.app',
  messagingSenderId: '240298940237',
  appId: '1:240298940237:android:4a3f4b7f7904cd0e734904',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.useDeviceLanguage();

// Cached active ConfirmationResult
let activeConfirmation: ConfirmationResult | null = null;
let activeRecaptchaVerifier: RecaptchaVerifier | null = null;

export const setupRecaptcha = (containerId: string): RecaptchaVerifier => {
  try {
    if (activeRecaptchaVerifier) {
      try {
        activeRecaptchaVerifier.clear();
      } catch {
        // ignore
      }
      activeRecaptchaVerifier = null;
    }

    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }

    activeRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {
        console.warn('reCAPTCHA expired, please try again.');
      },
    });

    return activeRecaptchaVerifier;
  } catch (err) {
    console.warn('Error setting up reCAPTCHA:', err);
    activeRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {},
    });
    return activeRecaptchaVerifier;
  }
};

export const clearRecaptcha = () => {
  if (activeRecaptchaVerifier) {
    try {
      activeRecaptchaVerifier.clear();
    } catch {
      // ignore
    }
    activeRecaptchaVerifier = null;
  }
};

export const sendPhoneOtp = async (
  fullPhoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
  const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
  activeConfirmation = confirmation;
  return confirmation;
};

export const verifyPhoneOtp = async (
  confirmationOrVerificationId: ConfirmationResult | string,
  code: string
): Promise<{ idToken: string; user: any }> => {
  if (typeof confirmationOrVerificationId === 'object' && confirmationOrVerificationId?.confirm) {
    const result = await confirmationOrVerificationId.confirm(code);
    const idToken = await result.user.getIdToken();
    return { idToken, user: result.user };
  }

  if (activeConfirmation) {
    const result = await activeConfirmation.confirm(code);
    const idToken = await result.user.getIdToken();
    return { idToken, user: result.user };
  }

  const credential = PhoneAuthProvider.credential(confirmationOrVerificationId as string, code);
  const result = await auth.signInWithCredential(credential);
  const idToken = await result.user?.getIdToken();
  if (!idToken) throw new Error('Failed to get ID token');
  return { idToken, user: result.user };
};

export const signInWithGoogle = async (): Promise<string> => {
  const provider = new GoogleAuthProvider();

  // Native Android / iOS Google Sign-In sheet
  if (Capacitor.isNativePlatform()) {
    try {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
      await GoogleAuth.initialize({
        clientId: GOOGLE_WEB_CLIENT_ID,
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser?.authentication?.idToken;
      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        const res = await signInWithCredential(auth, credential);
        return (await res.user.getIdToken()) || idToken;
      }
    } catch (nativeErr: any) {
      console.warn('Native Google Auth issue, attempting web popup fallback:', nativeErr);
    }
  }

  // Web Browser Popup Flow
  try {
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    return idToken;
  } catch (err: any) {
    if (err.code === 'auth/popup-blocked') {
      throw new Error('Google sign-in popup was blocked by your browser. Please allow popups.');
    }
    throw err;
  }
};

export const signInWithFacebook = async (): Promise<{ idToken: string; accessToken?: string }> => {
  const provider = new FacebookAuthProvider();
  provider.setCustomParameters({ display: 'popup' });

  // Native Android/iOS Facebook Login Sheet
  if (Capacitor.isNativePlatform()) {
    try {
      const { FacebookLogin } = await import('@capacitor-community/facebook-login');
      const res = await FacebookLogin.login({ permissions: ['public_profile', 'email'] });
      if (res?.accessToken?.token) {
        const fbAccessToken = res.accessToken.token;
        const credential = FacebookAuthProvider.credential(fbAccessToken);
        const firebaseResult = await signInWithCredential(auth, credential);
        const idToken = await firebaseResult.user.getIdToken();
        return { idToken, accessToken: fbAccessToken };
      }
    } catch (nativeErr: any) {
      console.warn('[FacebookAuth] Native Facebook Login warning, trying web popup fallback:', nativeErr);
    }
  }

  // Web Browser Flow
  try {
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    const credential = FacebookAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    return { idToken, accessToken };
  } catch (err: any) {
    if (err.code === 'auth/popup-blocked') {
      throw new Error('Facebook sign-in popup was blocked by your browser. Please allow popups.');
    }
    throw err;
  }
};

/**
 * Checks if user is returning from a Firebase redirect flow (Google/Facebook).
 */
export const handleFirebaseRedirectResult = async (): Promise<{
  providerId: 'facebook.com' | 'google.com' | string;
  idToken: string;
  accessToken?: string;
} | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (!result || !result.user) return null;

    const idToken = await result.user.getIdToken();
    let accessToken: string | undefined;

    const providerId =
      result.providerId ||
      (result as any)._tokenResponse?.providerId ||
      result.user.providerData?.[0]?.providerId ||
      '';

    if (providerId.includes('facebook') || (result as any)._tokenResponse?.federatedId?.includes('facebook')) {
      const credential = FacebookAuthProvider.credentialFromResult(result);
      accessToken = credential?.accessToken;
      return { providerId: 'facebook.com', idToken, accessToken };
    }

    return { providerId: 'google.com', idToken };
  } catch (err: any) {
    // Gracefully ignore missing initial state on page loads when no redirect was performed
    if (err?.code === 'auth/missing-initial-state' || err?.message?.includes('missing initial state')) {
      return null;
    }
    console.warn('Firebase getRedirectResult notice:', err);
    return null;
  }
};

export const mapFirebaseAuthError = (err: any): string => {
  const code = err?.code || '';
  const message = err?.message || '';

  if (code === 'auth/invalid-verification-code') {
    return 'Invalid verification code. Please check the code and try again.';
  }
  if (code === 'auth/code-expired') {
    return 'Verification code has expired. Please tap "Resend Code".';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many requests sent. Please wait a few moments and try again.';
  }
  if (code === 'auth/invalid-phone-number') {
    return 'Invalid phone number. Please ensure the country code and number are correct.';
  }
  if (code === 'auth/quota-exceeded') {
    return 'SMS quota exceeded for today. Please try again later or use an alternative login method.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Login window was closed before completing authentication.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Popup window was blocked by your browser. Please allow popups for this site.';
  }
  if (code === 'auth/missing-initial-state' || message?.includes('missing initial state')) {
    return 'Authentication session expired. Please sign in using Facebook or Phone / Password.';
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'An account already exists with this email using another sign-in method.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in provider is not enabled in Firebase Console. Please enable it in Firebase Authentication or use Phone / Gmail / Password.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network connection error. Please check your internet connection.';
  }

  return message || 'Authentication failed. Please try again.';
};

export { GoogleAuthProvider, FacebookAuthProvider };
