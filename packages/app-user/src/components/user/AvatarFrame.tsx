import React from 'react';
import { getMediaUrl } from '../../lib/media';

export interface AvatarFrameData {
  _id?: string;
  name?: string;
  image?: string;
  preview?: string;
  rarity?: string;
}

interface AvatarFrameProps {
  frame?: AvatarFrameData | string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  animated?: boolean;
  className?: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Imperial Sovereign Dragon Frame (3D Masterpiece Vector SVG)
 * Designed with 100x100 viewBox to frame inner avatar (r=36.5 at cx=50, cy=50)
 * ───────────────────────────────────────────────────────────────────────────── */
export const SovereignDragonFrameSVG = ({ animated = true }: { animated?: boolean }) => (
  <svg
    viewBox="0 0 100 100"
    className="w-full h-full select-none"
    style={{
      animation: animated ? 'avatar-frame-pulse 3s ease-in-out infinite' : undefined,
    }}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      {/* 24K Imperial Gold Gradient */}
      <linearGradient id="frameGoldGrad" x1="10" y1="5" x2="90" y2="95" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFBEB" />
        <stop offset="15%" stopColor="#FDE047" />
        <stop offset="45%" stopColor="#F59E0B" />
        <stop offset="75%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>

      {/* Radiant Ruby Gem Gradient */}
      <radialGradient id="frameRubyGrad" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF6B8B" />
        <stop offset="40%" stopColor="#EF4444" />
        <stop offset="85%" stopColor="#991B1B" />
        <stop offset="100%" stopColor="#450A0A" />
      </radialGradient>

      {/* Celestial Sapphire Cyan */}
      <radialGradient id="frameCyanGrad" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#E0F2FE" />
        <stop offset="50%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#0369A1" />
      </radialGradient>

      {/* Shimmer Light Reflex */}
      <linearGradient id="frameShine" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0" />
        <stop offset="100%" stopColor="#FDE047" stopOpacity="0.5" />
      </linearGradient>
    </defs>

    {/* Outer Radiant Aura Ring */}
    <circle
      cx="50"
      cy="50"
      r="41"
      stroke="url(#frameGoldGrad)"
      strokeWidth="1.2"
      strokeDasharray="3 2"
      opacity="0.85"
    />

    {/* Main Filigree Gold Ring */}
    <circle
      cx="50"
      cy="50"
      r="37.5"
      stroke="url(#frameGoldGrad)"
      strokeWidth="3.2"
      strokeLinecap="round"
    />

    {/* Inner White-Gold Highlight Ridge */}
    <circle
      cx="50"
      cy="50"
      r="36.2"
      stroke="url(#frameShine)"
      strokeWidth="0.8"
      opacity="0.9"
    />

    {/* ── Left Wing / Dragon Flank ─────────────────────────────── */}
    <g opacity="0.95">
      <path
        d="M13.5 40C8 42 4 49 5 56C6 62 11 65 14 62C12 59 11 53 13.5 48Z"
        fill="url(#frameGoldGrad)"
        stroke="#FEF08A"
        strokeWidth="0.5"
      />
      <path
        d="M14 43C10 46 8 52 9 58C11 58 13 55 14.5 50Z"
        fill="#78350F"
      />
      <circle cx="9" cy="53" r="1.5" fill="url(#frameCyanGrad)" />
    </g>

    {/* ── Right Wing / Dragon Flank ────────────────────────────── */}
    <g opacity="0.95">
      <path
        d="M86.5 40C92 42 96 49 95 56C94 62 89 65 86 62C88 59 89 53 86.5 48Z"
        fill="url(#frameGoldGrad)"
        stroke="#FEF08A"
        strokeWidth="0.5"
      />
      <path
        d="M86 43C90 46 92 52 91 58C89 58 87 55 85.5 50Z"
        fill="#78350F"
      />
      <circle cx="91" cy="53" r="1.5" fill="url(#frameCyanGrad)" />
    </g>

    {/* ── Top Imperial Crown / Dragon Crest ────────────────────── */}
    {/* Dragon Horns sweeping up */}
    <path
      d="M36 17C33 11 28 6 22 4C26 9 29 15 33 21Z"
      fill="url(#frameGoldGrad)"
      stroke="#FEF08A"
      strokeWidth="0.6"
    />
    <path
      d="M64 17C67 11 72 6 78 4C74 9 71 15 67 21Z"
      fill="url(#frameGoldGrad)"
      stroke="#FEF08A"
      strokeWidth="0.6"
    />

    {/* Imperial Crown Base & Spires */}
    <path
      d="M32 18L37 11L43 16L50 6L57 16L63 11L68 18C61 14 39 14 32 18Z"
      fill="url(#frameGoldGrad)"
      stroke="#FFFBEB"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />

    {/* Center Mythic Ruby Heart */}
    <polygon
      points="50,11 54,16 50,21 46,16"
      fill="url(#frameRubyGrad)"
      stroke="#FFFFFF"
      strokeWidth="0.6"
    />

    {/* Crown Pinnacle Diamond */}
    <circle cx="50" cy="5.5" r="2.2" fill="#FFFFFF" />
    <circle cx="37" cy="10.5" r="1.5" fill="#E0F2FE" />
    <circle cx="63" cy="10.5" r="1.5" fill="#E0F2FE" />

    {/* ── Bottom Royal Pedestal & Medal ───────────────────────── */}
    <path
      d="M38 84C42 87 46 88 50 88C54 88 58 87 62 84L64 88C59 93 41 93 36 88Z"
      fill="url(#frameGoldGrad)"
      stroke="#FFFBEB"
      strokeWidth="0.6"
    />

    {/* Bottom Shield / Star Crest */}
    <polygon
      points="50,86 55,90 53,96 50,94 47,96 45,90"
      fill="url(#frameGoldGrad)"
      stroke="#FFFBEB"
      strokeWidth="0.5"
    />
    <circle cx="50" cy="91" r="1.8" fill="url(#frameRubyGrad)" stroke="#FFFFFF" strokeWidth="0.4" />

    {/* ── Twinkling Star Sparks ────────────────────────────────── */}
    {animated && (
      <>
        {/* Top-Right Star */}
        <polygon
          points="73,16 75,19 78,20 75,21 73,24 72,21 69,20 72,19"
          fill="#FFFFFF"
          opacity="0.95"
        />
        {/* Top-Left Star */}
        <polygon
          points="27,16 28,19 31,20 28,21 27,24 26,21 23,20 26,19"
          fill="#FFFFFF"
          opacity="0.95"
        />
        {/* Bottom-Right Sparkle */}
        <polygon
          points="76,76 77,78 79,79 77,80 76,82 75,80 73,79 75,78"
          fill="#FDE047"
          opacity="0.9"
        />
      </>
    )}
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────────
 * Celestial Nova / Cyber Aurora Frame
 * ───────────────────────────────────────────────────────────────────────────── */
export const NovaAuroraFrameSVG = ({ animated = true }: { animated?: boolean }) => (
  <svg
    viewBox="0 0 100 100"
    className="w-full h-full select-none"
    style={{
      animation: animated ? 'avatar-frame-pulse 2.5s ease-in-out infinite' : undefined,
    }}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="auroraGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="40%" stopColor="#818CF8" />
        <stop offset="70%" stopColor="#C084FC" />
        <stop offset="100%" stopColor="#F472B6" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="41" stroke="url(#auroraGrad)" strokeWidth="1" strokeDasharray="4 2" opacity="0.7" />
    <circle cx="50" cy="50" r="37.5" stroke="url(#auroraGrad)" strokeWidth="3" />
    <circle cx="50" cy="50" r="36" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.8" />
    {/* Corner Spires */}
    <polygon points="50,4 52,10 50,13 48,10" fill="#38BDF8" />
    <polygon points="50,96 52,90 50,87 48,90" fill="#F472B6" />
    <polygon points="4,50 10,52 13,50 10,48" fill="#818CF8" />
    <polygon points="96,50 90,52 87,50 90,48" fill="#C084FC" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────────
 * System Developer Cyber Core Frame (Exclusive Developer Masterpiece)
 * ───────────────────────────────────────────────────────────────────────────── */
export const DeveloperAvatarFrameSVG = ({ animated = true }: { animated?: boolean }) => (
  <svg
    viewBox="0 0 100 100"
    className="w-full h-full select-none"
    style={{
      animation: animated ? 'avatar-frame-pulse 2.2s ease-in-out infinite' : undefined,
    }}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="devRingGrad" x1="5" y1="5" x2="95" y2="95" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00F0FF" />
        <stop offset="35%" stopColor="#00A8FF" />
        <stop offset="70%" stopColor="#8000FF" />
        <stop offset="100%" stopColor="#00F0FF" />
      </linearGradient>
      <linearGradient id="devNeonGlow" x1="20" y1="0" x2="80" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor="#7DF9FF" />
        <stop offset="100%" stopColor="#00F0FF" />
      </linearGradient>
      <radialGradient id="devCoreGrad" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.4" />
        <stop offset="60%" stopColor="#0055FF" stopOpacity="0.1" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>

    {/* Outer Cybernetic Dash Ring */}
    <circle
      cx="50"
      cy="50"
      r="41.5"
      stroke="url(#devRingGrad)"
      strokeWidth="1.2"
      strokeDasharray="4 2 1 2"
      opacity="0.85"
    />

    {/* Main Neon Circuit Ring */}
    <circle
      cx="50"
      cy="50"
      r="37.5"
      stroke="url(#devRingGrad)"
      strokeWidth="3.2"
      strokeLinecap="round"
    />

    {/* Inner High-Frequency Laser Ring */}
    <circle
      cx="50"
      cy="50"
      r="36"
      stroke="#FFFFFF"
      strokeWidth="0.8"
      opacity="0.9"
    />

    {/* ── Left Circuit Wing & Data Nodes ───────────────────────── */}
    <path
      d="M13 38L6 44V56L13 62"
      stroke="#00F0FF"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.9"
    />
    <circle cx="6" cy="44" r="1.8" fill="#FFFFFF" stroke="#00F0FF" strokeWidth="0.8" />
    <circle cx="6" cy="56" r="1.8" fill="#00F0FF" />
    <circle cx="10" cy="50" r="1.2" fill="#7DF9FF" />

    {/* ── Right Circuit Wing & Data Nodes ──────────────────────── */}
    <path
      d="M87 38L94 44V56L87 62"
      stroke="#00F0FF"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.9"
    />
    <circle cx="94" cy="44" r="1.8" fill="#FFFFFF" stroke="#00F0FF" strokeWidth="0.8" />
    <circle cx="94" cy="56" r="1.8" fill="#00F0FF" />
    <circle cx="90" cy="50" r="1.2" fill="#7DF9FF" />

    {/* ── Top Crest: Hexagonal System Developer Core with < / > ──── */}
    {/* Hexagon Shield */}
    <polygon
      points="50,4 64,12 64,22 50,30 36,22 36,12"
      fill="#031122"
      stroke="url(#devRingGrad)"
      strokeWidth="1.5"
    />
    {/* Inner Hex Plate */}
    <polygon
      points="50,6 62,13 62,21 50,28 38,21 38,13"
      fill="url(#devRingGrad)"
      opacity="0.25"
    />

    {/* Code Brackets < / > */}
    {/* Left Bracket < */}
    <path
      d="M45 13L40 17L45 21"
      stroke="url(#devNeonGlow)"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Right Bracket > */}
    <path
      d="M55 13L60 17L55 21"
      stroke="url(#devNeonGlow)"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Slash / */}
    <line
      x1="52"
      y1="12"
      x2="48"
      y2="22"
      stroke="#00F0FF"
      strokeWidth="1.6"
      strokeLinecap="round"
    />

    {/* Pinnacle Quantum Diamond */}
    <polygon points="50,1 52,4 50,7 48,4" fill="#FFFFFF" />

    {/* ── Bottom Pedestal: DEV Chip & Energy Medallion ─────────── */}
    <polygon
      points="36,86 64,86 68,94 50,98 32,94"
      fill="#031122"
      stroke="url(#devRingGrad)"
      strokeWidth="1.2"
    />
    <rect x="42" y="88" width="16" height="5" rx="1.5" fill="#002244" stroke="#00F0FF" strokeWidth="0.8" />
    <text
      x="50"
      y="92.2"
      textAnchor="middle"
      fill="#FFFFFF"
      fontSize="4"
      fontWeight="900"
      fontFamily="monospace"
      letterSpacing="1"
    >
      DEV
    </text>

    {/* Micro Quantum Sparkles */}
    {animated && (
      <>
        <circle cx="28" cy="18" r="1.2" fill="#00F0FF" opacity="0.9" />
        <circle cx="72" cy="18" r="1.2" fill="#00F0FF" opacity="0.9" />
        <polygon points="22,78 23.5,80.5 26,81 23.5,81.5 22,84 20.5,81.5 18,81 20.5,80.5" fill="#FFFFFF" />
        <polygon points="78,78 79.5,80.5 82,81 79.5,81.5 78,84 76.5,81.5 74,81 76.5,80.5" fill="#FFFFFF" />
      </>
    )}
  </svg>
);

export const AvatarFrame: React.FC<AvatarFrameProps> = ({
  frame,
  size = 'md',
  animated = true,
  className = '',
}) => {
  if (!frame) return null;

  const frameName = typeof frame === 'string' ? frame : frame.name || '';
  const frameSrc = typeof frame === 'string' ? frame : frame.image || frame.preview || '';
  const norm = (frameName + ' ' + frameSrc).trim().toLowerCase();
  if (!norm && !frameSrc) return null;

  const isCustomImageUrl = Boolean(
    frameSrc &&
      (frameSrc.startsWith('http://') ||
        frameSrc.startsWith('https://') ||
        frameSrc.startsWith('data:') ||
        frameSrc.startsWith('/') ||
        frameSrc.startsWith('blob:') ||
        (frameSrc.includes('.') && frameSrc.length > 5 && !frameSrc.includes(' ')))
  );

  return (
    <div
      aria-hidden="true"
      className={`absolute -top-[18.5%] -left-[18.5%] w-[137%] h-[137%] pointer-events-none z-20 flex items-center justify-center overflow-visible select-none ${className}`}
    >
      {isCustomImageUrl ? (
        <img
          src={getMediaUrl(frameSrc)}
          alt={frameName || 'Avatar Frame'}
          className="w-full h-full object-contain pointer-events-none drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]"
          onError={(e: any) => {
            e.target.style.display = 'none';
          }}
        />
      ) : norm.includes('dev') || norm.includes('developer') || norm.includes('code') ? (
        <DeveloperAvatarFrameSVG animated={animated} />
      ) : norm.includes('nova') || norm.includes('aurora') || norm.includes('cyber') ? (
        <NovaAuroraFrameSVG animated={animated} />
      ) : (
        /* Default to high-end Imperial Sovereign Dragon Frame */
        <SovereignDragonFrameSVG animated={animated} />
      )}
    </div>
  );
};
