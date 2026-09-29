import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCoinAuth } from '../stores/coinAuth';

export const CoinLogin = () => {
  const navigate = useNavigate();
  const { login } = useCoinAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handle = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    console.log('[Agent Login] Attempting login for phone:', phone);

    try {
      await login(phone, password);
      console.log('[Agent Login] Login successful — redirecting to dashboard');
      navigate('/');
    } catch (ex: any) {
      // Detailed error logging to help diagnose agent login failures
      console.error('[Agent Login] Login FAILED — full error details:');
      console.error('[Agent Login] Error name:', ex?.name);
      console.error('[Agent Login] Error message:', ex?.message);
      console.error('[Agent Login] Error stack:', ex?.stack);

      const response = ex?.response;
      if (response) {
        console.error('[Agent Login] HTTP status:', response?.status);
        console.error('[Agent Login] Response data:', response?.data);
        console.error('[Agent Login] Response headers:', response?.headers);
      } else if (ex?.request) {
        console.error('[Agent Login] Request was sent but no response received (network/CORS/server down?). Request object:', ex?.request);
      } else {
        console.error('[Agent Login] No HTTP request — error thrown before request was made:', ex);
      }

      // Show the most specific message available
      const msg =
        response?.data?.error ||
        response?.data?.message ||
        ex?.message ||
        'Login failed';
      console.error('[Agent Login] Displayed to user:', msg);
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handle} className="w-full max-w-sm bg-dark-800 rounded-xl p-6 space-y-4">
        <h1 className="text-xl font-bold text-center">Coin Portal</h1>
        <h2 className="text-sm text-dark-400 text-center">Agent Platform</h2>
        {error && <div className="bg-red-600/20 text-red-400 text-sm p-3 rounded-lg break-words">{error}</div>}
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="w-full bg-dark-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          className="w-full bg-dark-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none"
        />
        <button type="submit" className="w-full py-2.5 bg-cyan-600 rounded-lg font-medium text-sm">
          Sign In
        </button>
      </form>
    </div>
  );
};
