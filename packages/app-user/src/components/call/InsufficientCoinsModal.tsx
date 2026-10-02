import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiXBold as X,
  PiCoinFill as CoinIcon,
  PiWarningCircleFill as Warning,
  PiLightningFill as Lightning,
} from 'react-icons/pi';

interface InsufficientCoinsModalProps {
  /** Show/hide the modal. */
  visible: boolean;
  /** Main reason string returned from the server. */
  reason?: string;
  /** Host's per-minute price (shown in the modal). */
  coinsPerMinute?: number;
  /** Current audience balance. */
  balance?: number;
  /** Minimum required balance to use the call feature. */
  minBalance?: number;
  onClose: () => void;
}

/**
 * Displayed when an audience member does not have enough coins to start or
 * continue a 1:1 host call.
 *
 * Shows:
 * - Reason string
 * - Current balance vs. required amount
 * - "Recharge" button → /recharge
 */
export const InsufficientCoinsModal = ({
  visible,
  reason,
  coinsPerMinute,
  balance,
  minBalance,
  onClose,
}: InsufficientCoinsModalProps) => {
  const navigate = useNavigate();

  const handleRecharge = () => {
    onClose();
    navigate('/recharge');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm px-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden pb-safe"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                  <Warning className="w-5 h-5 text-red-500" />
                </span>
                <h3 className="font-bold text-base text-ink">Insufficient Coins</h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-surface-sunken flex items-center justify-center text-ink-muted active:bg-line"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5 space-y-4">
              {reason && (
                <p className="text-sm text-ink-soft leading-relaxed">{reason}</p>
              )}

              <div className="rounded-2xl bg-surface-sunken p-4 space-y-3">
                {/* Current balance */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-muted">Your Balance</span>
                  <div className="flex items-center gap-1.5">
                    <CoinIcon className="w-4 h-4 text-coin" />
                    <span className="font-bold text-ink tabular-nums">
                      {(balance ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Required amounts */}
                {coinsPerMinute && coinsPerMinute > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-muted">Call Rate</span>
                    <span className="font-semibold text-ink tabular-nums text-sm">
                      {coinsPerMinute.toLocaleString()} / min
                    </span>
                  </div>
                )}

                {minBalance && minBalance > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-muted">Minimum Required</span>
                    <div className="flex items-center gap-1.5">
                      <CoinIcon className="w-4 h-4 text-coin" />
                      <span className="font-semibold text-rose-600 tabular-nums text-sm">
                        {minBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Recharge button */}
              <button
                onClick={handleRecharge}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-200 active:opacity-90 transition-opacity"
              >
                <Lightning className="w-5 h-5" />
                Recharge Coins
              </button>

              <button
                onClick={onClose}
                className="w-full h-10 rounded-2xl border border-line text-sm text-ink-soft font-medium active:bg-surface-sunken transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
