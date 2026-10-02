import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiCopyFill as Copy,
  PiCheckBold as Check,
  PiArrowsLeftRightFill as TransferIcon,
  PiCoinsFill as CoinIcon,
  PiArrowUpRightBold as ArrowUpRight,
  PiArrowDownLeftBold as ArrowDownLeft,
  PiClockFill as Clock,
  PiShieldCheckFill as ShieldCheck,
} from 'react-icons/pi';
import client from '../api/client';
import { Loading } from '../components/ui';
import { Avatar } from '../components/user';
import { CoinIcon as CurrencyCoinIcon, DiamondIcon } from '../components/ui/CurrencyIcon';
import type { Transaction } from '../types';

export const TransactionDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    client
      .get(`/transactions/${id}`)
      .then(({ data }) => {
        if (!cancelled && data.success && data.data) {
          setTx(data.data);
        } else if (!cancelled) {
          setError('Transaction details not found');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Failed to load transaction details');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const copyId = async () => {
    const textToCopy = tx?.txId || tx?._id || id || '';
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const getTxTypeLabel = (type: string = '') => {
    switch (type) {
      case 'transfer':
      case 'transfer_in':
        return 'Coin Transfer';
      case 'recharge':
      case 'agent_recharge':
        return 'Deposit / Top-Up';
      case 'withdraw':
      case 'coin_sale':
        return 'Withdrawal';
      case 'gift_send':
        return 'Gift Sent';
      case 'gift_receive':
        return 'Gift Received';
      case 'gift_cut':
        return 'Platform Gift Share';
      case 'commission':
        return 'Agency Commission';
      case 'daily_reward':
      case 'task_reward':
      case 'signin_reward':
      case 'activity_reward':
      case 'spin_reward':
        return 'Reward Claim';
      case 'game_win':
        return 'Game Win';
      case 'game_bet':
        return 'Game Entry / Bet';
      default:
        return type.replace(/_/g, ' ').toUpperCase();
    }
  };

  const isDeduction = ['gift_send', 'withdraw', 'coin_sale', 'game_bet'].includes(tx?.type || '');

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-soft flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="min-h-screen bg-surface-soft p-4">
        <header className="flex items-center gap-3 h-14 border-b border-line mb-6">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 text-ink">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-ink flex-1">Transaction Details</h1>
        </header>
        <div className="bg-white rounded-card p-6 text-center space-y-3 shadow-sm">
          <p className="text-sm text-role-host font-semibold">{error || 'Transaction not found'}</p>
          <button onClick={() => navigate(-1)} className="btn-secondary px-6 py-2">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const otherParty = (tx.targetId && typeof tx.targetId === 'object') ? tx.targetId : null;
  const userParty = (tx.userId && typeof tx.userId === 'object') ? tx.userId : null;
  const targetUser = otherParty || (tx.type === 'transfer' ? otherParty : userParty);

  return (
    <div className="min-h-screen bg-surface-soft pb-10">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-line">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1 text-ink">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-ink flex-1">Transaction Details</h1>
        </div>
      </header>

      {/* Main Hero Card */}
      <div className="m-3 bg-white rounded-2xl p-5 shadow-sm border border-line space-y-4">
        <div className="text-center pt-2">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-2">
            {tx.type === 'transfer' ? (
              <TransferIcon className="w-7 h-7" />
            ) : tx.currency === 'diamond' ? (
              <DiamondIcon className="w-7 h-7" />
            ) : (
              <CurrencyCoinIcon className="w-7 h-7 text-amber-500" />
            )}
          </div>

          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            {getTxTypeLabel(tx.type)}
          </p>

          <p className={`text-[32px] font-extrabold tabular-nums leading-tight mt-1 ${isDeduction ? 'text-role-host' : 'text-emerald-700'}`}>
            {isDeduction ? '-' : '+'}{tx.amount.toLocaleString()}
            <span className="text-xs font-bold text-ink-muted ml-1.5 uppercase">
              {tx.currency}s
            </span>
          </p>

          <div className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-bold capitalize bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{tx.status || 'Completed'}</span>
          </div>
        </div>

        {/* Transaction ID & Copy */}
        <div className="rounded-xl bg-surface-sunken p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-ink-muted font-medium">Transaction ID</p>
            <p className="text-sm font-mono font-bold text-ink tracking-wide mt-0.5">
              {tx.txId || tx._id}
            </p>
          </div>

          <button
            onClick={copyId}
            className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-line text-ink hover:bg-surface-soft active:scale-95 shadow-sm'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-600" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Sender / Receiver Card if Available */}
        {targetUser && (
          <div className="rounded-xl bg-amber-50/60 border border-amber-200/80 p-3.5 space-y-2">
            <p className="text-[11px] font-bold text-amber-900/80 uppercase">
              {tx.type === 'transfer' ? 'Recipient / Counterparty' : 'Participant'}
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(`/user/${targetUser._id || targetUser.uid}`)}
                className="shrink-0 rounded-full hover:opacity-80 transition-opacity"
              >
                <Avatar src={targetUser.avatar} nickname={targetUser.nickname || 'User'} size="md" />
              </button>

              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => navigate(`/user/${targetUser._id || targetUser.uid}`)}
                  className="font-bold text-sm text-ink hover:text-amber-800 truncate text-left block w-full transition-colors"
                >
                  {targetUser.nickname || 'User'}
                </button>

                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    type="button"
                    onClick={() => navigate(`/user/${targetUser._id || targetUser.uid}`)}
                    className="font-mono text-xs text-amber-800 font-semibold underline underline-offset-2 hover:text-amber-950"
                  >
                    UID: {targetUser.uid}
                  </button>

                  {targetUser.isAgent && (
                    <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                      AGENT
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Breakdown Rows */}
        <div className="divide-y divide-line text-xs">
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-ink-muted">Transaction Type</span>
            <span className="font-semibold text-ink">{getTxTypeLabel(tx.type)}</span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="text-ink-muted">Date & Time</span>
            <span className="font-semibold text-ink tabular-nums">
              {new Date(tx.createdAt).toLocaleString()}
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="text-ink-muted">Currency</span>
            <span className="font-semibold text-ink capitalize">{tx.currency}</span>
          </div>

          {tx.description && (
            <div className="py-2.5 space-y-1">
              <span className="text-ink-muted block">Description & Breakdown</span>
              <p className="text-ink-soft bg-surface-sunken p-2.5 rounded-lg text-xs leading-relaxed font-medium">
                {tx.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
