// Drives the wheel rotation motion value + pointer tick scheduling.
// The wheel launches fast, decelerates over ~90% of the spin, then lands
// with a tiny elastic wobble into the winning pocket — a much more natural
// roulette feel than a single monotonic ease-out.
//
// Upgraded to use requestAnimationFrame for perfectly smooth rotation that
// stays in sync with the ball animation.

import { useEffect, useRef, useState, useCallback } from 'react';
import { motionValue } from 'framer-motion';
import { wheelTargetRotation, SPIN_TURNS, getFinalLandingAngle } from '../physics/spin';
import { POCKET_COUNT, POCKET_ANGLE } from '../utils/wheel';
import { audioEngine } from '../audio/engine';

export interface SpinAnimationState {
  rotation: ReturnType<typeof motionValue<number>>;
  spinning: boolean;
}

/** Resting rotation (deg) for a pocket — used to idle at the last result. */
export function restingRotation(winningIndex: number | null): number {
  if (winningIndex === null) return 0;
  return wheelTargetRotation(winningIndex, SPIN_TURNS) % 360;
}

export function useSpinAnimation(
  spinning: boolean,
  winningIndex: number | null,
  roundNumber: number,
  sound: boolean,
  onSpinComplete?: () => void
): SpinAnimationState {
  const rotation = useRef(motionValue(0)).current;
  const [isSpinning, setIsSpinning] = useState(false);
  const lastRound = useRef<number>(-1);
  const completedRef = useRef(false);
  const rafRef = useRef<number>(0);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!spinning || winningIndex === null || lastRound.current === roundNumber) return;
    lastRound.current = roundNumber;
    completedRef.current = false;
    cleanup();
    setIsSpinning(true);

    const currentRot = rotation.get();
    const pocketCenter = winningIndex * POCKET_ANGLE + POCKET_ANGLE / 2;
    const finalScreenAngle = getFinalLandingAngle(winningIndex, roundNumber);

    // Target wheel rotation such that (pocketCenter + targetWheelRot) % 360 === finalScreenAngle
    const desiredWheelMod = ((finalScreenAngle - pocketCenter) % 360 + 360) % 360;
    const currentWheelMod = ((currentRot % 360) + 360) % 360;
    const deltaWheel = (desiredWheelMod - currentWheelMod + 360) % 360;
    const target = currentRot + SPIN_TURNS * 360 + deltaWheel;
    const totalDelta = target - currentRot;

    // ── Main deceleration phase ────────────────────────────────────────
    const DURATION_MS = 5200;

    // Pointer ticks — fire as pockets pass
    const tickMs = DURATION_MS / POCKET_COUNT;
    let tick = 0;
    tickIntervalRef.current = setInterval(() => {
      if (sound) audioEngine.tick();
      tick += 1;
      if (tick >= POCKET_COUNT) {
        if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      }
    }, tickMs);

    let startTime: number | null = null;

    const spinTick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const rawProgress = Math.min(elapsed / DURATION_MS, 1);

      // Smooth quintic + exponential friction curve
      const quintic = 1 - Math.pow(1 - rawProgress, 5);
      const exponential = 1 - Math.pow(2, -8 * rawProgress);
      const easedProgress = 0.4 * quintic + 0.6 * exponential;

      rotation.set(currentRot + totalDelta * easedProgress);

      if (rawProgress < 1) {
        rafRef.current = requestAnimationFrame(spinTick);
      } else {
        rotation.set(target);
        if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
        setIsSpinning(false);
        if (!completedRef.current) {
          completedRef.current = true;
          onSpinComplete?.();
        }
      }
    };

    rafRef.current = requestAnimationFrame(spinTick);

    return cleanup;
  }, [spinning, winningIndex, roundNumber, sound, rotation, onSpinComplete, cleanup]);

  return { rotation, spinning: isSpinning };
}

/** Small helper: motion value for the ball's own rotation (counter-spin). */
export function ballPhaseFromRotation(rotation: number): number {
  const deg = ((rotation % 360) + 360) % 360;
  return Math.floor(deg / POCKET_ANGLE) % POCKET_COUNT;
}
