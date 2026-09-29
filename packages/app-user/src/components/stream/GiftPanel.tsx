import { useState, useEffect } from 'react';
import { giftsApi } from '../../api';
import { useAuthStore } from '../../stores';
import { CoinIcon } from '../ui/CurrencyIcon';
import type { Gift } from '../../types';

interface GiftPanelProps {
  receiverId: string;
  onSend: (gift: Gift, quantity: number) => Promise<void> | void;
}

const QUANTITIES = [1, 5, 10, 99];
/** Gifts at or above this total cost require a confirmation tap. */
const CONFIRM_THRESHOLD = 500;

export const GiftPanel = ({ receiverId, onSend }: GiftPanelProps) => {
  const user = useAuthStore((s) => s.user);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [selected, setSelected] = useState<Gift | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    giftsApi.list().then(({ data }) => {
      if (data.success) setGifts(data.data || []);
    });
  }, []);

  const coins = user?.coins ?? 0;
  const totalCost = selected ? selected.priceDiamonds * quantity : 0;
  const canAfford = selected ? totalCost <= coins : false;
  const needsConfirm = totalCost >= CONFIRM_THRESHOLD;
  const canSend = !!receiverId && !!selected && canAfford && !sending;

  const handleSend = async () => {
    if (!selected || !canSend) return;
    // Confirmation gate for expensive gifts
    if (needsConfirm && !confirming) {
      setConfirming(true);
      setError('');
      return;
    }
    setSending(true);
    setError('');
    try {
      await onSend(selected, quantity);
      // Success — parent closes the modal; reset local confirm state
      setConfirming(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to send gift');
      setConfirming(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4">
      {/* Sender balance */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-sm text-ink-muted">Your balance</span>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-yellow-400">
          <CoinIcon className="w-4 h-4" />
          {coins.toLocaleString()} Coins
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {gifts.map((gift) => (
          <button
            key={gift._id}
            disabled={sending}
            onClick={() => {
              setSelected(gift);
              setError('');
              setConfirming(false);
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors disabled:opacity-50 ${
              selected?._id === gift._id ? 'bg-black text-white ring-2 ring-yellow-400' : 'bg-dark-700 hover:bg-dark-600'
            }`}
          >
            <span className="text-2xl">{gift.icon?.startsWith('http') ? <img src={gift.icon} alt={gift.name} className="w-8 h-8 object-contain" /> : gift.icon}</span>
            <span className="text-[10px] truncate w-full text-center">{gift.name}</span>
            <span className="text-[10px] text-yellow-400 inline-flex items-center gap-0.5"><CoinIcon className="w-3 h-3 text-yellow-400" />{gift.priceDiamonds}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {QUANTITIES.map((q) => (
              <button
                key={q}
                disabled={sending}
                onClick={() => {
                  setQuantity(q);
                  setConfirming(false);
                }}
                className={`px-3 py-1 rounded text-sm transition-colors disabled:opacity-50 ${
                  quantity === q ? 'bg-black text-white' : 'bg-dark-700'
                }`}
              >
                x{q}
              </button>
            ))}
          </div>
          <span className="text-sm text-yellow-400 font-bold inline-flex items-center gap-1"><CoinIcon className="w-4 h-4" /> {totalCost.toLocaleString()} Coins</span>
        </div>
      )}

      {!receiverId && (
        <p className="text-xs text-yellow-400 mb-2 text-center">Host unavailable — cannot send gifts right now</p>
      )}
      {selected && !canAfford && (
        <p className="text-xs text-red-400 mb-2 text-center">Insufficient coins — top up your wallet</p>
      )}
      {error && (
        <p className="text-xs text-red-400 mb-2 text-center">{error}</p>
      )}
      {confirming && (
        <p className="text-xs text-yellow-400 mb-2 text-center">This is a large gift. Tap again to confirm.</p>
      )}

      <button
        disabled={!canSend}
        onClick={handleSend}
        className="w-full py-2.5 bg-black text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {sending ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending...
          </>
        ) : confirming ? (
          <>Confirm send <span className="inline-flex items-center gap-1 text-yellow-400"><CoinIcon className="w-4 h-4" />{totalCost.toLocaleString()}</span></>
        ) : (
          <>Send Gift {selected ? <span className="inline-flex items-center gap-1 text-yellow-400"><CoinIcon className="w-4 h-4" />{totalCost.toLocaleString()}</span> : ''}</>
        )}
      </button>
    </div>
  );
};
