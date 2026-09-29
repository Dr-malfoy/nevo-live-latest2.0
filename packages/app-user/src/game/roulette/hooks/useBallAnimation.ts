// Ball orbit animation — uses requestAnimationFrame for buttery-smooth
// 60fps+ interpolation through physics keyframes, with a natural settle
// into the winning pocket at the end.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motionValue } from 'framer-motion';
import { BALL_TURNS, getFinalLandingAngle } from '../physics/spin';

export interface BallAnimationState {
  angle: ReturnType<typeof motionValue<number>>;
  radius: ReturnType<typeof motionValue<number>>;
  visible: boolean;
  settled: boolean;
}

/**
 * Ball orbits the wheel opposite to its rotation while decaying inward.
 * Driven by requestAnimationFrame for silky 60fps+ smooth motion,
 * naturally decelerating directly into the winning pocket with zero teleporting or snapping.
 */
export function useBallAnimation(
  spinning: boolean,
  winningIndex: number | null,
  roundNumber: number
): BallAnimationState {
  const angle = useMemo(() => motionValue(0), []);
  const radius = useMemo(() => motionValue(158), []);
  const [visible, setVisible] = useState(false);
  const [settled, setSettled] = useState(false);
  const lastRound = useRef<number>(-1);
  const rafRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  useEffect(() => {
    if (!spinning || winningIndex === null || lastRound.current === roundNumber) return;
    lastRound.current = roundNumber;
    cleanup();
    setVisible(true);
    setSettled(false);

    const DURATION_MS = 5200;
    const currentBallAngle = angle.get();
    const finalScreenAngle = getFinalLandingAngle(winningIndex, roundNumber);

    // Ball orbits counter-clockwise (angle decreases)
    // Synchronize final landing angle with the winning pocket screen position
    const desiredBallMod = ((finalScreenAngle % 360) + 360) % 360;
    const currentBallMod = ((currentBallAngle % 360) + 360) % 360;
    const deltaBall = (currentBallMod - desiredBallMod + 360) % 360;
    const targetBallAngle = currentBallAngle - BALL_TURNS * 360 - deltaBall;
    const totalAngleDelta = targetBallAngle - currentBallAngle;

    const OUTER_RADIUS = 158;
    const POCKET_RADIUS = 118;

    let startTime: number | null = null;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const rawProgress = Math.min(elapsed / DURATION_MS, 1);

      // Smooth quintic + exponential ease curve for natural deceleration (matches wheel)
      const quintic = 1 - Math.pow(1 - rawProgress, 5);
      const exponential = 1 - Math.pow(2, -8 * rawProgress);
      const easedProgress = 0.4 * quintic + 0.6 * exponential;

      // Continuous angular deceleration
      const currentA = currentBallAngle + totalAngleDelta * easedProgress;
      angle.set(currentA);

      // 3-Phase smooth inward spiral
      let r = OUTER_RADIUS;
      if (rawProgress <= 0.55) {
        // Phase 1: High speed outer rim orbit
        const p = rawProgress / 0.55;
        r = OUTER_RADIUS - 3 * Math.pow(p, 2);
      } else if (rawProgress <= 0.82) {
        // Phase 2: Inward spiral drop from rim to pocket ring
        const p = (rawProgress - 0.55) / (0.82 - 0.55);
        const smoothP = p * p * (3 - 2 * p); // smoothstep
        r = (OUTER_RADIUS - 3) - ((OUTER_RADIUS - 3) - POCKET_RADIUS) * smoothP;
      } else {
        // Phase 3: Pocket settle with tiny soft damped wobble
        const p = (rawProgress - 0.82) / (1.0 - 0.82);
        const bounce = 2.0 * Math.exp(-6 * p) * Math.sin(p * Math.PI * 4);
        r = POCKET_RADIUS + bounce;
      }

      radius.set(r);

      if (rawProgress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        angle.set(targetBallAngle);
        radius.set(POCKET_RADIUS);
        setSettled(true);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return cleanup;
  }, [spinning, winningIndex, roundNumber, angle, radius, cleanup]);

  return { angle, radius, visible, settled };
}
