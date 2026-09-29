// Easing presets for realistic spin/ball physics.

export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const EASE_OUT_CUBIC: [number, number, number, number] = [0.33, 1, 0.68, 1];
export const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

/** Elastic-stop curve for the final pocket settle (tiny bounce). */
export const EASE_ELASTIC: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

/** Simple cubic ease-out for manual keyframe math. */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Smoothstep between 0 and 1. */
export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Clamp helper. */
export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Deterministic pseudo-random (mulberry32) for particle/ball variety. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
