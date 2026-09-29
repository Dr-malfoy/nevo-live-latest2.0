import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDWJ2rRVp_2cmu08uLG5hl84cVQtXA5zdw',
  authDomain: 'novolive-61dd4.firebaseapp.com',
  projectId: 'novolive-61dd4',
  storageBucket: 'novolive-61dd4.firebasestorage.app',
  messagingSenderId: '624842387198',
  appId: '1:624842387198:web:863a6da061ee1550cdffaf',
  measurementId: 'G-ZNMBL9RFN8',
};

const app = initializeApp(firebaseConfig, 'admin');
export const auth = getAuth(app);
auth.useDeviceLanguage();

export const signInWithGoogle = async (): Promise<string> => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return idToken;
};
