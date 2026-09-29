import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WHEEL_CENTER } from './Wheel';

interface WinEffectsProps {
  active: boolean;
}

const SPARK_COUNT = 24;
const SPARKS = Array.from({ length: SPARK_COUNT }, (_, i) => {
  const angle = (i * 360) / SPARK_COUNT + (i % 2 === 0 ? 5 : -5);
  const rad = (angle * Math.PI) / 180;
  const dist = 60 + (i % 4) * 20;
  return {
    id: i,
    dx: Math.cos(rad) * dist,
    dy: Math.sin(rad) * dist,
    size: 3 + (i % 3) * 2,
    color: ['#F5C451', '#FFD97A', '#FFF3C4', '#FFB84C', '#FFFFFF'][i % 5],
  };
});

const EffectsInner = ({ active }: WinEffectsProps) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <AnimatePresence>
        {active && (
          <div className="absolute inset-0">
            {SPARKS.map((s) => (
              <motion.span
                key={s.id}
                className="absolute rounded-full"
                style={{
                  left: WHEEL_CENTER,
                  top: WHEEL_CENTER,
                  width: s.size,
                  height: s.size,
                  backgroundColor: s.color,
                  boxShadow: `0 0 ${s.size * 2}px ${s.color}`,
                }}
                initial={{ opacity: 1, scale: 0.5, x: 0, y: 0 }}
                animate={{
                  opacity: [1, 0.8, 0],
                  scale: [0.5, 1.4, 0.2],
                  x: s.dx,
                  y: s.dy,
                }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const WinEffects = memo(EffectsInner);
