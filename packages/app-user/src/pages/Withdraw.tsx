import { useEffect, useState } from 'react';
import { PiCaretLeftBold as ArrowLeft, PiInfoFill as AlertCircle, PiCheckCircleFill as CheckCircle, PiLinkBreakBold as Unlink } from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import { paymentApi } from '../api/payment.api';
import { agencyApi } from '../api';
import { useAuthStore } from '../stores';
import { DiamondIcon, CoinIcon } from '../components/ui/CurrencyIcon';

export const Withdraw = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  const [rates, setRates] = useState<any>({ withdrawalRate: 1, diamondRate: 1, coinRate: 1 });
  const [currency, setCurrency] = useState<'diamond' | 'coin'>('coin');
  const [method, setMethod] = useState('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [myAgency, setMyAgency] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected' | 'paid'>('pending');

  const linked = !!user?.agencyId;

  useEffect(() => {
    paymentApi.getMethods().then(({ data }: any) => {
      if (data.success) setRates(data.data);
    });
    if (linked) {
      agencyApi.getMyAgency().then(({ data }: any) => {
        if (data.success) setMyAgency(data.data);
      });
    }
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, linked]);

  const loadRequests = async () => {
    try {
      const { data } = await paymentApi.getWithdrawals({ status: tab });
      if (data.success) setRequests(data.data);
    } catch {}
  };

  const rate = currency === 'diamond' ? (rates.withdrawalRate || rates.diamondRate) : rates.coinRate;
  const bdtValue = Math.floor((parseInt(amount) || 0) / rate);

  const handleSubmit = async () => {
    if (!amount || parseInt(amount) <= 0) { setError('Enter a valid amount'); return; }
    if (!accountNumber) { setError('Enter your account number / address'); return; }
    setSubmitting(true); setError('');
    try {
      await paymentApi.createWithdrawal({ currency, amount: parseInt(amount), method, accountNumber });
      setSuccess(true);
      setAmount(''); setAccountNumber('');
      loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create withdrawal request');
    } finally { setSubmitting(false); }
  };

  const handleLeave = async () => {
    if (!confirm('Unlink from this agent? You will lose withdrawal access until you link another agent.')) return;
    try {
      await agencyApi.leave();
      updateUser({ agencyId: undefined, role: 'user' } as any);
      setMyAgency(null);
    } catch {}
  };

  if (!linked) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center gap-3 p-4 border-b border-line">
          <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-lg font-bold">Withdraw</h1>
        </div>
        <div className="p-6 text-center space-y-4">
          <Unlink className="w-12 h-12 text-ink-faint mx-auto" />
          <h2 className="text-lg font-bold">Link an Agent First</h2>
          <p className="text-sm text-ink-muted">
            Withdrawals are only available through your linked agent.
            Go to Settings → Link Agent to connect with an agent using their Agent ID.
          </p>
          <button onClick={() => navigate('/settings')} className="px-6 py-2.5 bg-black text-white rounded-xl font-medium text-sm">
            Link Agent
          </button>
        </div>
      </div>
    );
  }

  const tabs = ['pending', 'approved', 'rejected', 'paid'] as const;
  const statusColors: any = { pending: 'bg-yellow-600', approved: 'bg-blue-600', rejected: 'bg-red-600', paid: 'bg-green-600' };

  return (
    <div className="min-h-screen pb-8">
      <div className="flex items-center gap-3 p-4 border-b border-line">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold">Withdraw</h1>
      </div>

      <div className="p-4">
        {/* Linked agent info */}
        {myAgency && (
          <div className="bg-surface-sunken rounded-xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-ink-muted">Linked Agent</p>
              <p className="font-medium">{typeof myAgency.agentId === 'object' ? myAgency.agentId?.nickname : ''}</p>
              <p className="text-xs text-ink-muted">{myAgency.name}</p>
            </div>
            <button onClick={handleLeave} className="text-xs px-3 py-1.5 bg-dark-700 rounded-lg text-ink-muted hover:text-ink">Unlink</button>
          </div>
        )}

        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Withdrawal Request Submitted!</h2>
            <p className="text-ink-muted text-sm mb-6">Your linked agent will review and pay you.</p>
            <button onClick={() => setSuccess(false)} className="px-6 py-2.5 bg-black text-white rounded-lg font-medium text-sm">Submit Another</button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Currency */}
            <div>
              <h3 className="text-sm font-medium text-ink-muted mb-3">Withdraw</h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setCurrency('diamond')} className={`p-4 rounded-xl border-2 text-center transition-colors ${currency === 'diamond' ? 'border-cyan-500 bg-cyan-600/10' : 'border-line-strong bg-surface-sunken'}`}>
                  <p className="font-bold text-lg flex items-center justify-center gap-2"><DiamondIcon /> Diamonds</p>
                  <p className="text-xs text-ink-muted">Balance: {user?.diamonds?.toLocaleString() || 0}</p>
                </button>
                <button onClick={() => setCurrency('coin')} className={`p-4 rounded-xl border-2 text-center transition-colors ${currency === 'coin' ? 'border-yellow-500 bg-yellow-600/10' : 'border-line-strong bg-surface-sunken'}`}>
                  <p className="font-bold text-lg flex items-center justify-center gap-2"><CoinIcon /> Coins</p>
                  <p className="text-xs text-ink-muted">Balance: {user?.coins?.toLocaleString() || 0}</p>
                </button>
              </div>
            </div>

            {/* Method */}
            <div>
              <h3 className="text-sm font-medium text-ink-muted mb-3">Payout Method</h3>
              <div className="grid grid-cols-2 gap-3">
                {['bkash', 'nagad', 'rocket'].map((m) => (
                  <button key={m} onClick={() => setMethod(m)} className={`p-3 rounded-xl border-2 text-center capitalize transition-colors ${method === m ? 'border-accent-500 bg-black/10' : 'border-line-strong bg-surface-sunken'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Account number */}
            <div>
              <h3 className="text-sm font-medium text-ink-muted mb-3">Account Number</h3>
              <input
                value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={method === 'bkash' ? '01XXXXXXXXX' : method === 'nagad' ? '01XXXXXXXXX' : '01XXXXXXXXX'}
                className="w-full bg-surface-sunken rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
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
              {submitting ? 'Submitting...' : `Request Withdrawal`}
            </button>

            {/* History */}
            {requests.length > 0 && (
              <div>
                <div className="flex gap-1 mb-3">
                  {tabs.map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={`px-2 py-1 rounded-md text-xs capitalize ${tab === t ? 'bg-black text-white' : 'bg-surface-sunken text-ink-muted'}`}>{t}</button>
                  ))}
                </div>
                <div className="space-y-2">
                  {requests.map((r: any) => (
                    <div key={r._id} className="flex items-center justify-between p-3 bg-surface-sunken rounded-lg">
                      <div>
                        <p className="text-sm">{r.amount?.toLocaleString()} {r.currency} → ৳{r.amountBdt?.toLocaleString()}</p>
                        <p className="text-xs text-ink-muted">{r.method} · {new Date(r.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${statusColors[r.status]}`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
