import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiQuestionFill as HelpCircle,
  PiUserCircleFill as UserRound,
  PiReceiptFill as ReceiptIcon,
  PiShieldCheckFill as ShieldCheck,
  PiCaretRightBold as ChevronRight,
} from 'react-icons/pi';
import {
  transferApi,
  calculateTransferBreakdown,
  validateTransferAmount,
} from '../api/transfer.api';
import { usersApi, agencyApi, type AgencyItem } from '../api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { Avatar } from '../components/user';
import { DiamondIcon, CoinIcon } from '../components/ui/CurrencyIcon';
import type { TransferQuote } from '../api/transfer.api';

/**
 * Transfer Diamonds to any User or Agent.
 */
export const TransferPoints = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const showToast = useUIStore((s) => s.showToast);

  const [receiverUid, setReceiverUid] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [quote, setQuote] = useState<TransferQuote['receiver'] | null>(null);
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'missing' | 'unavailable'>('idle');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myAgency, setMyAgency] = useState<AgencyItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    usersApi
      .getProfile()
      .then(({ data }) => {
        if (!cancelled && data.success && data.data) updateUser(data.data);
      })
      .catch(() => {});

    agencyApi
      .getMyAgency()
      .then((res) => {
        if (!cancelled && res.data?.success && res.data.data) {
          setMyAgency(res.data.data);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [updateUser]);

  const isOwner = useMemo(() => {
    if (!user) return false;
    if (user.role === 'agent' || (user as any).isAgent) return true;
    if (myAgency?.agent) {
      if (typeof myAgency.agent === 'object' && myAgency.agent !== null) {
        if (myAgency.agent._id === user._id || myAgency.agent.uid === user.uid) return true;
      } else if (typeof myAgency.agent === 'string' && myAgency.agent === user._id) {
        return true;
      }
    }
    return false;
  }, [user, myAgency]);

  const amount = parseInt(amountInput.replace(/\D/g, ''), 10) || 0;
  const breakdown = calculateTransferBreakdown(amount);
  const amountError = amountInput ? validateTransferAmount(amount) : 'Enter transfer amount';
  const available = user?.diamonds ?? 0;
  const coinBalance = user?.coins ?? 0;
  const insufficient = breakdown.transferAmount > available;

  // Look the receiver up as they type, so the nickname appears before confirming.
  useEffect(() => {
    const uid = receiverUid.trim();
    setQuote(null);
    if (uid.length < 4) {
      setLookupState('idle');
      return;
    }

    let cancelled = false;
    setLookupState('loading');
    const timer = setTimeout(async () => {
      try {
        const res = await optional(transferApi.getQuote(uid));
        if (cancelled) return;
        if (res === null) {
          setLookupState('unavailable');
          return;
        }
        if (res.success && res.data?.receiver) {
          setQuote(res.data.receiver);
          setLookupState('idle');
        } else {
          setLookupState('missing');
        }
      } catch {
        if (!cancelled) setLookupState('missing');
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [receiverUid]);

  const canSubmit =
    receiverUid.trim().length >= 4 &&
    amount > 0 &&
    !amountError &&
    !insufficient &&
    !submitting;

  const handleTransfer = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await optional(transferApi.transfer(receiverUid.trim(), breakdown.transferAmount, 'diamond'));
      if (res === null) {
        showToast('Transfers are not available yet', 'info');
        return;
      }
      if (res.success && res.data) {
        // Immediately update sender's diamond balance in state without requiring page reload
        if (typeof res.data.balance === 'number') {
          updateUser({ diamonds: res.data.balance });
        } else {
          updateUser({ diamonds: Math.max(0, available - breakdown.transferAmount) });
        }
        showToast(`Successfully transferred ${breakdown.transferAmount.toLocaleString()} diamonds`, 'success');
        navigate(-1);
      } else {
        showToast(res.error || 'Transfer failed', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Transfer failed', 'error');
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  };

  const handleOpenProfile = (idOrUid?: string) => {
    const target = idOrUid || quote?._id || quote?.uid || receiverUid.trim();
    if (target) {
      navigate(`/user/${target}`);
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft pb-8">
      <header className="sticky top-0 z-20 bg-white border-b border-line">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1 text-ink">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-ink flex-1 truncate">Transfer Diamonds</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/withdraw')}
              className="px-2.5 py-1 rounded-full text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
              title="Go to Coin Withdraw"
            >
              <CoinIcon className="w-3.5 h-3.5 text-amber-500" />
              <span>Withdraw</span>
            </button>
            <button onClick={() => navigate('/transfer/history')} className="text-sm font-semibold text-accent-500">
              Details
            </button>
          </div>
        </div>
      </header>

      {/* Available Diamonds Balance */}
      <div className="m-3 rounded-card p-4 bg-gradient-to-br from-[#EBF5FF] via-[#D8ECFD] to-[#C2E2FB] border border-sky-200/80 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-sky-950/80 uppercase tracking-wider">Available Diamonds</p>
          <DiamondIcon className="w-6 h-6 text-sky-600" />
        </div>
        <p className="text-[34px] leading-tight font-extrabold text-ink tabular-nums mt-1">
          {available.toLocaleString()}
        </p>

        <div className="flex items-stretch gap-4 mt-3 pt-3 border-t border-sky-900/10">
          <div className="flex-1">
            <p className="text-base font-bold text-ink tabular-nums">{available.toLocaleString()} Diamonds</p>
            <p className="text-[11px] text-ink-muted">Transferable Balance (No limit)</p>
          </div>
          <div className="w-px bg-sky-900/10" />
          <div className="flex-1">
            <p className="text-base font-bold text-ink tabular-nums">0</p>
            <p className="text-[11px] text-ink-muted flex items-center gap-1">
              Pending Settlement
              <span title="Diamonds under verification">
                <HelpCircle className="w-3 h-3 text-ink-muted" />
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Coin Withdraw Quick Shortcut Banner ── */}
      <div className="mx-3 mt-1 mb-1">
        <button
          type="button"
          onClick={() => navigate('/withdraw')}
          className="w-full bg-gradient-to-r from-amber-50 via-amber-100/60 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 border border-amber-300/80 rounded-2xl p-3 flex items-center justify-between shadow-2xs transition-all active:scale-[0.99] group text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              <CoinIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-bold text-amber-950">Coin Withdraw</p>
                <span className="text-[10px] font-semibold bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded-md">
                  bKash • Nagad • Rocket
                </span>
              </div>
              <p className="text-[11px] text-amber-900/80 truncate mt-0.5">
                Current Coins: <strong className="font-semibold tabular-nums text-amber-950">{coinBalance.toLocaleString()}</strong> • Cash out to wallet
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-amber-950 shrink-0 bg-white/90 border border-amber-300 px-2.5 py-1.5 rounded-xl group-hover:bg-white transition-colors shadow-2xs ml-2">
            <span>Withdraw</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-700" />
          </div>
        </button>
      </div>

      {/* Agency Member shortcut if available */}
      {myAgency?.agent && typeof myAgency.agent === 'object' && myAgency.agent.uid !== user?.uid && (
        <div className="mx-3 mt-1 p-3 rounded-2xl bg-indigo-50/90 border border-indigo-200/80 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar src={myAgency.agent.avatar} nickname={myAgency.agent.nickname} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-indigo-950 truncate">
                  My Agency Agent: {myAgency.agent.nickname}
                </p>
                <p className="text-[10px] text-indigo-700 font-mono">
                  Agency: {myAgency.name} • UID: {myAgency.agent.uid}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof myAgency.agent === 'object' && myAgency.agent.uid) {
                  setReceiverUid(myAgency.agent.uid);
                }
              }}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] shrink-0 shadow-2xs"
            >
              Quick Select
            </button>
          </div>
        </div>
      )}

      {/* Inputs */}
      <div className="mx-3 mt-3 bg-white rounded-card p-4 space-y-5 shadow-sm">
        <div>
          <label className="text-sm font-semibold text-ink flex items-center gap-1 mb-1.5 whitespace-nowrap">
            Recipient ID <span className="text-role-host font-bold text-sm leading-none">*</span>
          </label>
          <div className="relative">
            <input
              value={receiverUid}
              onChange={(e) => setReceiverUid(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder="Enter Recipient UID"
              className="w-full h-12 pl-4 pr-11 rounded-xl bg-surface-sunken text-ink placeholder:text-ink-faint
                border border-transparent focus:bg-white focus:border-sky-500 focus:outline-none transition-colors font-medium"
            />
            <button
              aria-label="Pick from friends"
              onClick={() => navigate(`/user/${user?._id}/friends`)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-sky-500 hover:text-sky-600"
            >
              <UserRound className="w-5 h-5" />
            </button>
          </div>

          {quote ? (
            <div className="mt-3 p-3 rounded-xl border border-sky-200/70 bg-sky-50/60 flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenProfile()}
                className="shrink-0 rounded-full hover:ring-2 hover:ring-sky-400 transition-all"
                title="View Profile"
              >
                <Avatar src={quote.avatar} nickname={quote.nickname} size="md" />
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleOpenProfile()}
                    className="text-sm font-bold text-ink hover:text-sky-700 truncate text-left transition-colors"
                  >
                    {quote.nickname}
                  </button>
                  {quote.isAgent ? (
                    <span className="text-[10px] font-bold text-role-agent bg-role-agent/10 px-1.5 py-0.5 rounded shrink-0">
                      AGENT
                    </span>
                  ) : (
                    <span className="text-[10px] text-ink-muted bg-surface-sunken px-1.5 py-0.5 rounded shrink-0">
                      USER
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => handleOpenProfile()}
                    className="font-mono text-sky-800 font-semibold underline underline-offset-2 hover:text-sky-950 transition-colors flex items-center gap-1"
                    title="Click to view receiver profile"
                  >
                    UID: {quote.uid}
                  </button>
                  
                  <span className="text-ink-muted flex items-center gap-1">
                    Balance: <strong className="text-ink font-semibold tabular-nums">{(quote.diamonds ?? 0).toLocaleString()}</strong> Diamonds
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-faint mt-1.5">
              {lookupState === 'loading' && 'Checking recipient…'}
              {lookupState === 'missing' && <span className="text-role-host">No user found with that ID</span>}
              {(lookupState === 'idle' || lookupState === 'unavailable') &&
                "Enter any user or agent UID to transfer diamonds"}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <span className="text-sm font-semibold text-ink">Transfer Amount</span>
              <span className="text-role-host font-bold text-sm leading-none">*</span>
              <span className="text-xs font-medium text-ink-muted">(Diamonds)</span>
            </div>

            {available > 0 && (
              <button
                type="button"
                onClick={() => setAmountInput(available.toString())}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap ml-auto"
              >
                <span>Transfer Max</span>
                <span className="tabular-nums font-medium text-[11px] text-sky-700 bg-sky-50 border border-sky-200/80 px-1.5 py-0.5 rounded-md">
                  ({available.toLocaleString()} Diamonds)
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center h-12 px-4 rounded-xl bg-surface-sunken border border-transparent focus-within:bg-white focus-within:border-sky-500 transition-colors">
            <input
              value={amountInput}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                setAmountInput(raw);
              }}
              inputMode="numeric"
              placeholder="Enter diamond amount (e.g. 1, 100, 10,000, 1,000,000)"
              className="flex-1 min-w-0 bg-transparent text-ink placeholder:text-ink-faint focus:outline-none tabular-nums font-bold text-lg"
            />
            <span className="text-sm text-sky-600 font-bold shrink-0 flex items-center gap-1">
              <DiamondIcon className="w-4 h-4 text-sky-500" />
              Diamonds
            </span>
          </div>

          {/* Quick Preset Diamonds Chips */}
          <div className="flex flex-wrap gap-2 mt-2.5">
            {[1, 100, 1000, 10000, 100000, 1000000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmountInput(preset.toString())}
                className={`py-1 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  amount === preset
                    ? 'border-sky-500 bg-sky-50 text-sky-900 shadow-sm'
                    : 'border-line bg-surface-sunken text-ink-muted hover:bg-surface-sunken/80 hover:text-ink'
                }`}
              >
                {preset.toLocaleString()} Diamonds
              </button>
            ))}
          </div>

          {/* Status Message */}
          <p className="text-xs mt-2 tabular-nums">
            {amountError ? (
              <span className="text-role-host">{amountError}</span>
            ) : insufficient ? (
              <span className="text-role-host">
                Not enough available diamonds (Required: {breakdown.transferAmount.toLocaleString()}, Available: {available.toLocaleString()})
              </span>
            ) : (
              <span className="text-emerald-700 font-semibold">
                = {breakdown.transferAmount.toLocaleString()} Diamonds
              </span>
            )}
          </p>
        </div>

        {/* ── Fee Breakdown Summary Card ── */}
        {amount > 0 && (
          <div className="rounded-xl bg-sky-50/70 border border-sky-200/80 p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-sky-950 font-bold pb-1 border-b border-sky-200/60">
              <ReceiptIcon className="w-4 h-4 text-sky-600" />
              <span>Transfer Calculation Breakdown</span>
            </div>
            
            <div className="flex items-center justify-between text-ink-soft">
              <span>Transfer Amount:</span>
              <span className="font-bold text-ink tabular-nums">{breakdown.transferAmount.toLocaleString()} Diamonds</span>
            </div>

            <div className="flex items-center justify-between text-emerald-700">
              <span>Transfer Fee:</span>
              <span className="font-bold tabular-nums">0 Diamonds (Free)</span>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-sky-200/60 text-emerald-800 font-extrabold text-sm">
              <span>Final Received Amount:</span>
              <span className="tabular-nums">{breakdown.finalAmount.toLocaleString()} Diamonds</span>
            </div>
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="mx-3 mt-3 bg-white rounded-card p-4 shadow-sm">
        <h2 className="font-bold text-ink mb-2">Transfer Information</h2>
        <ol className="text-sm text-ink-muted space-y-1.5 list-decimal list-inside">
          <li><strong>Universal Transfers:</strong> Send diamonds freely to any user or agent (User-to-User, User-to-Agent, Agent-to-User).</li>
          <li><strong>0% Fee (Free):</strong> No transfer charge is deducted. The recipient receives 100% of the sent diamonds (e.g. send 1,000 → receive 1,000).</li>
          <li><strong>Flexible Amount:</strong> Send any amount starting from 1 Diamond based on your available balance.</li>
        </ol>
      </div>

      {/* Submit */}
      <div className="px-3 mt-4">
        <button
          onClick={() => setConfirming(true)}
          disabled={!canSubmit}
          className={`w-full h-13 py-3.5 rounded-full font-bold text-white transition-all ${
            canSubmit
              ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-md shadow-sky-500/20 active:scale-[0.98]'
              : 'bg-sky-200 text-sky-800/40 cursor-not-allowed'
          }`}
        >
          Transfer Diamonds
        </button>
      </div>

      {/* Confirm popup */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submitting && setConfirming(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-5 animate-slide-up shadow-2xl space-y-4">
            <div className="text-center">
              <p className="text-lg font-extrabold text-ink">Confirm Diamond Transfer</p>
              <p className="text-xs text-ink-muted mt-0.5">Please review recipient and transfer details</p>
            </div>

            {/* Receiver Identity Card */}
            <div className="rounded-xl bg-sky-50/80 border border-sky-200/80 p-3.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenProfile()}
                className="shrink-0 rounded-full hover:opacity-80 transition-opacity"
                title="Click to view receiver profile"
              >
                <Avatar src={quote?.avatar} nickname={quote?.nickname || 'Recipient'} size="lg" />
              </button>

              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => handleOpenProfile()}
                  className="font-bold text-ink text-base hover:text-sky-800 truncate text-left block w-full transition-colors"
                >
                  {quote?.nickname || `ID ${receiverUid}`}
                </button>
                
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    type="button"
                    onClick={() => handleOpenProfile()}
                    className="font-mono text-xs font-semibold text-sky-800 underline underline-offset-2 hover:text-sky-950 transition-colors"
                  >
                    UID: {quote?.uid || receiverUid}
                  </button>
                  {quote?.isAgent ? (
                    <span className="text-[9px] font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded">
                      AGENT
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold bg-surface-sunken text-ink-muted px-1.5 py-0.2 rounded">
                      USER
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-ink-muted mt-1">
                  Current Balance: <span className="font-semibold text-ink tabular-nums">{(quote?.diamonds ?? 0).toLocaleString()}</span> Diamonds
                </p>
              </div>
            </div>

            {/* Financial Breakdown Table */}
            <div className="rounded-xl bg-surface-sunken p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Transfer Amount:</span>
                <span className="font-bold text-ink tabular-nums">{breakdown.transferAmount.toLocaleString()} Diamonds</span>
              </div>
              <div className="flex items-center justify-between text-emerald-700">
                <span>Transfer Fee:</span>
                <span className="font-bold tabular-nums">0 Diamonds (Free)</span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2 font-extrabold text-emerald-800 text-sm">
                <span>Final Received Amount:</span>
                <span className="tabular-nums">{breakdown.finalAmount.toLocaleString()} Diamonds</span>
              </div>
            </div>

            <p className="text-[11px] text-role-host text-center font-medium">
              Transfers are irreversible once confirmed.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                disabled={submitting}
                className="flex-1 h-11 btn-secondary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={submitting}
                className="flex-1 h-11 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing…</span>
                  </>
                ) : (
                  'Confirm Transfer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
