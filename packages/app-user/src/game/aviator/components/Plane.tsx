import React from 'react';

interface PlaneProps {
  phase: 'BET' | 'PLAYING' | 'CRASHED';
  multiplier?: number;
}

/**
 * Authentic Aviator Monoplane with:
 * 1. Exact tail anchor point at (16px, 26px) for 100% locked connection with the flight curve
 * 2. Real-world wings on BOTH sides (Upper Far Wing + Lower Near Wing in 3D perspective)
 * 3. Front propeller facing FORWARD into the wind in 3D perspective, spinning rapidly
 * 4. Signature bold "X" insignia on fuselage flank
 * 5. Cockpit canopy with aerodynamic glint and tail elevator fins
 */
export const Plane: React.FC<PlaneProps> = ({ phase }) => {
  const isPlaying = phase === 'PLAYING';
  const isCrashed = phase === 'CRASHED';
  const isWaiting = phase === 'BET';

  return (
    <div
      className={`relative select-none will-change-transform ${isPlaying ? 'aviator-plane--flying' : ''} ${
        isCrashed ? 'aviator-plane--crashed' : ''
      }`}
      style={{
        width: 104,
        height: 52,
        transformOrigin: '16px 26px', // Locked exactly to the tail anchor point!
      }}
    >
      <svg
        width="104"
        height="52"
        viewBox="0 0 104 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible filter drop-shadow-[0_4px_14px_rgba(255,16,60,0.6)]"
      >
        <defs>
          {/* Fuselage body gradient */}
          <linearGradient id="bodyGrad" x1="14" y1="20" x2="92" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C90025" />
            <stop offset="30%" stopColor="#E6002E" />
            <stop offset="70%" stopColor="#FF1744" />
            <stop offset="100%" stopColor="#C90025" />
          </linearGradient>

          {/* Far wing (upper side) gradient */}
          <linearGradient id="farWingGrad" x1="28" y1="4" x2="56" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF3366" />
            <stop offset="65%" stopColor="#D90028" />
            <stop offset="100%" stopColor="#990014" />
          </linearGradient>

          {/* Near wing (lower side) gradient */}
          <linearGradient id="nearWingGrad" x1="34" y1="28" x2="64" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF4D79" />
            <stop offset="50%" stopColor="#EF233C" />
            <stop offset="100%" stopColor="#B30710" />
          </linearGradient>

          {/* Fuselage underbelly shadow */}
          <linearGradient id="bellyGrad" x1="16" y1="26" x2="86" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7A000E" />
            <stop offset="100%" stopColor="#570008" />
          </linearGradient>
        </defs>

        {/* ── 1. Tail Section (Tail Fin at anchor 16, 26) ── */}
        <path
          d="M18 26 L12 9 C10 6 7 7 8 10 L13 28 Z"
          fill="url(#farWingGrad)"
          stroke="#7A000E"
          strokeWidth="0.8"
        />
        {/* Tail horizontal elevator */}
        <path d="M13 28 L4 28 C2 28 3 31 5 32 L15 30 Z" fill="#990014" stroke="#570008" strokeWidth="0.8" />

        {/* ── 2. Upper Far Wing (on the top side of the plane) ── */}
        <path
          d="M58 20 L30 4 C28 2 24 4 26 8 L32 15 L30 16 L36 22 Z"
          fill="url(#farWingGrad)"
          stroke="#7A000E"
          strokeWidth="0.9"
        />
        {/* Upper wing rib notches (matches user screenshot) */}
        <path d="M28 11 L33 11" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
        <path d="M30 15 L35 15" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />

        {/* ── 3. Main Fuselage Body (Tail root starts precisely at anchor 16, 26) ── */}
        <path
          d="M92 25 C92 22 86 19 82 19 L66 19 C58 13 50 13 44 19 L20 22 C15 22 13 24 16 26 C16 28 22 30 32 30 L82 29 C86 29 92 27 92 25 Z"
          fill="url(#bodyGrad)"
          stroke="#ff6b8b"
          strokeWidth="0.6"
        />

        {/* Fuselage Underbelly dark bevel */}
        <path
          d="M16 26 C18 29 32 30 82 29 C86 28 92 27 92 25 C92 26 86 29 82 30 L32 31 C18 31 15 29 16 26 Z"
          fill="url(#bellyGrad)"
        />

        {/* Top Fuselage Sheen Highlight */}
        <path
          d="M18 23 Q52 20 84 19"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.45"
        />

        {/* ── 4. Cockpit Canopy ── */}
        <path
          d="M66 19 C62 13 52 13 46 19 Z"
          fill="#0B0B12"
          stroke="#ffffff"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        {/* Windshield Reflection Glint */}
        <path
          d="M62 17 C59 15 55 15 51 17"
          stroke="#70E000"
          strokeWidth="1.3"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />

        {/* ── 5. Signature "X" Emblem on Fuselage Flank (from user screenshot) ── */}
        <g transform="translate(68, 20)">
          <path
            d="M2 2 L11 11 M11 2 L2 11"
            stroke="#ffffff"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 2 L11 11 M11 2 L2 11"
            stroke="#990010"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* ── 6. Lower Near Wing (on the viewer's side of the plane) ── */}
        {/* Sweeps down and back with 3D depth and highlight */}
        <path
          d="M60 28 L34 46 C32 48 28 46 30 42 L36 35 L34 34 L44 29 Z"
          fill="url(#nearWingGrad)"
          stroke="#7A000E"
          strokeWidth="0.9"
        />
        {/* Lower wing rib notch & highlight */}
        <path d="M38 39 L43 39" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
        <path d="M40 43 L45 43" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
        <path
          d="M58 29 L36 44"
          stroke="#ffffff"
          strokeWidth="1.1"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />

        {/* ── 7. Front Engine Nose Cone (Base for Forward Propeller) ── */}
        <path
          d="M88 21 Q94 23 96 25 Q94 27 88 29 Z"
          fill="#B30710"
          stroke="#7A000E"
          strokeWidth="0.9"
        />
      </svg>

      {/* ── 8. FRONT PROPELLER: Faces FORWARD in 3D Perspective and Spins! ── */}
      <div
        className="aviator-propeller-3d-box"
        style={{ left: 88, top: 7, width: 20, height: 36 }}
      >
        <div className="aviator-propeller-3d-tilt">
          {isPlaying && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/35 via-red-500/30 to-transparent blur-[1px] animate-pulse" />
          )}
          <div
            className={
              isPlaying
                ? 'aviator-propeller-3d-spin-fast'
                : isWaiting
                ? 'aviator-propeller-3d-spin-idle'
                : 'aviator-propeller-3d-spin-fast'
            }
            style={{ width: '100%', height: '100%' }}
          >
            <svg width="100%" height="100%" viewBox="-10 -18 20 36" fill="none">
              {/* Top Blade */}
              <path
                d="M0 0 C-3 -5 -4 -11 0 -17 C2 -19 4 -18 4 -15 C3 -11 2 -5 0 0 Z"
                fill="#ffffff"
                stroke="#D90429"
                strokeWidth="0.8"
              />
              {/* Bottom Blade */}
              <path
                d="M0 0 C3 5 4 11 0 17 C-2 19 -4 18 -4 15 C-3 11 -2 5 0 0 Z"
                fill="#ffffff"
                stroke="#D90429"
                strokeWidth="0.8"
              />
              {/* Center Spinner Hub */}
              <circle cx="0" cy="0" r="3" fill="#D90429" stroke="#ffffff" strokeWidth="1.2" />
              <circle cx="-0.7" cy="-0.7" r="1" fill="#ffffff" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plane;
