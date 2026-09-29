import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  GoogleAuthProvider,
  signInWithPopup,
  PhoneAuthProvider,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDWJ2rRVp_2cmu08uLG5hl84cVQtXA5zdw',
  authDomain: 'novolive-61dd4.firebaseapp.com',
  projectId: 'novolive-61dd4',
  storageBucket: 'novolive-61dd4.firebasestorage.app',
  messagingSenderId: '624842387198',
  appId: '1:624842387198:web:863a6da061ee1550cdffaf',
  measurementId: 'G-ZNMBL9RFN8',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.useDeviceLanguage();

export const setupRecaptcha = (containerId: string): RecaptchaVerifier => {
  return new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {},
  });
};

export const sendPhoneOtp = async (
  phone: string,
  verifier: RecaptchaVerifier
): Promise<string> => {
  const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
  return confirmation.verificationId;
};

export const verifyPhoneOtp = async (
  verificationId: string,
  code: string
): Promise<string> => {
  const credential = PhoneAuthProvider.credential(verificationId, code);
  const result = await auth.signInWithCredential(credential);
  const idToken = await result.user?.getIdToken();
  if (!idToken) throw new Error('Failed to get ID token');
  return idToken;
};

export const signInWithGoogle = async (): Promise<string> => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return idToken;
};

export { GoogleAuthProvider };
