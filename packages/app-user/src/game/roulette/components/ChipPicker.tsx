// Chip denomination picker — chips fly to the board when selected.

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Chip } from './board/Chip';
import { CHIP_VALUES } from '../utils/payouts';

interface ChipPickerProps {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

const PickerInner = ({ value, onChange, disabled }: ChipPickerProps) => (
  <div className="flex justify-center gap-2 py-2">
    {CHIP_VALUES.map((v) => {
      const active = value === v;
      return (
        <motion.button
          key={v}
          type="button"
          aria-label={`Select ${v} chip`}
          aria-pressed={active}
          onClick={() => onChange(v)}
          disabled={disabled}
          className="relative focus:outline-none"
          whileHover={{ scale: 1.12, y: -3 }}
          whileTap={{ scale: 0.92 }}
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={{ scale: active ? 1.1 : 1, opacity: 1 }}
        >
          <Chip value={v} size={34} />
          {active && (
            <motion.span
              layoutId="chip-picker-ring"
              className="absolute inset-0 rounded-full border-2 border-yellow-300"
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
          )}
        </motion.button>
      );
    })}
  </div>
);

export const ChipPicker = memo(PickerInner);
