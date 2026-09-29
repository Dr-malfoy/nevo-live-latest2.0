import { useEffect, useState } from 'react';
import { PiCaretLeftBold as ArrowLeft, PiInfoFill as AlertCircle, PiCheckCircleFill as CheckCircle } from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import { paymentApi } from '../api/payment.api';
import { DiamondIcon, CoinIcon } from '../components/ui/CurrencyIcon';

import { useAuthStore } from '../stores';
import { canUseTradeFeatures } from '../services/verification';
import { VerificationGateModal } from '../components/ui';

export const Sell = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [rates, setRates] = useState<any>({ diamondRate: 1, coinRate: 1 });
  const [currency, setCurrency] = useState<'diamond' | 'coin'>('coin');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    paymentApi.getMethods().then(({ data }: any) => {
      if (data.success) setRates(data.data);
    });
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data } = await paymentApi.getSellRequests();
      if (data.success) setRequests(data.data);
    } catch {}
  };

  const rate = currency === 'diamond' ? rates.diamondRate : rates.coinRate;
  const bdtValue = Math.floor((parseInt(amount) || 0) / rate);

  const handleSubmit = async () => {
    if (!canUseTradeFeatures(user?.verification, user?.role)) {
      setShowGate(true);
      return;
    }

    if (!amount || parseInt(amount) <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setSubmitting(true); setError('');
    try {
      await paymentApi.createSellRequest({ currency, amount: parseInt(amount) });
      setSuccess(true);
      setAmount('');
      loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create sell request');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen pb-8">
      <div className="flex items-center gap-3 p-4 border-b border-line">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold">Sell</h1>
      </div>

      {success ? (
        <div className="p-4 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sell Request Submitted!</h2>
          <p className="text-ink-muted text-sm mb-6">Your agent will review and accept your request.</p>
          <button onClick={() => setSuccess(false)} className="px-6 py-2.5 bg-black text-white rounded-lg font-medium text-sm">Submit Another</button>
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* Currency selection */}
          <div>
            <h3 className="text-sm font-medium text-ink-muted mb-3">Sell</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setCurrency('diamond')} className={`p-4 rounded-xl border-2 text-center transition-colors ${currency === 'diamond' ? 'border-cyan-500 bg-cyan-600/10' : 'border-line-strong bg-surface-sunken'}`}>
                <p className="font-bold text-lg flex items-center justify-center gap-2"><DiamondIcon /> Diamonds</p>
              </button>
              <button onClick={() => setCurrency('coin')} className={`p-4 rounded-xl border-2 text-center transition-colors ${currency === 'coin' ? 'border-yellow-500 bg-yellow-600/10' : 'border-line-strong bg-surface-sunken'}`}>
                <p className="font-bold text-lg flex items-center justify-center gap-2"><CoinIcon /> Coins</p>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="bg-surface-sunken rounded-xl p-4 space-y-3">
            <input type="number" min="1" placeholder={`Enter amount of ${currency}s`} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-dark-700 rounded-lg px-4 py-3 text-lg font-bold focus:outline-none focus:ring-1 focus:ring-accent-500" />
            {bdtValue > 0 && <p className="text-sm text-ink-muted text-center">≈ ৳{bdtValue.toLocaleString()}</p>}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-600/20 border border-red-600/50 text-red-400 text-sm p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting || !amount} className="w-full py-3 bg-yellow-600 rounded-xl font-medium disabled:opacity-50">
            {submitting ? 'Submitting...' : `Sell ${currency}s`}
          </button>

          {/* Sell request history */}
          {requests.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-ink-muted mb-3">Sell History</h3>
              <div className="space-y-2">
                {requests.map((r: any) => (
                  <div key={r._id} className="flex items-center justify-between p-3 bg-surface-sunken rounded-lg">
                    <div>
                      <p className="text-sm">{r.amount?.toLocaleString()} {r.currency} → ৳{r.amountBdt?.toLocaleString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${r.status === 'accepted' ? 'bg-green-600' : r.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'}`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <VerificationGateModal
        isOpen={showGate}
        onClose={() => setShowGate(false)}
        type="nid"
        title="NID Verification Required"
        message="NID Verification is required to sell diamonds and coins. Please verify your Government ID to unlock sell and cash-out features."
      />
    </div>
  );
};
