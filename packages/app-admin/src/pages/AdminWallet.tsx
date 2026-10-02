import { useEffect, useState, useRef } from 'react';
import { ArrowRight, UserCheck, ShieldCheck, Sparkles, Search, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { adminApi } from '../api';
import { DiamondIcon, CoinIcon } from '../components/CurrencyIcon';
import { getMediaUrl } from '../lib/media';

export const AdminWallet = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Transfer form state
  const [targetId, setTargetId] = useState('');
  const [currency, setCurrency] = useState<'diamond' | 'coin'>('diamond');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState<any>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const lookupTimeoutRef = useRef<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [w, a] = await Promise.all([adminApi.getWallet(), adminApi.getAgents()]);
      if (w.data.success) {
        setWallet(w.data.data?.wallet);
        setHistory(w.data.data?.history || []);
      }
      if (a.data.success) setAgents(a.data.data?.agents || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Real-time recipient lookup on targetId change
  useEffect(() => {
    const cleanId = targetId.trim();
    if (!cleanId) {
      setRecipient(null);
      setLookupError('');
      return;
    }

    if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);

    lookupTimeoutRef.current = setTimeout(async () => {
      setLookingUp(true);
      setLookupError('');
      try {
        const { data } = await adminApi.lookupUser(cleanId);
        if (data.success && data.data) {
          setRecipient(data.data);
          setLookupError('');
        } else {
          setRecipient(null);
          setLookupError('User / Agent not found');
        }
      } catch (e: any) {
        setRecipient(null);
        setLookupError(e.response?.data?.error || 'User / Agent not found');
      } finally {
        setLookingUp(false);
      }
    }, 400);

    return () => {
      if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);
    };
  }, [targetId]);

  const handleSelectAgent = (agent: any) => {
    if (!agent) {
      setTargetId('');
      setRecipient(null);
      return;
    }
    setTargetId(agent.uid || agent._id);
    setRecipient(agent);
    setLookupError('');
  };

  const handleAddAmount = (add: number) => {
    const current = parseInt(amount) || 0;
    setAmount(String(current + add));
  };

  const handleTransfer = async () => {
    const cleanId = targetId.trim();
    const numAmount = parseInt(amount, 10);

    if (!cleanId) {
      setErr('Please enter a User ID (UID), Agent ID, or select an Agent');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setErr('Please enter a valid positive amount');
      return;
    }

    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const res = await adminApi.transferCurrency({
        targetId: cleanId,
        currency,
        amount: numAmount,
      });

      const updatedRecipient = res.data.data?.recipient;
      setMsg(
        `Successfully sent ${numAmount.toLocaleString()} ${currency}s to ${
          updatedRecipient?.nickname || recipient?.nickname || cleanId
        } (UID: ${updatedRecipient?.uid || cleanId})!`
      );
      setAmount('');
      if (updatedRecipient) {
        setRecipient(updatedRecipient);
      }
      load();
    } catch (err: any) {
      setErr(err.response?.data?.error || 'Transfer failed. Please check the recipient ID.');
    } finally {
      setSaving(false);
    }
  };

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'agent':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'host':
        return 'bg-pink-500/20 text-pink-400 border-pink-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Platform Wallet & Unlimited Transfer
          </h2>
          <p className="text-sm text-dark-400 mt-1">
            Issue unlimited Diamonds and Coins directly to any User, Agent, or Host.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm text-dark-300 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Inventory & Admin Privilege Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 flex items-center gap-4">
          <div className="p-4 rounded-xl bg-cyan-500/10 text-cyan-400">
            <DiamondIcon className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {wallet?.diamonds?.toLocaleString() ?? '0'}
            </p>
            <p className="text-xs text-dark-400 uppercase tracking-wider font-medium">Platform Diamond Reserve</p>
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 flex items-center gap-4">
          <div className="p-4 rounded-xl bg-amber-500/10 text-yellow-400">
            <CoinIcon className="w-8 h-8 text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {wallet?.coins?.toLocaleString() ?? '0'}
            </p>
            <p className="text-xs text-dark-400 uppercase tracking-wider font-medium">Platform Coin Reserve</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary-900/40 to-dark-800 border border-primary-500/30 rounded-xl p-6 flex items-center gap-4">
          <div className="p-4 rounded-xl bg-primary-500/20 text-primary-400">
            <Sparkles className="w-8 h-8 text-primary-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-primary-300">Limitless Mode</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-dark-400 mt-0.5">
              Admin can issue limitless Diamonds & Coins to any User or Agent without balance limit.
            </p>
          </div>
        </div>
      </div>

      {/* Main Transfer Section */}
      <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-dark-700 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary-400" /> Send Diamonds / Coins (Limitless)
            </h3>
            <p className="text-xs text-dark-400 mt-0.5">
              Enter a User UID, Agent ID, or select from the registered agents below.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Recipient & Currency Selection */}
          <div className="lg:col-span-7 space-y-5">
            {/* Recipient Input */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-dark-300 mb-1.5 block">
                Recipient (User ID / UID / Agent ID / Phone) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="e.g. 168001 or Agent / User UID"
                  className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-mono"
                />
                <div className="absolute right-3 top-3.5 flex items-center gap-2 pointer-events-none text-dark-400">
                  {lookingUp ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-primary-400" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </div>
              </div>

              {/* Quick Select Agent Dropdown */}
              {agents.length > 0 && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-dark-400">Quick Agent Select:</span>
                  <select
                    onChange={(e) => {
                      const sel = agents.find((a) => a.uid === e.target.value || a._id === e.target.value);
                      if (sel) handleSelectAgent(sel);
                    }}
                    value=""
                    aria-label="Quick Agent Select"
                    className="bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg px-2.5 py-1 text-xs text-dark-200 focus:outline-none focus:border-primary-500"
                  >
                    <option value="">Choose an agent...</option>
                    {agents.map((a: any) => (
                      <option key={a._id} value={a.uid || a._id}>
                        {a.nickname} (UID: {a.uid})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Currency Selector */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-dark-300 mb-1.5 block">
                Select Currency *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCurrency('diamond')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                    currency === 'diamond'
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-500/10'
                      : 'bg-dark-900 border-dark-700 text-dark-400 hover:border-dark-600'
                  }`}
                >
                  <DiamondIcon className="w-5 h-5 text-cyan-400" />
                  <span>Diamond (💎)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrency('coin')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                    currency === 'coin'
                      ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300 shadow-lg shadow-yellow-500/10'
                      : 'bg-dark-900 border-dark-700 text-dark-400 hover:border-dark-600'
                  }`}
                >
                  <CoinIcon className="w-5 h-5 text-yellow-400" />
                  <span>Coin (🪙)</span>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-dark-300 mb-1.5 block">
                Amount to Send *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount (e.g. 50000)"
                className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-mono"
              />

              {/* Quick Amount Add Chips */}
              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-dark-400 mr-1">Quick Add:</span>
                {[1000, 10000, 50000, 100000, 500000, 1000000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleAddAmount(val)}
                    className="px-2.5 py-1 bg-dark-700 hover:bg-dark-600 active:bg-dark-500 text-dark-300 hover:text-white rounded-lg text-xs font-mono transition-colors"
                  >
                    +{val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}k`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Live Recipient Preview Card & Status */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 h-full flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-dark-400 mb-3 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-primary-400" /> Recipient Verification
                </p>

                {lookingUp ? (
                  <div className="py-8 text-center text-dark-400 text-sm flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary-400" />
                    <span>Searching for recipient...</span>
                  </div>
                ) : recipient ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3.5 pb-4 border-b border-dark-800">
                      {recipient.avatar ? (
                        <img
                          src={getMediaUrl(recipient.avatar)}
                          alt={recipient.nickname}
                          className="w-12 h-12 rounded-full object-cover border-2 border-primary-500/50 bg-dark-800"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary-600/30 border border-primary-500 flex items-center justify-center text-primary-300 font-bold text-lg">
                          {recipient.nickname?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-base">{recipient.nickname}</h4>
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${roleBadgeColor(
                              recipient.role || 'user'
                            )}`}
                          >
                            {recipient.role || 'user'}
                          </span>
                        </div>
                        <p className="text-xs text-dark-400 font-mono mt-0.5">UID: {recipient.uid}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-dark-800/80 rounded-lg p-3">
                      <div>
                        <p className="text-[11px] text-dark-400 uppercase">Current Diamonds</p>
                        <p className="text-sm font-bold text-cyan-400 mt-0.5 flex items-center gap-1">
                          <DiamondIcon className="w-3.5 h-3.5" />
                          {recipient.diamonds?.toLocaleString() ?? '0'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-dark-400 uppercase">Current Coins</p>
                        <p className="text-sm font-bold text-yellow-400 mt-0.5 flex items-center gap-1">
                          <CoinIcon className="w-3.5 h-3.5" />
                          {recipient.coins?.toLocaleString() ?? '0'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-green-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Ready to receive {amount ? parseInt(amount).toLocaleString() : '0'} {currency}s</span>
                    </div>
                  </div>
                ) : lookupError ? (
                  <div className="py-8 text-center text-red-400 text-sm flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                    <span>{lookupError}</span>
                  </div>
                ) : (
                  <div className="py-8 text-center text-dark-500 text-sm">
                    Enter a User UID or Agent ID above to view recipient details.
                  </div>
                )}
              </div>

              {/* Privilege banner */}
              <div className="mt-4 pt-3 border-t border-dark-800 text-[11px] text-dark-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                <span>Zero restrictions. Transactions are logged and notified instantly.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback alerts */}
        {err && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-300 text-sm p-4 rounded-xl flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{err}</span>
          </div>
        )}
        {msg && (
          <div className="bg-green-900/20 border border-green-500/50 text-green-300 text-sm p-4 rounded-xl flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* Submit Transfer Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleTransfer}
            disabled={saving || !targetId || !amount || parseInt(amount) <= 0}
            className="w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/20"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Transferring...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" /> Send {currency === 'diamond' ? 'Diamonds' : 'Coins'} Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Transfer History */}
      <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-dark-700 flex items-center justify-between">
          <h3 className="font-bold text-white text-base">Admin Transfer History</h3>
          <span className="text-xs text-dark-400">{history.length} transactions recorded</span>
        </div>

        {history.length === 0 ? (
          <p className="p-8 text-center text-sm text-dark-400">No transfers yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700 bg-dark-900/50">
                  <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Recipient</th>
                  <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Role</th>
                  <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Amount</th>
                  <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Currency</th>
                  <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/50">
                {history.map((t: any) => {
                  const userObj = typeof t.userId === 'object' ? t.userId : null;
                  const isDiamond = t.currency === 'diamond';
                  return (
                    <tr key={t._id} className="hover:bg-dark-700/30 transition-colors">
                      <td className="px-5 py-3.5 text-sm">
                        {userObj ? (
                          <div>
                            <p className="font-medium text-white">{userObj.nickname || 'Unknown'}</p>
                            <p className="text-xs text-dark-400 font-mono">UID: {userObj.uid || '—'}</p>
                          </div>
                        ) : (
                          <span className="text-dark-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm">
                        {userObj?.role ? (
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${roleBadgeColor(
                              userObj.role
                            )}`}
                          >
                            {userObj.role}
                          </span>
                        ) : (
                          <span className="text-dark-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold font-mono">
                        <span className={isDiamond ? 'text-cyan-400' : 'text-yellow-400'}>
                          +{t.amount?.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm">
                        <span className="inline-flex items-center gap-1 capitalize text-xs">
                          {isDiamond ? (
                            <>
                              <DiamondIcon className="w-3.5 h-3.5 text-cyan-400" /> Diamond
                            </>
                          ) : (
                            <>
                              <CoinIcon className="w-3.5 h-3.5 text-yellow-400" /> Coin
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-dark-400">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
