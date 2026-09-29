import React, { useEffect, useRef, useState } from 'react';
import type { AviatorState } from '../../../types/aviator';

export const FlightCanvas: React.FC<{ state: AviatorState | null }> = ({ state }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [countdown, setCountdown] = useState(0);

  const phase = state?.phase ?? 'BET';
  const multiplier = state?.multiplier ?? 1.0;

  // Countdown during the BET phase (driven by server endsAt)
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

  const displayMultiplier = phase === 'CRASHED' ? (state?.crashPoint ?? multiplier) : multiplier;

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animId: number;

    const render = () => {
      const width = (canvas.width = container.clientWidth);
      const height = (canvas.height = container.clientHeight || 320);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Solid Dark Background
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, width, height);

      // 2. Sunburst Rays from Bottom-Left (0, height)
      const originX = 0;
      const originY = height;
      const raysCount = 28;
      const angleStep = (Math.PI / 2) / raysCount;

      for (let i = 0; i < raysCount; i++) {
        if (i % 2 === 0) {
          ctx.beginPath();
          ctx.moveTo(originX, originY);
          const a1 = - (i * angleStep);
          const a2 = - ((i + 1) * angleStep);
          const r = Math.sqrt(width * width + height * height) * 1.5;
          ctx.lineTo(originX + Math.cos(a1) * r, originY + Math.sin(a1) * r);
          ctx.lineTo(originX + Math.cos(a2) * r, originY + Math.sin(a2) * r);
          ctx.closePath();
          ctx.fillStyle = '#141414';
          ctx.fill();
        }
      }

      // 3. Axis Lines & Dots
      const axisMargin = 12;
      ctx.fillStyle = '#ffffff';

      // X-axis dots (bottom)
      const dotSpacing = 36;
      for (let x = axisMargin + 20; x < width - 10; x += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, height - 6, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Y-axis dots (left)
      for (let y = height - axisMargin - 20; y > 10; y -= dotSpacing) {
        ctx.beginPath();
        ctx.arc(6, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Flight Curve & Filled Red Region (when PLAYING or CRASHED)
      if (phase === 'PLAYING' || phase === 'CRASHED') {
        const currentMult = phase === 'CRASHED' ? (state?.crashPoint ?? multiplier) : multiplier;
        // Logarithmic progress: looks natural over a wide 1x–30x range
        const MAX_CRASH = 30;
        const progress = Math.min(1, Math.max(0.02, Math.log(currentMult) / Math.log(MAX_CRASH)));

        const startX = 12;
        const startY = height - 12;
        const endX = startX + progress * (width - 90);
        const endY = startY - Math.pow(progress, 1.5) * (height - 70);

        const ctrlX = startX + (endX - startX) * 0.4;
        const ctrlY = startY;

        // Draw filled dark crimson area under curve
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
        ctx.lineTo(endX, startY);
        ctx.closePath();

        const areaGrad = ctx.createLinearGradient(0, startY, 0, endY);
        areaGrad.addColorStop(0, '#660012');
        areaGrad.addColorStop(1, '#A80521');
        ctx.fillStyle = areaGrad;
        ctx.fill();

        // Draw stroke along curve
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#FF1744';
        ctx.shadowColor = '#FF1744';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [phase, multiplier, state?.crashPoint]);

  // Calculate plane position for HTML/SVG plane overlay
  const currentMult = phase === 'CRASHED' ? (state?.crashPoint ?? multiplier) : multiplier;
  const MAX_CRASH = 30;
  const progress = phase === 'BET' ? 0 : Math.min(1, Math.max(0.02, Math.log(Math.max(1, currentMult)) / Math.log(MAX_CRASH)));

  return (
    <div className="mx-4 mt-3 relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl h-[320px]" ref={containerRef}>
      {/* HTML5 Canvas Background & Sunburst & Flight Curve */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Plane element positioned at current curve endpoint */}
      {phase !== 'BET' && (
        <div
          className="absolute transition-all duration-75 ease-linear pointer-events-none z-10"
          style={{
            left: `calc(12px + ${progress * 75}%)`,
            bottom: `calc(12px + ${Math.pow(progress, 1.5) * 65}%)`,
            transform: `translate(-15%, 50%) rotate(${phase === 'CRASHED' ? '45deg' : `${-progress * 15}deg`})`,
            opacity: phase === 'CRASHED' ? 0.3 : 1,
          }}
        >
          {/* Red Propeller Monoplane SVG matching Aviator */}
          <svg width="72" height="36" viewBox="0 0 72 36" fill="none">
            {/* Spinning Propeller */}
            {phase === 'PLAYING' && (
              <line x1="68" y1="4" x2="68" y2="32" stroke="#FF4D6D" strokeWidth="2.5" className="animate-spin opacity-80" />
            )}
            {/* Main Wing Top */}
            <path d="M32 18 L48 2 L58 2 L42 18 Z" fill="#E50914" stroke="#B30710" strokeWidth="0.8" />
            {/* Main Wing Bottom */}
            <path d="M32 18 L44 32 L54 32 L40 18 Z" fill="#B30710" stroke="#80050B" strokeWidth="0.8" />
            {/* Fuselage / Body */}
            <path d="M6 18 C12 17 22 15 36 14 L66 14 C68 14 69 16 69 18 C69 20 68 22 66 22 L36 22 C22 21 12 19 6 18 Z" fill="#FF1E46" />
            {/* Tail Fin */}
            <path d="M6 18 L14 4 L22 15 Z" fill="#E50914" />
            {/* Horizontal Stabilizer */}
            <path d="M8 18 L16 26 L22 20 Z" fill="#B30710" />
            {/* Engine Nose */}
            <path d="M66 14 L69 16 L69 20 L66 22 Z" fill="#80050B" />
            {/* Cockpit Canopy */}
            <path d="M36 14 C40 9 46 9 50 14 Z" fill="#0D0D0D" opacity="0.75" />
          </svg>
        </div>
      )}

      {/* Multiplier / Round Overlay Centered */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
        {phase === 'BET' ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="text-xs font-black tracking-widest text-white/70 uppercase drop-shadow">
              WAITING FOR NEXT ROUND
            </div>
            <div className="w-48 h-2 rounded-full bg-white/10 overflow-hidden border border-white/10 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 transition-all duration-100 ease-linear rounded-full"
                style={{ width: `${(countdown / 8) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            {phase === 'CRASHED' && (
              <div className="text-red-500 text-sm md:text-base font-black tracking-widest animate-bounce mb-1 drop-shadow-lg">
                FLEW AWAY!
              </div>
            )}
            <div
              className={`text-5xl md:text-6xl font-extrabold tracking-tight drop-shadow-2xl tabular-nums ${
                phase === 'CRASHED' ? 'text-red-500' : 'text-white'
              }`}
            >
              {displayMultiplier.toFixed(2)}x
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
