// Spin/ball physics: compute the wheel target rotation so the winning pocket
// lands under the top pointer, and generate ball keyframes that orbit
// opposite the wheel and decay inward.
//
// The ball animation is split into three phases to mimic a real roulette ball:
//  1. OUTER ORBIT — ball races around the outer track at high speed, barely
//     losing radius (the "rim" phase). ~55% of total time.
//  2. DROP TRANSITION — ball loses grip and spirals rapidly inward from the
//     rim to the inner pocket ring. ~25% of total time.
//  3. POCKET SETTLE — ball wobbles across a few pockets, losing energy via
//     small radial oscillations, and decelerates to a stop. ~20% of total time.

import { POCKET_ANGLE, POCKET_COUNT } from '../utils/wheel';

export const SPIN_TURNS = 5; // full rotations of the wheel before landing
export const BALL_TURNS = 7; // ball orbits counter to the wheel

/**
 * Deterministic pseudo-random landing screen angle (0-360 deg) for a round.
 * Synchronized across all clients using roundNumber and winningIndex.
 */
export function getFinalLandingAngle(winningIndex: number, roundNumber: number): number {
  const base = ((winningIndex * 137.508 + roundNumber * 83.17) % 360 + 360) % 360;
  return base;
}

/**
 * Wheel rotation (deg) that brings pocket `winningIndex` to `finalScreenAngle`.
 */
export function wheelTargetRotation(winningIndex: number, turns = SPIN_TURNS, finalScreenAngle = 0): number {
  const pocketCenter = winningIndex * POCKET_ANGLE + POCKET_ANGLE / 2;
  const desiredMod = ((finalScreenAngle - pocketCenter) % 360 + 360) % 360;
  return 360 * turns + desiredMod;
}

export interface BallKeyframe {
  rotation: number; // absolute wheel-relative rotation (deg) at time t
  radius: number; // distance from wheel center (px in viewBox units)
}

// ─── Phase boundaries ────────────────────────────────────────────────
const OUTER_PHASE = 0.55; // 0 → 0.55 : fast orbit on the rim
const DROP_PHASE = 0.80; // 0.55 → 0.80 : spiral drop
// 0.80 → 1.00 : pocket settle

/**
 * Smooth hermite interpolation (ease-in-out).
 */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Ball path with three-phase realism:
 *
 * Phase 1 — OUTER ORBIT (t ∈ [0, 0.55])
 *   High angular speed, gentle exponential radius decay from outerRadius
 *   to ~outerRadius-10. Ball appears to ride the rim at speed.
 *
 * Phase 2 — DROP (t ∈ [0.55, 0.80])
 *   Angular speed drops noticeably; radius decays sharply from the rim
 *   to the inner pocket ring (pocketRadius + small overshoot).
 *
 * Phase 3 — SETTLE (t ∈ [0.80, 1.0])
 *   Ball bounces across a few pockets, with damped sinusoidal radial
 *   oscillation, and angular velocity tapers to near-zero.
 */
export function generateBallKeyframes(
  totalMs: number,
  pocketRadius = 110,
  outerRadius = 158,
  steps = 120 // doubled for smoother interpolation
): BallKeyframe[] {
  const frames: BallKeyframe[] = [];
  const totalTurns = -BALL_TURNS * 360; // negative = counter-rotation

  // Radii for phase boundaries
  const rimMin = outerRadius - 10; // end of outer orbit
  const dropTarget = pocketRadius + 6; // overshoot just inside pockets

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    let radius: number;
    let rotation: number;

    if (t <= OUTER_PHASE) {
      // ── Phase 1: Outer orbit ──────────────────────────────────────
      const p = t / OUTER_PHASE; // 0→1 within this phase
      // Angular velocity: fast, gentle deceleration (ease-out cubic)
      const angularProgress = 1 - Math.pow(1 - p, 1.6);
      // 70% of total rotation happens in this phase
      rotation = totalTurns * 0.70 * angularProgress;
      // Radius: gently decays (barely noticeable — ball hugs the rim)
      radius = outerRadius - (outerRadius - rimMin) * (1 - Math.pow(1 - p, 2.5));

    } else if (t <= DROP_PHASE) {
      // ── Phase 2: Drop transition ──────────────────────────────────
      const p = (t - OUTER_PHASE) / (DROP_PHASE - OUTER_PHASE); // 0→1
      // Angular velocity: decelerating more sharply
      const angularProgress = 1 - Math.pow(1 - p, 2.2);
      // Picks up from where phase 1 ended: 70% → 93%
      rotation = totalTurns * (0.70 + 0.23 * angularProgress);
      // Radius: dramatic S-curve drop from rim to pocket ring
      const dropCurve = smoothstep(0, 1, p);
      radius = rimMin - (rimMin - dropTarget) * dropCurve;

    } else {
      // ── Phase 3: Pocket settle ────────────────────────────────────
      const p = (t - DROP_PHASE) / (1 - DROP_PHASE); // 0→1
      // Angular velocity: gentle ease-out to stop (last 7%)
      const angularProgress = 1 - Math.pow(1 - p, 3.0);
      rotation = totalTurns * (0.93 + 0.07 * angularProgress);
      // Radius: damped oscillation (bouncing across pockets)
      // Amplitude starts at ~8px and decays exponentially
      const bounceAmplitude = 8 * Math.exp(-4.5 * p);
      const bounceFrequency = 4.5; // ~4.5 oscillations during settle
      const bounce = bounceAmplitude * Math.sin(p * bounceFrequency * Math.PI * 2);
      // Ease from dropTarget to pocketRadius, with bounce overlay
      const settleEase = 1 - Math.pow(1 - p, 2);
      radius = dropTarget - (dropTarget - pocketRadius) * settleEase + bounce;
    }

    frames.push({ rotation, radius });
  }
  return frames;
}
