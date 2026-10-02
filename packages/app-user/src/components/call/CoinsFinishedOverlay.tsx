import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiCoinFill as CoinIcon,
  PiLightningFill as Lightning,
} from 'react-icons/pi';

interface CoinsFinishedOverlayProps {
  visible: boolean;
  onClose?: () => void;
}

/**
 * Full-screen overlay shown when the audience runs out of coins mid-call.
 * The call has already been ended by the server; this is purely informational.
 */
export const CoinsFinishedOverlay = ({ visible, onClose }: CoinsFinishedOverlayProps) => {
  const navigate = useNavigate();

  const handleRecharge = () => {
    onClose?.();
    navigate('/recharge');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md px-8"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="flex flex-col items-center gap-5 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl">
              <CoinIcon className="w-10 h-10 text-white" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Coins Finished</h2>
              <p className="text-white/70 text-sm leading-relaxed max-w-xs">
                Your coins have run out. The call has ended automatically.
                Recharge to continue calling.
              </p>
            </div>

            <button
              onClick={handleRecharge}
              className="w-full max-w-xs h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg active:opacity-90 transition-opacity"
            >
              <Lightning className="w-5 h-5" />
              Recharge Coins
            </button>

            <button
              onClick={onClose}
              className="text-sm text-white/50 underline"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
