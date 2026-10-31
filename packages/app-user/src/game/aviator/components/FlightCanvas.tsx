import React, { useEffect, useRef, useState } from 'react';
import type { AviatorState } from '../../../types/aviator';

interface ColorStop {
  mult: number;
  bgCenter: [number, number, number];
  bgEdge: [number, number, number];
  ambientGlow: [number, number, number];
  rayColor: [number, number, number];
  curveStroke: [number, number, number];
  fillTop: [number, number, number];
  fillBottom: [number, number, number];
}

const COLOR_STOPS: ColorStop[] = [
  {
    mult: 1.0,
    bgCenter: [16, 12, 32],
    bgEdge: [5, 4, 12],
    ambientGlow: [80, 25, 140],
    rayColor: [48, 22, 85],
    curveStroke: [255, 30, 85],
    fillTop: [160, 10, 48],
    fillBottom: [48, 4, 18],
  },
  {
    mult: 2.0,
    bgCenter: [32, 10, 48],
    bgEdge: [10, 4, 18],
    ambientGlow: [130, 20, 160],
    rayColor: [78, 20, 105],
    curveStroke: [255, 20, 120],
    fillTop: [185, 14, 70],
    fillBottom: [60, 5, 25],
  },
  {
    mult: 4.0,
    bgCenter: [42, 8, 40],
    bgEdge: [14, 4, 16],
    ambientGlow: [170, 18, 120],
    rayColor: [105, 18, 85],
    curveStroke: [255, 0, 100],
    fillTop: [215, 16, 75],
    fillBottom: [75, 6, 28],
  },
  {
    mult: 7.0,
    bgCenter: [48, 10, 22],
    bgEdge: [16, 4, 8],
    ambientGlow: [200, 28, 60],
    rayColor: [125, 22, 48],
    curveStroke: [255, 50, 40],
    fillTop: [230, 28, 50],
    fillBottom: [90, 8, 20],
  },
  {
    mult: 12.0,
    bgCenter: [54, 18, 12],
    bgEdge: [20, 7, 5],
    ambientGlow: [230, 70, 25],
    rayColor: [145, 40, 24],
    curveStroke: [255, 100, 0],
    fillTop: [245, 70, 20],
    fillBottom: [105, 18, 10],
  },
  {
    mult: 20.0,
    bgCenter: [64, 30, 8],
    bgEdge: [24, 10, 3],
    ambientGlow: [255, 140, 18],
    rayColor: [170, 72, 20],
    curveStroke: [255, 180, 0],
    fillTop: [255, 125, 20],
    fillBottom: [120, 32, 8],
  },
];

