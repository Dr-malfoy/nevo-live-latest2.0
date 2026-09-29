import { motion, AnimatePresence } from 'framer-motion';
import { PiCrownFill as Crown } from 'react-icons/pi';

export interface PKData {
  left: { nickname: string; avatar?: string; score: number };
  right: { nickname: string; avatar?: string; score: number };
  active: boolean;
}

interface PKPanelProps {
  data: PKData | null;
}

/**
 * Graceful shell: renders only when PK data is supplied. The current app has
 * no PK backend event, so LiveRoom passes `null` and this stays hidden.
 */
export const PKPanel = ({ data }: PKPanelProps) => {
  if (!data) return null;

  const total = data.left.score + data.right.score || 1;
  const leftPct = (data.left.score / total) * 100;
  const winner =
    data.left.score === data.right.score ? null : data.left.score > data.right.score ? 'left' : 'right';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        role="status"
        className="absolute bottom-40 left-1/2 -translate-x-1/2 z-20 w-[min(420px,90vw)] glass-card px-4 py-3"
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {winner === 'left' && <Crown className="w-4 h-4 text-yellow-300 shrink-0" />}
            <span className="text-sm font-bold truncate">{data.left.nickname}</span>
            <span className="text-lg font-extrabold tabular-nums text-purple-400">{data.left.score}</span>
          </div>
          <span className="text-xs font-black text-white/50 tracking-widest shrink-0">VS</span>
          <div className="flex items-center gap-2 min-w-0 justify-end">
            <span className="text-lg font-extrabold tabular-nums text-pink-400">{data.right.score}</span>
            <span className="text-sm font-bold truncate">{data.right.nickname}</span>
            {winner === 'right' && <Crown className="w-4 h-4 text-yellow-300 shrink-0" />}
          </div>
        </div>
        <div className="flex gap-1 h-2.5 rounded-full overflow-hidden bg-white/10">
          <motion.div
            animate={{ width: `${leftPct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="bg-gradient-to-r from-brand-primary to-purple-400 rounded-l-full"
          />
          <motion.div
            animate={{ width: `${100 - leftPct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="bg-gradient-to-r from-pink-400 to-brand-secondary rounded-r-full"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
