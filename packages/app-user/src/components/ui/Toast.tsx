import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PiCheckCircleFill as CheckCircle, PiXCircleFill as XCircle, PiInfoFill as InfoCircle, PiGiftFill as GiftIcon } from 'react-icons/pi';
import { useUIStore } from '../../stores';

export const ToastContainer: React.FC = () => {
  const toast = useUIStore((s) => s.toast);
  const hideToast = useUIStore((s) => s.hideToast);

  if (!toast) return null;

  const isGift = toast.message.toLowerCase().includes('sent') && toast.message.toLowerCase().includes('x');

  const getStyle = () => {
    if (isGift) {
      return {
        bg: 'bg-gradient-to-r from-[#200B3B]/95 via-[#3D0C5A]/95 to-[#5C1D4A]/95 border-pink-500/40 shadow-[0_10px_35px_rgba(236,72,153,0.35)]',
        icon: <GiftIcon className="w-5 h-5 text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]" />,
      };
    }
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-[#0E1715]/95 border-emerald-500/40 shadow-[0_10px_35px_rgba(16,185,129,0.25)]',
          icon: <CheckCircle className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />,
        };
      case 'error':
        return {
          bg: 'bg-[#1C0D11]/95 border-rose-500/40 shadow-[0_10px_35px_rgba(244,63,94,0.25)]',
          icon: <XCircle className="w-5 h-5 text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.6)]" />,
        };
      default:
        return {
          bg: 'bg-[#0F1424]/95 border-cyan-500/40 shadow-[0_10px_35px_rgba(6,182,212,0.25)]',
          icon: <InfoCircle className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />,
        };
    }
  };

  const style = getStyle();

  return (
    <div className="fixed top-4 inset-x-0 z-[100] flex justify-center pointer-events-none px-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={toast.message}
          initial={{ opacity: 0, y: -24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={hideToast}
          className={`pointer-events-auto cursor-pointer flex items-center gap-3 px-4 py-2.5 rounded-full border backdrop-blur-xl ${style.bg} max-w-md`}
        >
          <div className="shrink-0">{style.icon}</div>
          <p className="text-xs sm:text-sm font-semibold text-white tracking-wide select-none drop-shadow-sm">
            {toast.message}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
