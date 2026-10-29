import React from 'react';
import { PiSealCheckFill as BadgeCheck, PiCoinsFill as Coins } from 'react-icons/pi';

export type SellerType = 'none' | 'official' | 'paylor' | 'diamond_seller';

interface SellerBadgeProps {
  sellerType?: SellerType | string;
  className?: string;
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/**
 * 3D Animated Vector Diamond Crystal with multi-facet refraction
 */
export const AnimatedDiamondEmblem = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    viewBox="0 0 32 32"
    className={`shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      {/* Top crown facets gradient */}
      <linearGradient id="gemCrownGrad" x1="4" y1="4" x2="28" y2="13" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="30%" stopColor="#E0F7FA" />
        <stop offset="70%" stopColor="#80DEEA" />
        <stop offset="100%" stopColor="#26C6DA" />
      </linearGradient>

      {/* Main pavilion body gradient */}
      <linearGradient id="gemPavilionGrad" x1="4" y1="12" x2="28" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#26C6DA" />
        <stop offset="35%" stopColor="#00ACC1" />
        <stop offset="75%" stopColor="#00838F" />
        <stop offset="100%" stopColor="#004D40" />
      </linearGradient>

      {/* Center facet brilliance light */}
      <linearGradient id="gemCenterBeam" x1="16" y1="12" x2="16" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#E0F7FA" stopOpacity="0.9" />
        <stop offset="60%" stopColor="#26C6DA" stopOpacity="0.75" />
        <stop offset="100%" stopColor="#006064" stopOpacity="0.9" />
      </linearGradient>

      {/* Left reflector facet */}
      <linearGradient id="gemLeftReflect" x1="4" y1="12" x2="16" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#80DEEA" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#00695C" stopOpacity="0.95" />
      </linearGradient>

      {/* Right reflector facet */}
      <linearGradient id="gemRightReflect" x1="28" y1="12" x2="16" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00BCD4" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#004D40" stopOpacity="0.95" />
      </linearGradient>
    </defs>

    {/* Outer Crystal Outline Base */}
    <polygon
      points="9,6 23,6 29,13 16,28 3,13"
      fill="url(#gemPavilionGrad)"
      stroke="#E0F7FA"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />

    {/* Left Pavilion Triangle */}
    <polygon points="3,13 16,13 16,28" fill="url(#gemLeftReflect)" />

    {/* Right Pavilion Triangle */}
    <polygon points="29,13 16,13 16,28" fill="url(#gemRightReflect)" />

    {/* Center Radiant Inverted Triangle */}
    <polygon points="10,13 22,13 16,28" fill="url(#gemCenterBeam)" />

    {/* Top Crown Facets */}
    <polygon points="9,6 23,6 26,13 6,13" fill="url(#gemCrownGrad)" opacity="0.95" />

    {/* Top-Center Mirror Table */}
    <polygon points="12,6 20,6 16,13" fill="#FFFFFF" opacity="0.9" />

    {/* Top Left Facet */}
    <polygon points="9,6 12,6 16,13 6,13" fill="#B2EBF2" opacity="0.75" />

    {/* Top Right Facet */}
    <polygon points="20,6 23,6 26,13 16,13" fill="#4DD0E1" opacity="0.85" />

    {/* High-glaze specular shine point on top edge */}
    <circle cx="16" cy="6.8" r="1.1" fill="#FFFFFF" />
  </svg>
);

/**
 * Admin-controlled seller badges:
 * - diamond_seller: 3D animated crystal gem with horizontal light sheen, neon pulse glow, and twinkle
 * - official: blue verified-style "Official Coin Seller"
 * - paylor: gold coin "Paylor Coin Seller"
 */
export const SellerBadge = ({
  sellerType,
  className = '',
  showLabel = false,
  size = 'sm',
}: SellerBadgeProps) => {
  if (!sellerType || sellerType === 'none') return null;

  if (sellerType === 'diamond_seller') {
    const emblemSize =
      size === 'xs' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
    const textPad =
      size === 'xs'
        ? 'h-[18px] px-1.5 gap-1 text-[8.5px]'
        : size === 'lg'
        ? 'h-[27px] px-3 gap-1.5 text-[11px]'
        : 'h-[22px] px-2.5 gap-1 text-[9.5px]';

    return (
      <span
        title="Certified Diamond Seller • Official Merchant"
        className={`inline-flex items-center select-none shrink-0 ${
          showLabel
            ? `relative overflow-hidden rounded-full bg-gradient-to-r from-[#031d33] via-[#073b57] to-[#03233c] border border-cyan-300/80 animate-diamond-glow shadow-[0_0_12px_rgba(6,182,212,0.65)] ${textPad}`
            : 'relative p-0.5 rounded-full bg-cyan-950/70 border border-cyan-300/80 animate-diamond-glow shadow-[0_0_10px_rgba(34,211,238,0.7)]'
        } ${className}`}
      >
        {/* Animated Sweeping Light Beam (Sheen) */}
        <span
          className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/45 to-transparent pointer-events-none animate-diamond-shimmer"
          style={{ mixBlendMode: 'overlay' }}
        />

        {/* 3D Multi-faceted Crystal Emblem with floating animation */}
        <span className="relative z-10 flex items-center justify-center animate-diamond-float">
          <AnimatedDiamondEmblem className={emblemSize} />
        </span>

        {/* Twinkling Sparkle Star Overlay */}
        <span
          className="absolute -top-1 -right-0.5 text-cyan-200 pointer-events-none animate-diamond-sparkle text-[9px] drop-shadow-[0_0_4px_rgba(34,211,238,0.9)]"
          style={{ zIndex: 12 }}
        >
          ✦
        </span>

        {showLabel && (
          <span className="relative z-10 flex items-center gap-1 font-black uppercase tracking-wider bg-gradient-to-r from-white via-cyan-100 to-sky-300 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
            <span>DIAMOND SELLER</span>
            <span className="animate-diamond-sparkle text-cyan-300 text-[10px] leading-none">
              ✨
            </span>
          </span>
        )}
      </span>
    );
  }

  if (sellerType === 'official') {
    return (
      <span
        title="Official Coin Seller"
        className={`inline-flex items-center gap-1 shrink-0 ${className}`}
      >
        <BadgeCheck className="w-4 h-4 text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]" />
        {showLabel && (
          <span className="text-[10px] font-bold text-sky-400 bg-sky-400/10 border border-sky-400/30 rounded-full px-1.5 py-0.5 leading-none">
            Official
          </span>
        )}
      </span>
    );
  }

  if (sellerType === 'paylor') {
    return (
      <span
        title="Paylor Coin Seller"
        className={`inline-flex items-center gap-1 shrink-0 ${className}`}
      >
        <Coins className="w-4 h-4 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
        {showLabel && (
          <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-full px-1.5 py-0.5 leading-none">
            Paylor
          </span>
        )}
      </span>
    );
  }

  return null;
};
