import { useEffect, useState } from 'react';
import {
  PiCaretLeftBold as ArrowLeft,
  PiWarningCircleFill as AlertCircle,
  PiCheckCircleFill as CheckCircle,
  PiLinkBreakBold as Unlink,
  PiCheckBold as CheckIcon,
  PiShieldCheckFill as ShieldCheck,
  PiLightningFill as Lightning,
  PiUserFill as UserIcon,
  PiBankFill,
  PiWalletFill,
} from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import { paymentApi } from '../api/payment.api';
import { agencyApi } from '../api';
import { useAuthStore } from '../stores';
import { DiamondIcon, CoinIcon } from '../components/ui/CurrencyIcon';
import {
  BkashLogo,
  NagadLogo,
  RocketLogo,
  UsdtLogo,
} from '../components/payment/PaymentLogos';

interface PayoutMethodItem {
  key: string;
  label: string;
  subtitle: string;
  color: string;
  bgActive: string;
  logo: React.ReactNode;
}

const PAYOUT_METHODS: PayoutMethodItem[] = [
  {
    key: 'bkash',
    label: 'bKash',
    subtitle: 'Personal / Merchant',
    color: '#E2136E',
    bgActive: 'bg-pink-50',
    logo: <BkashLogo className="w-9 h-9 shadow-sm rounded-xl shrink-0" />,
  },
  {
    key: 'nagad',
    label: 'Nagad',
    subtitle: 'Mobile Banking',
    color: '#F7941D',
    bgActive: 'bg-orange-50',
    logo: <NagadLogo className="w-9 h-9 shadow-sm rounded-xl shrink-0" />,
  },
  {
    key: 'rocket',
    label: 'Rocket',
    subtitle: 'DBBL Account',
    color: '#8C3494',
    bgActive: 'bg-purple-50',
    logo: <RocketLogo className="w-9 h-9 shadow-sm rounded-xl shrink-0" />,
  },
  {
    key: 'usdt',
    label: 'USDT (TRC20)',
    subtitle: 'Crypto Wallet',
    color: '#26A17B',
    bgActive: 'bg-emerald-50',
    logo: <UsdtLogo className="w-9 h-9 shadow-sm rounded-xl shrink-0" />,
  },
];

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000];

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
      if (data?.success) setRates(data.data);
    });
    if (linked) {
      agencyApi.getMyAgency().then(({ data }: any) => {
        if (data?.success) setMyAgency(data.data);
      });
    }
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, linked]);

  const loadRequests = async () => {
    try {
      const { data } = await paymentApi.getWithdrawals({ status: tab });
      if (data?.success) setRequests(data.data || []);
    } catch {}
  };

  const rate = currency === 'diamond' ? (rates.withdrawalRate || rates.diamondRate || 1) : (rates.coinRate || 1);
  const parsedAmount = parseInt(amount) || 0;
  const bdtValue = Math.floor(parsedAmount / rate);
  const currentBalance = currency === 'diamond' ? (user?.diamonds || 0) : (user?.coins || 0);

  const handlePresetClick = (preset: number) => {
    setAmount(preset.toString());
  };

  const handleMaxClick = () => {
    if (currentBalance > 0) {
      setAmount(currentBalance.toString());
    }
  };

  const handleSubmit = async () => {
    if (!amount || parsedAmount <= 0) {
      setError('Please enter a valid withdrawal amount');
      return;
    }
    if (parsedAmount > currentBalance) {
      setError(`Insufficient ${currency} balance. You only have ${currentBalance.toLocaleString()} ${currency}s`);
      return;
    }
    if (!accountNumber) {
      setError('Please enter your recipient account number or wallet address');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await paymentApi.createWithdrawal({ currency, amount: parsedAmount, method, accountNumber });
      setSuccess(true);
      setAmount('');
      setAccountNumber('');
      loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Unlink from this agent? You will lose withdrawal access until you link another agent.')) return;
    try {
      await agencyApi.leave();
      updateUser({ agencyId: undefined, role: 'user' } as any);
      setMyAgency(null);
    } catch {}
  };

  const tabs = ['pending', 'approved', 'paid', 'rejected'] as const;

  // If user is not linked to any agency/agent
  if (!linked) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-16">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3.5 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Withdraw Earnings</h1>
            <p className="text-[11px] font-medium text-slate-500">Agent Network Cashout</p>
          </div>
        </header>

        <div className="max-w-md mx-auto p-6 pt-12 text-center space-y-5">
          <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-500 shadow-sm">
            <Unlink className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1.5">Link an Agent First</h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
              Withdrawals are processed exclusively through certified agency partners. Connect with an official agent to unlock direct payouts to bKash, Nagad, or Crypto.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => navigate('/settings')}
              className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.99]"
            >
              Go to Link Agent
            </button>
            <button
              onClick={() => navigate('/agencies')}
              className="w-full py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold text-sm transition-all"
            >
              Browse Certified Agencies
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16 font-sans">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Withdraw Earnings</h1>
            <p className="text-[11px] font-medium text-slate-500">Direct Agency Cashout</p>
          </div>
        </div>

        {/* Current User Balance Pills */}
        <div className="flex items-center gap-1.5">
          <div className="bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <DiamondIcon className="w-3.5 h-3.5 text-cyan-500" />
            <span className="text-xs font-bold text-cyan-900 tabular-nums">
              {user?.diamonds?.toLocaleString() || 0}
            </span>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <CoinIcon className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-amber-900 tabular-nums">
              {user?.coins?.toLocaleString() || 0}
            </span>
          </div>
        </div>
      </header>

      {/* ── Linked Agent Card ───────────────────────────────────────── */}
      <div className="max-w-lg mx-auto p-4 space-y-5">
        {myAgency && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                {typeof myAgency.agentId === 'object' ? myAgency.agentId?.nickname?.charAt(0)?.toUpperCase() : 'A'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">
                    {typeof myAgency.agentId === 'object' ? myAgency.agentId?.nickname : 'Linked Agent'}
                  </span>
                  <span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded-full uppercase">
                    Verified
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">{myAgency.name || 'Official Partner Agency'}</p>
              </div>
            </div>

            <button
              onClick={handleLeave}
              className="text-xs font-bold text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-2.5 py-1.5 rounded-xl transition-all"
            >
              Unlink
            </button>
          </div>
        )}

        {success ? (
          /* ── Success Feedback ────────────────────────────────────── */
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-500 shadow-sm animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Withdrawal Requested!</h2>
            <p className="text-slate-600 text-xs mb-5 leading-relaxed">
              Your cashout request has been submitted to your linked agent. They will verify and send the funds to your designated account.
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs shadow-md transition-all"
            >
              Submit Another Request
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* ── 1. Currency to Withdraw ──────────────────────────── */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                1. Select Asset to Cash Out
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* Coins (Standard for earnings) */}
                <button
                  type="button"
                  onClick={() => setCurrency('coin')}
                  className={`relative p-3.5 rounded-2xl border-2 transition-all flex flex-col text-left ${
                    currency === 'coin'
                      ? 'border-amber-500 bg-white shadow-md shadow-amber-500/10 ring-2 ring-amber-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                      <CoinIcon className="w-5 h-5 text-amber-500" />
                    </div>
                    {currency === 'coin' && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs shadow-sm">
                        <CheckIcon className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-slate-900 text-sm">Coins (Earnings)</span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Avail: {user?.coins?.toLocaleString() || 0}
                  </span>
                </button>

                {/* Diamonds */}
                <button
                  type="button"
                  onClick={() => setCurrency('diamond')}
                  className={`relative p-3.5 rounded-2xl border-2 transition-all flex flex-col text-left ${
                    currency === 'diamond'
                      ? 'border-cyan-500 bg-white shadow-md shadow-cyan-500/10 ring-2 ring-cyan-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center border border-cyan-100">
                      <DiamondIcon className="w-5 h-5 text-cyan-500" />
                    </div>
                    {currency === 'diamond' && (
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs shadow-sm">
                        <CheckIcon className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-slate-900 text-sm">Diamonds</span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Avail: {user?.diamonds?.toLocaleString() || 0}
                  </span>
                </button>
              </div>
            </div>

            {/* ── 2. Payout Methods ────────────────────────────────── */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                2. Select Payout Channel
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                {PAYOUT_METHODS.map((m) => {
                  const isSelected = method === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMethod(m.key)}
                      style={{ borderColor: isSelected ? m.color : undefined }}
                      className={`relative p-3 rounded-2xl border-2 transition-all flex items-center gap-2.5 text-left ${
                        isSelected
                          ? `${m.bgActive} shadow-sm ring-2 ring-slate-900/10`
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {m.logo}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{m.label}</p>
                        <p className="text-[10px] text-slate-500 font-medium truncate">{m.subtitle}</p>
                      </div>

                      {isSelected && (
                        <div
                          className="absolute top-2 right-2 w-4 h-4 rounded-full text-white flex items-center justify-center text-[10px] shadow-sm"
                          style={{ backgroundColor: m.color }}
                        >
                          <CheckIcon className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 3. Account Number / Recipient Info ────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {method === 'usdt' ? 'USDT (TRC20) Wallet Address' : `${method.toUpperCase()} Account Number`} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder={method === 'usdt' ? 'T...' : '01XXXXXXXXX'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  Ensure the number/address is accurate to avoid transfer delays.
                </p>
              </div>

              {/* ── 4. Amount to Cash Out ──────────────────────────── */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Amount ({currency.toUpperCase()}S) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleMaxClick}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    Cash Out All
                  </button>
                </div>

                <div className="relative mb-2.5">
                  <input
                    type="number"
                    min="1"
                    placeholder={`Enter amount of ${currency}s`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_AMOUNTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePresetClick(p)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                        amount === p.toString()
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {p.toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* Conversion calculation banner */}
                {parsedAmount > 0 && (
                  <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl text-white flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-[10px] text-slate-400">Estimated Payout in BDT</p>
                      <p className="text-lg font-black text-white tabular-nums">
                        ≈ ৳{bdtValue.toLocaleString()} BDT
                      </p>
                    </div>
                    <div className="text-right border-l border-slate-700 pl-3">
                      <p className="text-[10px] text-slate-400">Conversion Rate</p>
                      <p className="text-xs font-bold text-slate-200">{rate} {currency} = 1 BDT</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Error Banner ──────────────────────────────────────── */}
            {error && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3.5 rounded-xl shadow-sm">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* ── Submit Button ─────────────────────────────────────── */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !amount || parsedAmount <= 0 || !accountNumber}
              className="w-full py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-black hover:bg-black text-white rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-slate-900/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting Request...
                </span>
              ) : (
                <span>Request Withdrawal {bdtValue > 0 ? `(≈ ৳${bdtValue.toLocaleString()})` : ''}</span>
              )}
            </button>

            {/* ── Security Trust Badges ───────────────────────────── */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-[11px] font-bold text-slate-800">Agent Guaranteed Payout</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center gap-1.5">
                <Lightning className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-[11px] font-bold text-slate-800">Fast Verification</span>
              </div>
            </div>

            {/* ── Withdrawal Requests History Tabs ──────────────────── */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Withdrawal Status
                </label>
              </div>

              <div className="bg-slate-200/70 p-1 rounded-2xl flex gap-1 mb-3">
                {tabs.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                      tab === t
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {requests.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-1 shadow-sm">
                  <p className="text-xs font-bold text-slate-700">No {tab} withdrawals</p>
                  <p className="text-[11px] text-slate-400">
                    Requests in this state will be listed here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {requests.map((r: any) => {
                    const isPaid = r.status === 'paid';
                    const isApproved = r.status === 'approved';
                    const isPending = r.status === 'pending';
                    return (
                      <div
                        key={r._id}
                        className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-900 capitalize">
                              {r.method} • <span className="font-mono text-slate-600">{r.accountNumber}</span>
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(r.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isApproved
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : isPending
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                          <span className="font-medium text-slate-500">Cashed Out</span>
                          <span className="font-bold flex items-center gap-1 text-slate-900">
                            {r.currency === 'diamond' ? <DiamondIcon className="w-3.5 h-3.5 text-cyan-500" /> : <CoinIcon className="w-3.5 h-3.5 text-amber-500" />}
                            {r.amount?.toLocaleString()} {r.currency}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-500">BDT Received</span>
                          <span className="font-black text-slate-900 tabular-nums">
                            ৳{r.amountBdt?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
