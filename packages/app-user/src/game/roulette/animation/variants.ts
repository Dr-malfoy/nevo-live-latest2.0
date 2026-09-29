// Shared framer-motion variants for the roulette UI.

import type { Variants } from 'framer-motion';
import { EASE_OUT_EXPO, EASE_ELASTIC } from '../physics/easing';

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 22 },
  },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT_EXPO } },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

/** Chip flying from the picker to the board. */
export const chipFly: Variants = {
  hidden: { opacity: 0, scale: 0.4, y: -40 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 500, damping: 20, mass: 0.6 },
  },
};

/** Invalid action — shake the target. */
export const shake: Variants = {
  hidden: { x: 0 },
  visible: {
    x: [0, -6, 6, -4, 4, 0],
    transition: { duration: 0.4 },
  },
};

/** Winning pocket pulse. */
export const glowPulse: Variants = {
  hidden: { scale: 1, filter: 'brightness(1)' },
  visible: {
    scale: [1, 1.08, 1],
    filter: ['brightness(1)', 'brightness(1.6)', 'brightness(1)'],
    transition: { duration: 1.2, repeat: 2, ease: 'easeInOut' },
  },
};

/** Countdown circle pop when it hits the last 3 seconds. */
export const urgentPulse: Variants = {
  hidden: { scale: 1 },
  visible: {
    scale: [1, 1.12, 1],
    transition: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' },
  },
};

/** Winning chip jump. */
export const chipJump: Variants = {
  hidden: { y: 0 },
  visible: {
    y: [0, -10, 0],
    transition: { duration: 0.6, repeat: 2, ease: EASE_ELASTIC },
  },
};

/** Confetti burst. */
export const confetti: Variants = {
  hidden: { opacity: 1, scale: 1 },
  visible: {
    opacity: [1, 1, 0],
    scale: [0, 1.2, 1.4],
    transition: { duration: 1.1, ease: 'easeOut' },
  },
};
