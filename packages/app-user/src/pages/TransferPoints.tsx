import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiQuestionFill as HelpCircle, PiUserCircleFill as UserRound } from 'react-icons/pi';
import { transferApi, TRANSFER_MIN_POINTS, validateTransferAmount } from '../api/transfer.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { Avatar } from '../components/user';
import { CoinIcon } from '../components/ui/CurrencyIcon';
import { VerificationGateModal } from '../components/ui';
import { canUseTradeFeatures } from '../services/verification';
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
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<TransferQuote['receiver'] | null>(null);
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'missing' | 'unavailable'>('idle');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('../api').then(({ usersApi }) => {
      usersApi.getProfile().then(({ data }) => {
        if (!cancelled && data.success && data.data) updateUser(data.data);
      }).catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [updateUser]);

  const coins = parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const amountError = amount ? validateTransferAmount(coins) : null;
  const available = user?.coins ?? 0;
  const insufficient = coins > available;

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
    receiverUid.trim().length >= 4 && coins > 0 && !amountError && !insufficient && !submitting;

  const handleTransfer = async () => {
    setSubmitting(true);
    try {
      const res = await optional(transferApi.transfer(receiverUid.trim(), coins));
      if (res === null) {
        showToast('Transfers are not available yet', 'info');
        return;
      }
      if (res.success) {
        showToast(`Transferred ${coins.toLocaleString()} coins`, 'success');
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
            <p className="text-base font-bold text-ink tabular-nums">{available.toLocaleString()}</p>
            <p className="text-[11px] text-ink-muted">Total Available</p>
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

      {/* Inputs */}
      <div className="mx-3 bg-white rounded-card p-4 space-y-5 shadow-sm">
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
                border border-transparent focus:bg-white focus:border-amber-500 focus:outline-none transition-colors"
            />
            <button
              aria-label="Pick from friends"
              onClick={() => navigate(`/user/${user?._id}/friends`)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-amber-500"
            >
              <UserRound className="w-5 h-5" />
            </button>
          </div>

          {quote ? (
            <div className="flex items-center gap-2 mt-2">
              <Avatar src={quote.avatar} nickname={quote.nickname} size="xs" />
              <span className="text-sm font-semibold text-ink truncate">{quote.nickname}</span>
              {quote.isAgent ? (
                <span className="text-[10px] font-bold text-role-agent bg-role-agent/10 px-1.5 py-0.5 rounded">
                  CERTIFIED AGENT
                </span>
              ) : (
                <span className="text-[11px] text-ink-muted">User ID Verified</span>
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
            </label>
            {available > 0 && (
              <button
                type="button"
                onClick={() => setAmount(available.toString())}
                className="text-xs font-bold text-amber-600 hover:text-amber-700"
              >
                Transfer Max
              </button>
            )}
          </div>

          <div className="flex items-center h-12 px-4 rounded-xl bg-surface-sunken border border-transparent focus-within:bg-white focus-within:border-amber-500 transition-colors">
            <input
              value={amount ? Number(amount.replace(/\D/g, '')).toLocaleString() : ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                setAmount(raw);
              }}
              inputMode="numeric"
              placeholder="Enter transfer amount"
              className="flex-1 min-w-0 bg-transparent text-ink placeholder:text-ink-faint focus:outline-none tabular-nums font-bold text-base"
            />
            <span className="text-sm text-amber-600 font-bold shrink-0 flex items-center gap-1">
              <CoinIcon className="w-4 h-4 text-amber-500" /> Coins
            </span>
          </div>

          {/* Quick Amount Chips */}
          <div className="flex flex-wrap gap-2 mt-2.5">
            {[500000, 1000000, 2000000, 5000000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset.toString())}
                className={`py-1 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
                  coins === preset
                    ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                    : 'border-line bg-surface-sunken text-ink-muted hover:bg-surface-sunken/80 hover:text-ink'
                }`}
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>

          <p className="text-xs mt-2 tabular-nums">
            {amountError ? (
              <span className="text-role-host">{amountError}</span>
            ) : insufficient ? (
              <span className="text-role-host">Not enough available coins (Balance: {available.toLocaleString()})</span>
            ) : coins > 0 ? (
              <span className="text-emerald-700 font-semibold">= {coins.toLocaleString()} Coins</span>
            ) : (
              <span className="text-ink-faint">Minimum transfer: {TRANSFER_MIN_POINTS.toLocaleString()} Coins</span>
            )}
          </p>
        </div>
      </div>

      {/* Rules */}
      <div className="mx-3 mt-3 bg-white rounded-card p-4 shadow-sm">
        <h2 className="font-bold text-ink mb-2">Agency Transfer Rules</h2>
        <ol className="text-sm text-ink-muted space-y-1.5 list-decimal list-inside">
          <li>Minimum transfer: {TRANSFER_MIN_POINTS.toLocaleString()} Coins.</li>
          <li>Users trade coins with certified agents for trading and local payouts. Transfers are irreversible once completed.</li>
        </ol>
      </div>

      {/* Submit */}
      <div className="px-3 mt-4">
        <button
          onClick={() => {
            if (!canUseTradeFeatures(user?.verification, user?.role)) {
              setShowGate(true);
              return;
            }
            setConfirming(true);
          }}
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirming(false)} />
          <div className="relative w-full max-w-xs bg-white rounded-sheet p-5 text-center animate-slide-up shadow-2xl">
            <p className="text-base font-bold text-ink mb-1">Confirm Coin Transfer</p>
            <p className="text-sm text-ink-muted">
              Transfer <span className="font-bold text-amber-600">{coins.toLocaleString()} Coins</span> to{' '}
              <span className="font-semibold text-ink">{quote?.nickname || `ID ${receiverUid}`}</span>?
            </p>
            <p className="text-xs text-role-host mt-2">This transaction cannot be undone.</p>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setConfirming(false)} className="flex-1 h-11 btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={submitting}
                className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold rounded-xl disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <VerificationGateModal
        isOpen={showGate}
        onClose={() => setShowGate(false)}
        type="nid"
        title="NID Verification Required"
        message="NID Verification is required to trade and transfer coins. Please verify your Government ID to unlock trading features."
      />
    </div>
  );
};
