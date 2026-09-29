import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PiDotsThreeVerticalBold as MoreVertical } from 'react-icons/pi';

interface MoreMenuProps {
  onReport: () => void;
}

export const MoreMenu = ({ onReport }: MoreMenuProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((s) => !s)}
        aria-label="More options"
        aria-expanded={open}
        className="glass-chip w-9 h-9 flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <MoreVertical className="w-5 h-5" />
      </motion.button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -6 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-11 z-40 glass-card w-40 p-1.5"
            >
              <button
                onClick={() => {
                  setOpen(false);
                  onReport();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-white/10 transition-colors"
              >
                🚩 Report
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
