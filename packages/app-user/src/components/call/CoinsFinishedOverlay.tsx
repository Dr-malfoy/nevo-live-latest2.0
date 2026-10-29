import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiLightningFill as Lightning,
} from 'react-icons/pi';
import { DiamondIcon } from '../ui/CurrencyIcon';

interface CoinsFinishedOverlayProps {
  visible: boolean;
  onClose?: () => void;
}

/**
 * Full-screen overlay shown when the caller runs out of diamonds mid-call.
 * The call has already been ended by the server; this is purely informational.
 */
export const CoinsFinishedOverlay = ({ visible, onClose }: CoinsFinishedOverlayProps) => {
  const navigate = useNavigate();

  const handleRecharge = () => {
    onClose?.();
    navigate('/store');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xl px-8"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="flex flex-col items-center gap-5 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.6)] border border-cyan-300/40">
              <DiamondIcon className="w-10 h-10 text-white" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white mb-2">Diamonds Finished</h2>
              <p className="text-white/70 text-sm leading-relaxed max-w-xs">
                Your diamonds have run out. The call has ended automatically.
                Recharge diamonds to continue calling.
              </p>
            </div>

            <button
              onClick={handleRecharge}
              className="w-full max-w-xs h-12 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-95 transition-all"
            >
              <Lightning className="w-5 h-5 text-slate-950" />
              Recharge Diamonds
            </button>

            <button
              onClick={onClose}
              className="text-sm text-white/50 hover:text-white underline transition-colors"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