function interpolateColor(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

function getSmoothTheme(mult: number): ColorStop {
  const m = Math.max(1, mult);
  if (m <= COLOR_STOPS[0].mult) return COLOR_STOPS[0];
  if (m >= COLOR_STOPS[COLOR_STOPS.length - 1].mult) return COLOR_STOPS[COLOR_STOPS.length - 1];

  let i = 0;
  while (i < COLOR_STOPS.length - 1 && COLOR_STOPS[i + 1].mult < m) {
    i++;
  }

  const s1 = COLOR_STOPS[i];
  const s2 = COLOR_STOPS[i + 1];
  const rawT = (m - s1.mult) / (s2.mult - s1.mult);
  const t = rawT * rawT * (3 - 2 * rawT);

  return {
    mult: m,
    bgCenter: interpolateColor(s1.bgCenter, s2.bgCenter, t),
    bgEdge: interpolateColor(s1.bgEdge, s2.bgEdge, t),
    ambientGlow: interpolateColor(s1.ambientGlow, s2.ambientGlow, t),
    rayColor: interpolateColor(s1.rayColor, s2.rayColor, t),
    curveStroke: interpolateColor(s1.curveStroke, s2.curveStroke, t),
    fillTop: interpolateColor(s1.fillTop, s2.fillTop, t),
    fillBottom: interpolateColor(s1.fillBottom, s2.fillBottom, t),
  };
}

interface WindStreak {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
}

/**
 * Renders the authentic Aviator Red Monoplane directly inside the Canvas:
 * - The tail of the plane is at (0, 0) in local coords, so it is 100% physically locked
 *   to the curve endpoint (x, y) with ZERO GAP at all times and angles!
 * - Wings on BOTH sides (Upper Far Wing & Lower Near Wing in 3D perspective)
 * - Front propeller facing FORWARD into the wind with 3D perspective rotation
 * - Bold "X" decal on fuselage flank
 */
function drawAviatorPlane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angleRad: number,
  phase: string,
  propAngle: number,
  opacity: number = 1,
  scale: number = 1
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y);
  ctx.rotate(angleRad);
  if (scale !== 1) {
    ctx.scale(scale, scale);
  }

  const isPlaying = phase === 'PLAYING';

  // ── 1. Upper Far Wing (on top side of plane) ──
  const farWingGrad = ctx.createLinearGradient(31, -18, 55, -4);
  farWingGrad.addColorStop(0, '#FF3366');
  farWingGrad.addColorStop(0.65, '#D90028');
  farWingGrad.addColorStop(1, '#8A0012');

  ctx.beginPath();
  ctx.moveTo(55, -4);
  ctx.lineTo(31, -18);
  ctx.lineTo(27, -16);
  ctx.lineTo(33, -8);
  ctx.lineTo(31, -7);
  ctx.lineTo(37, -2);
  ctx.closePath();
  ctx.fillStyle = farWingGrad;
  ctx.fill();
  ctx.strokeStyle = '#6E000A';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Upper wing rib notches
  ctx.beginPath();
  ctx.moveTo(30, -12);
  ctx.lineTo(34, -12);
  ctx.moveTo(32, -8);
  ctx.lineTo(36, -8);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // ── 2. Tail Section (starts right at connection anchor 0, 0) ──
  // Tail horizontal elevator - apex rear tip starts strictly at (0, 0)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(12, 0);
  ctx.lineTo(12, 3);
  ctx.lineTo(1, 3);
  ctx.closePath();
  ctx.fillStyle = '#990014';
  ctx.fill();
  ctx.strokeStyle = '#6E000A';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Tail vertical fin (rudder)
  ctx.beginPath();
  ctx.moveTo(11, 0);
  ctx.lineTo(5, -17);
  ctx.lineTo(8, -18);
  ctx.lineTo(17, -2);
  ctx.closePath();
  ctx.fillStyle = farWingGrad;
  ctx.fill();
  ctx.strokeStyle = '#6E000A';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Tail fin top highlight
  ctx.beginPath();
  ctx.moveTo(7, -17);
  ctx.lineTo(15, -4);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // ── 3. Main Fuselage Body ──
  const bodyGrad = ctx.createLinearGradient(11, -6, 87, 4);
  bodyGrad.addColorStop(0, '#C90025');
  bodyGrad.addColorStop(0.35, '#E6002E');
  bodyGrad.addColorStop(0.7, '#FF1744');
  bodyGrad.addColorStop(1, '#C90025');

  ctx.beginPath();
  ctx.moveTo(87, 0);
  ctx.bezierCurveTo(85, -3, 79, -4, 73, -4);
  ctx.lineTo(65, -4);
  ctx.bezierCurveTo(57, -11, 49, -11, 45, -4);
  ctx.lineTo(25, -2);
  ctx.bezierCurveTo(19, -2, 15, -1, 11, 0); // Tail root meets tail at (11, 0)!
  ctx.bezierCurveTo(15, 3, 27, 5, 39, 5);
  ctx.lineTo(77, 4);
  ctx.bezierCurveTo(83, 3, 87, 1, 87, 0);
  ctx.closePath();
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = '#ff6b8b';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Fuselage top highlight sheen
  ctx.beginPath();
  ctx.moveTo(19, -1);
  ctx.quadraticCurveTo(51, -4, 77, -3);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // ── 4. Cockpit Canopy ──
  ctx.beginPath();
  ctx.moveTo(65, -4);
  ctx.bezierCurveTo(61, -10, 51, -10, 47, -4);
  ctx.closePath();
  ctx.fillStyle = '#0B0B14';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // Windshield glint
  ctx.beginPath();
  ctx.moveTo(61, -6);
  ctx.quadraticCurveTo(55, -9, 51, -6);
  ctx.strokeStyle = '#70E000';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // ── 5. Signature "X" Emblem on Fuselage ──
  ctx.save();
  ctx.translate(67, 0);
  ctx.beginPath();
  ctx.moveTo(-5, -5);
  ctx.lineTo(5, 5);
  ctx.moveTo(5, -5);
  ctx.lineTo(-5, 5);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-5, -5);
  ctx.lineTo(5, 5);
  ctx.moveTo(5, -5);
  ctx.lineTo(-5, 5);
  ctx.strokeStyle = '#990010';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  // ── 6. Lower Near Wing (on viewer's side, sweeps down-left in 3D perspective) ──
  const nearWingGrad = ctx.createLinearGradient(59, 2, 35, 20);
  nearWingGrad.addColorStop(0, '#FF4D79');
  nearWingGrad.addColorStop(0.5, '#EF233C');
  nearWingGrad.addColorStop(1, '#990014');

  ctx.beginPath();
  ctx.moveTo(59, 2);
  ctx.lineTo(35, 18);
  ctx.bezierCurveTo(33, 20, 29, 18, 31, 15);
  ctx.lineTo(37, 9);
  ctx.lineTo(35, 8);
  ctx.lineTo(45, 3);
  ctx.closePath();
  ctx.fillStyle = nearWingGrad;
  ctx.fill();
  ctx.strokeStyle = '#6E000A';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Near wing rib notch & highlight line
  ctx.beginPath();
  ctx.moveTo(38, 13);
  ctx.lineTo(42, 13);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(57, 3);
  ctx.lineTo(35, 16);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // ── 7. Front Nose Cone Spinner ──
  ctx.beginPath();
  ctx.moveTo(85, -3);
  ctx.quadraticCurveTo(89, 0, 90, 0);
  ctx.quadraticCurveTo(89, 0, 85, 3);
  ctx.closePath();
  ctx.fillStyle = '#B30710';
  ctx.fill();
  ctx.strokeStyle = '#6E000A';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // ── 8. Forward-Facing 3D Propeller System ──
  const noseX = 90;
  const noseY = 0;

  // Propeller motion blur disc when playing
  if (isPlaying) {
    ctx.beginPath();
    ctx.ellipse(noseX, noseY, 5.5, 20, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 23, 68, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 3D Forward-Facing Rotating Propeller Blades (Facing forward into the wind!)
  ctx.save();
  ctx.translate(noseX, noseY);
  ctx.scale(0.32, 1.0); // 3D Perspective compression
  ctx.rotate(propAngle);

  // Top Blade
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-3, -5, -4, -11, 0, -18);
  ctx.bezierCurveTo(2, -20, 4, -19, 4, -16);
  ctx.bezierCurveTo(3, -11, 2, -5, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#D90429';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // Bottom Blade
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(3, 5, 4, 11, 0, 18);
  ctx.bezierCurveTo(-2, 20, -4, 19, -4, 16);
  ctx.bezierCurveTo(-3, 11, -2, 5, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#D90429';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // Center spinner axle
  ctx.beginPath();
  ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = '#D90429';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.restore();

  ctx.restore();
}

export const FlightCanvas: React.FC<{ state: AviatorState | null }> = ({ state }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const multiplierTextRef = useRef<HTMLDivElement | null>(null);

  const animMultRef = useRef(1.0);
  const displayMultRef = useRef(1.0);
  const smoothAngleRef = useRef(0);
  const rayAngleRef = useRef(0);
  const propAngleRef = useRef(0);
  const flightStartTimeRef = useRef(Date.now());
  const crashAnimationOffsetRef = useRef({ x: 0, y: 0, opacity: 1 });
  const isFirstStateRef = useRef(true);

  // Camera Zoom towards plane (60% zoom in = 1.6x)
  const cameraZoomRef = useRef(1.0);
  const smoothProgressRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const camFocusXRef = useRef<number | null>(null);
  const camFocusYRef = useRef<number | null>(null);
  const curScreenXRef = useRef<number | null>(null);
  const curScreenYRef = useRef<number | null>(null);

  const [countdown, setCountdown] = useState(0);

  // Sync state immediately upon receiving real server state (prevents fake sessions)
  useEffect(() => {
    if (!state) return;
    if (isFirstStateRef.current) {
      isFirstStateRef.current = false;
      if (state.phase === 'PLAYING') {
        // Immediate sync to live in-progress flight
        displayMultRef.current = state.multiplier;
        animMultRef.current = state.multiplier;
        cameraZoomRef.current = 1.60;
        flightStartTimeRef.current = state.endsAt || Date.now();
      } else if (state.phase === 'BET') {
        displayMultRef.current = 1.0;
        animMultRef.current = 1.0;
        cameraZoomRef.current = 1.0;
      } else if (state.phase === 'CRASHED') {
        displayMultRef.current = state.crashPoint ?? state.multiplier;
        animMultRef.current = state.crashPoint ?? state.multiplier;
        cameraZoomRef.current = 1.60;
      }
    }
  }, [state]);

  const phase = state?.phase ?? 'BET';
  const multiplier = state?.multiplier ?? 1.0;

  useEffect(() => {
    if (state?.phase === 'PLAYING') {
      flightStartTimeRef.current = state.endsAt || Date.now();
      crashAnimationOffsetRef.current = { x: 0, y: 0, opacity: 1 };
    } else if (state?.phase === 'BET') {
      crashAnimationOffsetRef.current = { x: 0, y: 0, opacity: 1 };
    }
  }, [state?.phase, state?.roundNumber]);

  useEffect(() => {
    if (phase !== 'BET' || !state?.endsAt) {
      setCountdown(0);
      return;
    }
    const update = () => setCountdown(Math.max(0, (state.endsAt - Date.now()) / 1000));
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [phase, state?.endsAt]);

  const windStreaksRef = useRef<WindStreak[]>(
    Array.from({ length: 18 }, () => ({
      x: Math.random() * 600,
      y: 20 + Math.random() * 260,
      length: 25 + Math.random() * 45,
      speed: 3 + Math.random() * 4,
      opacity: 0.15 + Math.random() * 0.25,
    }))
  );

  // 60FPS / 120FPS Frame-Locked Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animId: number;

    const render = () => {
      const targetW = container.clientWidth;
      const targetH = container.clientHeight || 320;
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      const width = canvas.width;
      const height = canvas.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const curState = stateRef.current;
      const curPhase = curState?.phase ?? 'BET';
      const curMultiplier = curState?.multiplier ?? 1.0;

      // ── 1. Real-Time Multiplier Synchronization (Zero Mismatch with Server) ──
      let liveMult = 1.0;
      let continuousT = 0;
      if (curPhase === 'PLAYING') {
        const flightStart = curState?.endsAt || flightStartTimeRef.current || Date.now();
        continuousT = Math.max(0, (Date.now() - flightStart) / 1000);
        const formulaMult = 1 + 0.06 * continuousT + Math.pow(0.06 * continuousT, 2) - Math.pow(0.04 * continuousT, 3) + Math.pow(0.04 * continuousT, 4);
        const serverMult = curMultiplier > 1 ? curMultiplier : 1.0;
        liveMult = Math.max(serverMult, formulaMult);
      } else if (curPhase === 'CRASHED') {
        liveMult = curState?.crashPoint ?? curMultiplier;
      } else {
        liveMult = 1.0;
      }

      displayMultRef.current = liveMult;
      animMultRef.current = liveMult;
      const smoothMult = liveMult;
      const theme = getSmoothTheme(smoothMult);

      // Rotate Propeller
      const propSpeed = curPhase === 'PLAYING' ? 0.45 : curPhase === 'BET' ? 0.08 : 0;
      propAngleRef.current += propSpeed;

      // Update Center Multiplier Display
      if (multiplierTextRef.current) {
        multiplierTextRef.current.textContent = `${displayMultRef.current.toFixed(2)}x`;
        multiplierTextRef.current.style.textShadow =
          curPhase === 'CRASHED'
            ? '0 0 28px rgba(239, 68, 68, 0.95)'
            : `0 0 32px rgba(${theme.ambientGlow[0]}, ${theme.ambientGlow[1]}, ${theme.ambientGlow[2]}, 0.85)`;
      }

      // ── 1. Base Radial Background Gradient (100% Fixed Viewport) ──
      const bgGrad = ctx.createRadialGradient(
        width * 0.45,
        height * 0.4,
        20,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.9
      );
      bgGrad.addColorStop(0, `rgb(${theme.bgCenter[0]}, ${theme.bgCenter[1]}, ${theme.bgCenter[2]})`);
      bgGrad.addColorStop(1, `rgb(${theme.bgEdge[0]}, ${theme.bgEdge[1]}, ${theme.bgEdge[2]})`);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // ── 2. Rotating Sunburst Rays (100% Fixed at bottom-left corner 0, height) ──
      const raySpeed =
        curPhase === 'PLAYING'
          ? 0.004 + (Math.min(smoothMult, 20) - 1) * 0.0012
          : curPhase === 'BET'
          ? 0.0008
          : 0;
      rayAngleRef.current += raySpeed;

      const raysCount = 28;
      const angleStep = (Math.PI / 2) / (raysCount / 2);
      const angleOffset = rayAngleRef.current % (angleStep * 2);

      const r = Math.hypot(width, height) * 2.5;
      const originX = 0;
      const originY = height;

      for (let a = -Math.PI; a <= Math.PI / 2 + angleStep * 2; a += angleStep * 2) {
        const a1 = a + angleOffset;
        const a2 = a1 + angleStep;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX + Math.cos(a1) * r, originY + Math.sin(a1) * r);
        ctx.lineTo(originX + Math.cos(a2) * r, originY + Math.sin(a2) * r);
        ctx.closePath();
        ctx.fillStyle = `rgba(${theme.rayColor[0]}, ${theme.rayColor[1]}, ${theme.rayColor[2]}, 0.38)`;
        ctx.fill();
      }

      // ── 3. High-Speed Wind Streaks Streaming Past (Fixed viewport) ──
      if (curPhase === 'PLAYING') {
        ctx.lineWidth = 1.6;
        for (const streak of windStreaksRef.current) {
          streak.x -= streak.speed + Math.min(smoothMult * 2.2, 22);
          if (streak.x < -120) {
            streak.x = width + Math.random() * 150;
            streak.y = 15 + Math.random() * (height - 50);
          }
          ctx.beginPath();
          ctx.moveTo(streak.x, streak.y);
          ctx.lineTo(streak.x + streak.length, streak.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${streak.opacity * 0.4})`;
          ctx.stroke();
        }
      }

      // ── 4. Coordinate Axis Dots & Runway Baseline (Fixed radar boundary frame) ──
      const axisMargin = 14;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      const dotSpacing = 36;
      for (let x = axisMargin + 20; x < width - 10; x += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, height - 6, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let y = height - axisMargin - 20; y > 10; y -= dotSpacing) {
        ctx.beginPath();
        ctx.arc(6, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Runway Ground Baseline (comfortably above bottom border dots)
      const startX = 0;
      const runwayBaselineY = height - 20;
      const runwayTailY = runwayBaselineY - 12;

      ctx.beginPath();
      ctx.moveTo(0, runwayBaselineY);
      ctx.lineTo(width, runwayBaselineY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── 5. Progressive Plane Zoom as Plane Climbs Up ──
      // Starts strictly at 1.00x at 0.0 position (mult=1.00). Scales smoothly up to 1.35x (+35% zoom in)
      const climbRatio =
        curPhase === 'PLAYING'
          ? Math.min(1.0, Math.max(0.0, (smoothMult - 1.0) / 0.45))
          : curPhase === 'CRASHED'
          ? 1.0
          : 0.0;
      const targetZoom = 1.0 + climbRatio * 0.35;
      cameraZoomRef.current += (targetZoom - cameraZoomRef.current) * 0.08;
      const planeZoom = cameraZoomRef.current;

      // ── 6. Flight Boundaries: Height stays in the middle & safe padding gap from borders ──
      // Cruising altitude stays strictly in the vertical middle (~48%-50% height) with generous top headroom
      const cruiseTailY = height * 0.50;
      const curveH = Math.max(40, runwayTailY - cruiseTailY);

      // Plane reaches right up to the border edge with minimal 5px gap
      const frontReach = 96 * planeZoom * 0.996;
      const rightBorderMargin = 5;
      const maxTailX = width - frontReach - rightBorderMargin;
      const curveW = Math.max(60, maxTailX - startX);

      // ── 7. Direct Swift Glide to Full Right ("plan fly korar por e direct ekbare right a chole jabe and urte thakbe") ──
      // Right after takeoff, plane sweeps directly to the full right within ~1.1s (or by ~1.15x) and continues cruising there:
      let targetProgress = 0;
      if (curPhase === 'PLAYING') {
        const timeProgress = Math.min(1.0, 1 - Math.pow(Math.max(0, 1 - continuousT / 1.15), 3));
        const multProgress = Math.min(1.0, Math.max(0, (liveMult - 1.0) / 0.15));
        targetProgress = Math.max(timeProgress, multProgress);
      } else if (curPhase === 'CRASHED') {
        targetProgress = 1.0;
      } else {
        targetProgress = 0;
        smoothProgressRef.current = 0;
      }

      // 60FPS / 120FPS smooth interpolation
      smoothProgressRef.current += (targetProgress - smoothProgressRef.current) * 0.22;
      const progress = curPhase === 'BET' ? 0 : Math.min(1.0, smoothProgressRef.current);

      const baseX = startX + progress * curveW;
      const baseY = runwayTailY - Math.pow(progress, 1.20) * curveH;

      // Real-World Aerodynamic Float & Surge: smooth air turbulence bobbing while cruising
      const flightTime = continuousT;
      const airborne = Math.min(1.0, progress * 3.5);
      const waveAltitude = curPhase === 'PLAYING' ? Math.sin(flightTime * 2.6) * 3.8 * airborne : 0;
      const waveSurge = curPhase === 'PLAYING' ? Math.cos(flightTime * 1.8) * 2.0 * airborne : 0;
      const wavePitch = curPhase === 'PLAYING' ? Math.cos(flightTime * 2.6) * 1.3 * airborne : 0;

      // Exact plane tail point coordinates: curve endpoint = tail anchor (ZERO GAP!)
      const planeTailX = baseX + waveSurge;
      const planeTailY = baseY + waveAltitude;

      const ctrlX = startX + (planeTailX - startX) * 0.44;
      const ctrlY = runwayTailY;

      // Exact Bezier curve tangent derivative: B'(1) = 2*(P2 - P1)
      const dx = planeTailX - ctrlX;
      const dy = planeTailY - ctrlY;
      const tangentAngle = dx > 2 ? (Math.atan2(dy, dx) * 180) / Math.PI : 0;

      // When arriving at right side, level out into authentic horizontal cruising flight (-4° to -6°)
      const cruiseEase = Math.max(0, Math.min(1, (progress - 0.70) / 0.25));
      const flightPitch = tangentAngle * (1 - cruiseEase * 0.78) + (-5) * (cruiseEase * 0.78);

      // Clamped realistic flight angle smoothly smoothed
      const targetAngle =
        curPhase === 'BET' || progress < 0.005
          ? 0
          : Math.max(-24, Math.min(-2, flightPitch + wavePitch));
      smoothAngleRef.current += (targetAngle - smoothAngleRef.current) * 0.16;
      const planeAngleRad = (smoothAngleRef.current * Math.PI) / 180;

      // ── 7. Draw Flight Curve and Under-Curve Glowing Red Hill ──
      if (curPhase === 'PLAYING' || curPhase === 'CRASHED') {
        // Red glowing area under curve - starts right from bottom-left origin (0, height)
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, runwayTailY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, planeTailX, planeTailY);
        ctx.lineTo(planeTailX, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const areaGrad = ctx.createLinearGradient(0, planeTailY, 0, height);
        areaGrad.addColorStop(
          0,
          `rgba(${theme.fillTop[0]}, ${theme.fillTop[1]}, ${theme.fillTop[2]}, 0.88)`
        );
        areaGrad.addColorStop(
          1,
          `rgba(${theme.fillBottom[0]}, ${theme.fillBottom[1]}, ${theme.fillBottom[2]}, 0.45)`
        );
        ctx.fillStyle = areaGrad;
        ctx.fill();

        // Red glowing trajectory line leading directly into plane tail tip (starts right from 0, runwayTailY)
        ctx.beginPath();
        ctx.moveTo(0, runwayTailY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, planeTailX, planeTailY);
        ctx.lineWidth = Math.round(3.6 * Math.min(1.3, planeZoom));
        ctx.strokeStyle = `rgb(${theme.curveStroke[0]}, ${theme.curveStroke[1]}, ${theme.curveStroke[2]})`;
        ctx.shadowColor = `rgb(${theme.curveStroke[0]}, ${theme.curveStroke[1]}, ${theme.curveStroke[2]})`;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Ambient radial aura tracking plane position
        const planeAura = ctx.createRadialGradient(
          planeTailX,
          planeTailY,
          5,
          planeTailX,
          planeTailY,
          150 * planeZoom
        );
        planeAura.addColorStop(
          0,
          `rgba(${theme.ambientGlow[0]}, ${theme.ambientGlow[1]}, ${theme.ambientGlow[2]}, 0.45)`
        );
        planeAura.addColorStop(1, 'transparent');
        ctx.fillStyle = planeAura;
        ctx.fillRect(0, 0, width, height);
      }

      // ── 8. Render Plane Directly in Canvas (Guaranteed 100% Unbroken Connection!) ──
      if (curPhase === 'CRASHED') {
        crashAnimationOffsetRef.current.x += 8;
        crashAnimationOffsetRef.current.y -= 5;
        crashAnimationOffsetRef.current.opacity = Math.max(
          0,
          crashAnimationOffsetRef.current.opacity - 0.035
        );

        const cx = planeTailX + crashAnimationOffsetRef.current.x;
        const cy = planeTailY + crashAnimationOffsetRef.current.y;
        drawAviatorPlane(
          ctx,
          cx,
          cy,
          (-38 * Math.PI) / 180,
          curPhase,
          propAngleRef.current,
          crashAnimationOffsetRef.current.opacity,
          planeZoom
        );
      } else if (curPhase === 'PLAYING') {
        drawAviatorPlane(
          ctx,
          planeTailX,
          planeTailY,
          planeAngleRad,
          curPhase,
          propAngleRef.current,
          1,
          planeZoom
        );
      } else {
        // BET phase: rested calmly on runway baseline at exact 0.0 position
        drawAviatorPlane(
          ctx,
          startX,
          runwayTailY,
          0,
          curPhase,
          propAngleRef.current,
          1,
          1.0
        );
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [Boolean(state)]);

  if (!state) {
    return (
      <div
        className="mx-4 mt-3 relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl h-[320px] flex flex-col items-center justify-center select-none"
        ref={containerRef}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-dark-950 to-black pointer-events-none" />

        {/* Animated Radar Scanning Scope */}
        <div className="relative w-40 h-40 rounded-full border border-cyan-500/30 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.18)]">
          <div className="absolute inset-3 rounded-full border border-cyan-500/20" />
          <div className="absolute inset-8 rounded-full border border-cyan-500/15" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-cyan-500/25" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-cyan-500/25" />

          {/* Rotating radar scanner sweep */}
          <div className="absolute inset-0 rounded-full animate-spin [animation-duration:2.4s] bg-[conic-gradient(from_0deg,_transparent_0deg,_transparent_260deg,_rgba(6,182,212,0.45)_360deg)]" />

          {/* Center glowing Aviator airplane icon */}
          <div className="relative z-10 w-11 h-11 rounded-full bg-red-600/30 border border-red-500/60 flex items-center justify-center shadow-lg shadow-red-900/50 animate-pulse">
            <span className="text-xl">✈️</span>
          </div>
        </div>

        {/* Syncing Status Indicator */}
        <div className="relative z-10 mt-5 text-center space-y-1">
          <div className="text-xs font-black tracking-widest text-cyan-300 uppercase flex items-center justify-center gap-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block animate-ping" />
            CONNECTING TO LIVE RADAR...
          </div>
          <div className="text-[11px] font-bold text-dark-400">
            Syncing multiplayer Fly High session
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-4 mt-3 relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl h-[320px]"
      ref={containerRef}
    >
      {/* HTML5 Canvas: Dynamic Background Zoom, Wind Streaks, Unbroken Flight Curve & Plane */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Multiplier / Round Status Overlay Centered */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
        {phase === 'BET' ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="text-xs font-black tracking-widest text-white/80 uppercase drop-shadow-md">
              WAITING FOR NEXT ROUND
            </div>
            <div className="w-56 h-2 rounded-full bg-white/10 overflow-hidden border border-white/10 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 transition-all duration-100 ease-linear rounded-full"
                style={{ width: `${(countdown / 8) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            {phase === 'CRASHED' && (
              <div className="text-red-500 text-sm md:text-base font-black tracking-widest animate-bounce mb-1 drop-shadow-[0_2px_14px_rgba(239,68,68,0.85)]">
                FLEW AWAY!
              </div>
            )}
            <div
              ref={multiplierTextRef}
              className={`text-5xl md:text-6xl font-black tracking-tight tabular-nums transition-colors duration-150 ${
                phase === 'CRASHED' ? 'text-red-500' : 'text-white'
              }`}
            >
              1.00x
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlightCanvas;
