import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiQuestionFill as HelpCircle,
  PiUserCircleFill as UserRound,
  PiReceiptFill as ReceiptIcon,
  PiShieldCheckFill as ShieldCheck,
  PiBuildingsFill as Buildings,
  PiCrownFill as Crown,
  PiWarningCircleFill as WarningIcon,
} from 'react-icons/pi';
import {
  transferApi,
  TRANSFER_CHARGE_PERCENT,
  calculateTransferBreakdown,
  validateTransferAmount,
} from '../api/transfer.api';
import { usersApi, agencyApi, type AgencyItem } from '../api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { Avatar } from '../components/user';
import { CoinIcon } from '../components/ui/CurrencyIcon';
import type { TransferQuote } from '../api/transfer.api';

/**
 * Transfer Coins to an Agent or Agency for trading/cash-out.
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

  const isAgencyMember = Boolean(!isOwner && myAgency && myAgency.agent);

  const amount = parseInt(amountInput.replace(/\D/g, ''), 10) || 0;
  const breakdown = calculateTransferBreakdown(amount);
  const amountError = amountInput ? validateTransferAmount(amount) : 'Enter transfer amount';
  const available = user?.coins ?? 0;
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
    !submitting &&
    quote?.allowed !== false;

  const handleTransfer = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await optional(transferApi.transfer(receiverUid.trim(), breakdown.transferAmount));
      if (res === null) {
        showToast('Transfers are not available yet', 'info');
        return;
      }
      if (res.success && res.data) {
        // Immediately update sender's balance in state without requiring page reload
        if (typeof res.data.balance === 'number') {
          updateUser({ coins: res.data.balance });
        } else {
          updateUser({ coins: Math.max(0, available - breakdown.transferAmount) });
        }
        showToast(`Successfully transferred ${breakdown.transferAmount.toLocaleString()} coins`, 'success');
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
          <h1 className="text-base font-bold text-ink flex-1">Transfer Coins</h1>
          <button onClick={() => navigate('/transfer/history')} className="text-sm font-semibold text-accent-500">
            Details
          </button>
        </div>
      </header>

      {/* Balance */}
      <div className="m-3 rounded-card p-4 bg-gradient-to-br from-[#FFF5DC] to-[#FFE8A3] border border-amber-200/60 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-amber-900/80 uppercase tracking-wider">Available Coins</p>
          <CoinIcon className="w-6 h-6 text-amber-500" />
        </div>
        <p className="text-[34px] leading-tight font-extrabold text-ink tabular-nums mt-1">
          {available.toLocaleString()}
        </p>

        <div className="flex items-stretch gap-4 mt-3 pt-3 border-t border-amber-900/10">
          <div className="flex-1">
            <p className="text-base font-bold text-ink tabular-nums">{available.toLocaleString()} Coins</p>
            <p className="text-[11px] text-ink-muted">Transferable Balance (No limit)</p>
          </div>
          <div className="w-px bg-amber-900/10" />
          <div className="flex-1">
            <p className="text-base font-bold text-ink tabular-nums">0</p>
            <p className="text-[11px] text-ink-muted flex items-center gap-1">
              Pending Settlement
              <span title="Coins under verification">
                <HelpCircle className="w-3 h-3 text-ink-muted" />
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Agency Member / Agent Role Status Banner */}
      {isAgencyMember && myAgency?.agent && typeof myAgency.agent === 'object' && (
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
              Transfer to Agent
            </button>
          </div>
        </div>
      )}

      {isOwner && (
        <div className="mx-3 mt-1 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 flex items-center gap-2 text-xs font-bold text-amber-900 shadow-2xs">
          <Crown className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Agent Mode: You can transfer coins to any user or other certified agents.</span>
        </div>
      )}

      {/* Inputs */}
      <div className="mx-3 mt-3 bg-white rounded-card p-4 space-y-5 shadow-sm">
        <div>
          <label className="text-sm font-semibold text-ink flex items-center gap-1 mb-1.5">
            Agent / Receiver ID <span className="text-role-host">*</span>
          </label>
          <div className="relative">
            <input
              value={receiverUid}
              onChange={(e) => setReceiverUid(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder="Enter Receiver UID"
              className="w-full h-12 pl-4 pr-11 rounded-xl bg-surface-sunken text-ink placeholder:text-ink-faint
                border border-transparent focus:bg-white focus:border-amber-500 focus:outline-none transition-colors font-medium"
            />
            <button
              aria-label="Pick from friends"
              onClick={() => navigate(`/user/${user?._id}/friends`)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-amber-500 hover:text-amber-600"
            >
              <UserRound className="w-5 h-5" />
            </button>
          </div>

          {quote ? (
            <div className={`mt-3 p-3 rounded-xl border flex flex-col gap-2 ${quote.allowed === false ? 'bg-red-50/70 border-red-200' : 'bg-amber-50/60 border-amber-200/70'}`}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenProfile()}
                  className="shrink-0 rounded-full hover:ring-2 hover:ring-amber-400 transition-all"
                  title="View Profile"
                >
                  <Avatar src={quote.avatar} nickname={quote.nickname} size="md" />
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenProfile()}
                      className="text-sm font-bold text-ink hover:text-amber-700 truncate text-left transition-colors"
                    >
                      {quote.nickname}
                    </button>
                    {quote.isMyAgent && (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                        MY AGENT
                      </span>
                    )}
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
                      className="font-mono text-amber-800 font-semibold underline underline-offset-2 hover:text-amber-950 transition-colors flex items-center gap-1"
                      title="Click to view receiver profile"
                    >
                      UID: {quote.uid}
                    </button>
                    
                    <span className="text-ink-muted flex items-center gap-1">
                      Balance: <strong className="text-ink font-semibold tabular-nums">{(quote.coins ?? 0).toLocaleString()}</strong> Coins
                    </span>
                  </div>
                </div>
              </div>

              {quote.allowed === false && (
                <div className="p-2 rounded-lg bg-red-100/80 border border-red-300/80 flex items-center gap-2 text-xs font-bold text-red-900">
                  <WarningIcon className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{quote.restrictionMessage || 'You cannot transfer coins to this user.'}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-ink-faint mt-1.5">
              {lookupState === 'loading' && 'Checking recipient…'}
              {lookupState === 'missing' && <span className="text-role-host">No user found with that ID</span>}
              {(lookupState === 'idle' || lookupState === 'unavailable') &&
                "Please verify the recipient's nickname and ID before proceeding"}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-ink flex items-center gap-1">
              Transfer Amount <span className="text-role-host">*</span>
              <span className="text-xs font-normal text-ink-muted">(Coins)</span>
            </label>
            {available > 0 && (
              <button
                type="button"
                onClick={() => setAmountInput(available.toString())}
                className="text-xs font-bold text-amber-600 hover:text-amber-700"
              >
                Transfer Max ({available.toLocaleString()} Coins)
              </button>
            )}
          </div>

          <div className="flex items-center h-12 px-4 rounded-xl bg-surface-sunken border border-transparent focus-within:bg-white focus-within:border-amber-500 transition-colors">
            <input
              value={amountInput}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                setAmountInput(raw);
              }}
              inputMode="numeric"
              placeholder="Enter coin amount (e.g. 1, 100, 10,000, 1,000,000)"
              className="flex-1 min-w-0 bg-transparent text-ink placeholder:text-ink-faint focus:outline-none tabular-nums font-bold text-lg"
            />
            <span className="text-sm text-amber-600 font-bold shrink-0 flex items-center gap-1">
              Coins
            </span>
          </div>

          {/* Quick Preset Coins Chips */}
          <div className="flex flex-wrap gap-2 mt-2.5">
            {[1, 100, 1000, 10000, 100000, 1000000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmountInput(preset.toString())}
                className={`py-1 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  amount === preset
                    ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                    : 'border-line bg-surface-sunken text-ink-muted hover:bg-surface-sunken/80 hover:text-ink'
                }`}
              >
                {preset.toLocaleString()} Coins
              </button>
            ))}
          </div>

          {/* Status Message */}
          <p className="text-xs mt-2 tabular-nums">
            {amountError ? (
              <span className="text-role-host">{amountError}</span>
            ) : insufficient ? (
              <span className="text-role-host">
                Not enough available coins (Required: {breakdown.transferAmount.toLocaleString()}, Available: {available.toLocaleString()})
              </span>
            ) : (
              <span className="text-emerald-700 font-semibold">
                = {breakdown.transferAmount.toLocaleString()} Coins
              </span>
            )}
          </p>
        </div>

        {/* ── Fee Breakdown Summary Card ── */}
        {amount > 0 && (
          <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold pb-1 border-b border-amber-200/60">
              <ReceiptIcon className="w-4 h-4 text-amber-600" />
              <span>Transfer Calculation Breakdown</span>
            </div>
            
            <div className="flex items-center justify-between text-ink-soft">
              <span>Transfer Amount:</span>
              <span className="font-bold text-ink tabular-nums">{breakdown.transferAmount.toLocaleString()} Coins</span>
            </div>

            <div className="flex items-center justify-between text-role-host">
              <span>Transfer Charge ({TRANSFER_CHARGE_PERCENT}%):</span>
              <span className="font-bold tabular-nums">-{breakdown.charge.toLocaleString()} Coins</span>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-amber-200/60 text-emerald-800 font-extrabold text-sm">
              <span>Final Received Amount:</span>
              <span className="tabular-nums">{breakdown.finalAmount.toLocaleString()} Coins</span>
            </div>
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="mx-3 mt-3 bg-white rounded-card p-4 shadow-sm">
        <h2 className="font-bold text-ink mb-2">Transfer Information</h2>
        <ol className="text-sm text-ink-muted space-y-1.5 list-decimal list-inside">
          <li><strong>Flexible Amount:</strong> Transfer any amount from 1 Coin to 1,000,000+ Coins based on your available balance.</li>
          <li><strong>Direct Transfer:</strong> Send coins to any user or agent by their UID without role restrictions.</li>
          <li><strong>Transfer Charge:</strong> A {TRANSFER_CHARGE_PERCENT}% transfer charge applies to every transfer (recipient gets at least 1 Coin).</li>
        </ol>
      </div>

      {/* Submit */}
      <div className="px-3 mt-4">
        <button
          onClick={() => setConfirming(true)}
          disabled={!canSubmit}
          className={`w-full h-13 py-3.5 rounded-full font-bold text-amber-950 transition-all ${
            canSubmit
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 shadow-md shadow-amber-500/20 active:scale-[0.98]'
              : 'bg-amber-200/50 text-amber-800/40 cursor-not-allowed'
          }`}
        >
          Transfer Coins
        </button>
      </div>

      {/* Confirm popup */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submitting && setConfirming(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-5 animate-slide-up shadow-2xl space-y-4">
            <div className="text-center">
              <p className="text-lg font-extrabold text-ink">Confirm Coin Transfer</p>
              <p className="text-xs text-ink-muted mt-0.5">Please review recipient and transfer details</p>
            </div>

            {/* Receiver Identity Card */}
            <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-3.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenProfile()}
                className="shrink-0 rounded-full hover:opacity-80 transition-opacity"
                title="Click to view receiver profile"
              >
                <Avatar src={quote?.avatar} nickname={quote?.nickname || 'Agent'} size="lg" />
              </button>

              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => handleOpenProfile()}
                  className="font-bold text-ink text-base hover:text-amber-800 truncate text-left block w-full transition-colors"
                >
                  {quote?.nickname || `ID ${receiverUid}`}
                </button>
                
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    type="button"
                    onClick={() => handleOpenProfile()}
                    className="font-mono text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950 transition-colors"
                  >
                    UID: {quote?.uid || receiverUid}
                  </button>
                  {quote?.isAgent && (
                    <span className="text-[9px] font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded">
                      CERTIFIED AGENT
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-ink-muted mt-1">
                  Current Balance: <span className="font-semibold text-ink tabular-nums">{(quote?.coins ?? 0).toLocaleString()}</span> Coins
                </p>
              </div>
            </div>

            {/* Financial Breakdown Table */}
            <div className="rounded-xl bg-surface-sunken p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Gross Transfer Amount:</span>
                <span className="font-bold text-ink tabular-nums">{breakdown.transferAmount.toLocaleString()} Coins</span>
              </div>
              <div className="flex items-center justify-between text-role-host">
                <span>Transfer Charge ({TRANSFER_CHARGE_PERCENT}%):</span>
                <span className="font-bold tabular-nums">-{breakdown.charge.toLocaleString()} Coins</span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2 font-extrabold text-emerald-800 text-sm">
                <span>Final Received Amount:</span>
                <span className="tabular-nums">{breakdown.finalAmount.toLocaleString()} Coins</span>
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
                className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold rounded-xl disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-amber-950 border-t-transparent rounded-full animate-spin" />
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
