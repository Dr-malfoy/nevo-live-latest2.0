// SVG countdown circle — progress stroke + urgent pulse in the last 3s.

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { useCountdown } from '../hooks/useCountdown';

interface BettingTimerProps {
  endsAt: number | null;
  active: boolean;
}

const R = 20;
const CIRC = 2 * Math.PI * R;

const TimerInner = ({ endsAt, active }: BettingTimerProps) => {
  const { remaining, seconds, progress, urgent } = useCountdown(endsAt, active);

  return (
    <div className="relative w-16 h-16" aria-label={`${seconds} seconds remaining`} role="timer">
      <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
        <circle cx="24" cy="24" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
        <motion.circle
          cx="24"
          cy="24"
          r={R}
          fill="none"
          stroke={urgent ? '#FF4747' : '#F5C451'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: CIRC }}
          animate={{ strokeDashoffset: CIRC * (1 - progress) }}
          transition={{ ease: 'linear', duration: 0.1 }}
        />
      </svg>
      <motion.span
        className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${urgent ? 'text-red-400' : 'text-yellow-300'}`}
        animate={urgent ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.6, repeat: urgent ? Infinity : 0 }}
      >
        {seconds}
      </motion.span>
    </div>
  );
};

export const BettingTimer = memo(TimerInner);
