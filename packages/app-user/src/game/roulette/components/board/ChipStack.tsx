// Stack of chips on a spot — staggered offsets + rotation, +N badge.

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Chip } from './Chip';

interface ChipStackProps {
  values: number[]; // one per chip on the spot (in placement order)
  max?: number;
}

const StackInner = ({ values, max = 5 }: ChipStackProps) => {
  if (values.length === 0) return null;
  const shown = values.slice(0, max);
  const extra = values.length - shown.length;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="relative">
        {shown.map((v, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: -10 - i * 2, top: -9 - i * 2, rotate: i % 2 === 0 ? -8 : 8 }}
            initial={{ opacity: 0, scale: 0.4, y: -24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          >
            <Chip value={v} size={26} />
          </motion.div>
        ))}
        {extra > 0 && (
          <span className="absolute w-5 h-5 rounded-full bg-black/75 border border-white/50 text-[9px] font-bold text-white flex items-center justify-center" style={{ left: -22, top: -20 }}>
            +{extra}
          </span>
        )}
      </div>
    </div>
  );
};

export const ChipStack = memo(StackInner);
