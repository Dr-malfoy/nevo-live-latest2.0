// White metallic SVG ball — positioned by the ball animation motion values.
// It visibly rolls on its own axis as it orbits (self-rotation derived from
// the orbit angle), with a soft motion trail while in flight and a bounce
// when it settles into the pocket.
//
// Enhanced with:
// - Dynamic motion blur trail that scales with speed
// - Subtle pulsing glow while spinning
// - Smooth fade-in/fade-out transitions
// - Improved metallic shading

import React, { memo } from 'react';
import { motion, MotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { WHEEL_CENTER } from './Wheel';

interface BallProps {
  angle: MotionValue<number>;
  radius: MotionValue<number>;
  visible: boolean;
  settled: boolean;
}

const BALL_R = 7.5;

const BallInner = ({ angle, radius, visible, settled }: BallProps) => {
  // All hooks run unconditionally (Rules of Hooks)
  const cos = useTransform(angle, (a) => Math.cos(((a as number) - 90) * (Math.PI / 180)));
  const sin = useTransform(angle, (a) => Math.sin(((a as number) - 90) * (Math.PI / 180)));
  const x = useTransform([cos, radius] as MotionValue<number>[], ([c, r]) => WHEEL_CENTER + (r as number) * (c as number));
  const y = useTransform([sin, radius] as MotionValue<number>[], ([s, r]) => WHEEL_CENTER + (r as number) * (s as number));

  // Self-rotation: the ball rolls ~3.5x per orbit
  const roll = useTransform(angle, (a) => ((a as number) * 3.5) % 360);

  // Trail positions — offset behind the ball for a speed-dependent trail
  const trailAngle1 = useTransform(angle, (a) => (a as number) - 4);
  const trailAngle2 = useTransform(angle, (a) => (a as number) - 9);

  const trailCos1 = useTransform(trailAngle1, (a) => Math.cos(((a as number) - 90) * (Math.PI / 180)));
  const trailSin1 = useTransform(trailAngle1, (a) => Math.sin(((a as number) - 90) * (Math.PI / 180)));
  const trailX1 = useTransform([trailCos1, radius] as MotionValue<number>[], ([c, r]) => WHEEL_CENTER + (r as number) * (c as number));
  const trailY1 = useTransform([trailSin1, radius] as MotionValue<number>[], ([s, r]) => WHEEL_CENTER + (r as number) * (s as number));

  const trailCos2 = useTransform(trailAngle2, (a) => Math.cos(((a as number) - 90) * (Math.PI / 180)));
  const trailSin2 = useTransform(trailAngle2, (a) => Math.sin(((a as number) - 90) * (Math.PI / 180)));
  const trailX2 = useTransform([trailCos2, radius] as MotionValue<number>[], ([c, r]) => WHEEL_CENTER + (r as number) * (c as number));
  const trailY2 = useTransform([trailSin2, radius] as MotionValue<number>[], ([s, r]) => WHEEL_CENTER + (r as number) * (s as number));

  return (
    <AnimatePresence>
      {visible && (
        <motion.svg
          viewBox="0 0 420 420"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <defs>
            {/* Enhanced metallic ball gradient with stronger 3D effect */}
            <radialGradient id="ball-grad" cx="32%" cy="28%" r="72%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#f0f0f4" />
              <stop offset="55%" stopColor="#c8c8d0" />
              <stop offset="80%" stopColor="#8a8a96" />
              <stop offset="100%" stopColor="#52525e" />
            </radialGradient>
            {/* Ball shadow — deeper for 3D depth */}
            <filter id="ball-shadow" x="-120%" y="-120%" width="340%" height="340%">
              <feDropShadow dx="0.5" dy="1.5" stdDeviation="2.5" floodColor="#000" floodOpacity="0.6" />
            </filter>
            {/* Glow effect while spinning */}
            <filter id="ball-glow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Motion trail dots — fade behind the ball, hidden when settled */}
          {!settled && (
            <>
              <motion.circle
                style={{ cx: trailX2, cy: trailY2 }}
                r={3}
                fill="rgba(255,255,255,0.08)"
              />
              <motion.circle
                style={{ cx: trailX1, cy: trailY1 }}
                r={4.5}
                fill="rgba(255,255,255,0.15)"
              />
            </>
          )}

          {/* Main ball group centered exactly at (x, y) */}
          <motion.g style={{ x, y }}>
            {/* Ambient glow under the ball — fades as it settles */}
            <motion.circle
              r={12}
              fill="rgba(255,255,255,0.10)"
              animate={{
                opacity: settled ? 0 : [0.08, 0.18, 0.08],
                scale: settled ? 0.5 : [1, 1.15, 1],
              }}
              transition={{
                duration: settled ? 0.5 : 1.2,
                ease: 'easeInOut',
                repeat: settled ? 0 : Infinity,
              }}
            />

            {/* Self-rotating ball body */}
            <motion.g
              style={{ rotate: roll, originX: 0, originY: 0 }}
            >
              {/* Settle bounce animation */}
              <motion.g
                animate={settled ? { scale: [1, 1.18, 0.95, 1.05, 1] } : {}}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                {/* Ball body */}
                <circle
                  r={BALL_R}
                  fill="url(#ball-grad)"
                  filter={settled ? 'url(#ball-shadow)' : 'url(#ball-glow)'}
                />
                {/* Primary highlight — gives the spherical "hot spot" */}
                <circle cx={-2.2} cy={-2.8} r={2.2} fill="rgba(255,255,255,0.92)" />
                {/* Secondary highlight — rolling marker */}
                <circle cx={2.8} cy={3.2} r={1.2} fill="rgba(255,255,255,0.30)" />
                {/* Subtle rim highlight for depth */}
                <circle r={BALL_R - 0.5} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} />
              </motion.g>
            </motion.g>
          </motion.g>
        </motion.svg>
      )}
    </AnimatePresence>
  );
};

export const Ball = memo(BallInner);
