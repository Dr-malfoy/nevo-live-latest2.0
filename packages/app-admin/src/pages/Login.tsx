import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useAdminAuth } from '../stores/adminAuth';
import { signInWithGoogle } from '../lib/firebase';

export const AdminLogin = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, loading, error } = useAdminAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(phone, password);
      navigate('/', { replace: true });
    } catch {}
  };

  const handleGoogleLogin = async () => {
    try {
      const idToken = await signInWithGoogle();
      await loginWithGoogle(idToken);
      navigate('/', { replace: true });
    } catch (err: any) {
      // Detailed logging for Firebase Google OAuth failures
      console.error('[Admin Login] Google OAuth FAILED — full details:');
      console.error('[Admin Login] Error name:', err?.name);
      console.error('[Admin Login] Error code:', err?.code || err?.error?.code || 'N/A');
      console.error('[Admin Login] Error message:', err?.message);
      if (err?.customData?.serverResponse) {
        console.error('[Admin Login] Firebase server response:', err.customData.serverResponse);
      }
      console.error('[Admin Login] Full error object:', err);

      // Map Firebase error codes to helpful messages
      const code = err?.code || '';
      let msg = 'Google login failed';
      if (code.includes('auth/popup-blocked')) {
        msg = 'Popup was blocked. Allow popups for this site and try again.';
      } else if (code.includes('auth/unauthorized-domain')) {
        msg = 'This domain is not authorized in Firebase. Add localhost:3001 to Firebase Console → Authentication → Authorized domains.';
      } else if (code.includes('auth/cancelled-popup-request') || code.includes('auth/popup-closed-by-user')) {
        msg = 'Sign-in popup was closed before completing.';
      } else if (code.includes('auth/network-request-failed')) {
        msg = 'Network error reaching Google. Check your connection, VPN, or ad blocker.';
      } else if (err?.message?.includes('Network Error')) {
        msg = 'Network error reaching Google. Check your connection, VPN, or ad blocker, and confirm popups are allowed.';
      }
      console.error('[Admin Login] Displayed to user:', msg);
      // Show the error on the form
      useAdminAuth.setState({ error: msg });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="bg-dark-800 rounded-xl p-6 space-y-4">
          <h1 className="text-xl font-bold text-center">Admin Login</h1>
          {error && <div className="bg-red-600/20 border border-red-600/50 text-red-400 text-sm p-3 rounded-lg">{error}</div>}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Admin phone" className="w-full bg-dark-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className="w-full bg-dark-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary-600 rounded-lg font-medium text-sm disabled:opacity-50">{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>

        <div className="flex items-center gap-3 my-6 px-2">
          <div className="flex-1 h-px bg-dark-700" />
          <span className="text-dark-400 text-sm">or</span>
          <div className="flex-1 h-px bg-dark-700" />
        </div>

        <button onClick={handleGoogleLogin} disabled={loading} className="w-full py-2.5 bg-dark-700 hover:bg-dark-600 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors">
          <Mail className="w-4 h-4" /> Continue with Google
        </button>
      </div>
    </div>
  );
};
