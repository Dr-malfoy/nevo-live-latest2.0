import React from 'react';
import { levelTier } from '../../lib/levels';

interface LevelBadgeProps {
  level: number;
  /** `sm` for inline name rows, `md` for headers. */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Standard tier level badge
 */
export const LevelBadge = ({ level, size = 'sm', className = '' }: LevelBadgeProps) => {
  const tier = levelTier(level);
  const dims = size === 'sm' ? 'h-[18px] px-1.5 text-[10px]' : 'h-6 px-2 text-xs';

  return (
    <span
      title={`${tier.label} · Level ${level}`}
      className={`inline-flex items-center justify-center rounded-md font-bold leading-none shrink-0 ${dims} ${tier.pill} ${className}`}
    >
      Lv.{Math.max(1, Math.floor(level || 1))}
    </span>
  );
};

/**
 * Live Level Badge (Leaf capsule matching user mockup Image 2)
 */
export const LiveLevelPill = ({
  level,
  className = '',
  onClick,
}: {
  level: number;
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#82E62A] text-white text-xs font-black shadow-sm active:scale-95 transition-transform shrink-0 ${className}`}
      title={`Live Level ${level}`}
    >
      {/* Crisp Leaf Icon */}
      <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24">
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.52-13 4a19.78 19.78 0 0 0-5.87 3.33A7.54 7.54 0 0 1 8 8c3 0 6 0 9 0z" />
      </svg>
      <span>{Math.max(1, Math.floor(level || 1))}</span>
    </button>
  );
};

/**
 * Wealth Level Badge (Gold star capsule matching user mockup Image 2)
 */
export const WealthLevelPill = ({
  level,
  className = '',
  onClick,
}: {
  level: number;
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFCC00] text-amber-950 text-xs font-black shadow-sm active:scale-95 transition-transform shrink-0 ${className}`}
      title={`Wealth Level ${level}`}
    >
      {/* 4-point Sparkle Star */}
      <svg className="w-3.5 h-3.5 fill-current text-amber-900" viewBox="0 0 24 24">
        <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
      </svg>
      <span>{Math.max(1, Math.floor(level || 1))}</span>
    </button>
  );
};

/**
 * VIP Badge (Metallic Diamond pill matching user mockup Image 2)
 */
export const VipCapsule = ({
  label = 'VIP',
  className = '',
  onClick,
}: {
  label?: string;
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#DEE2E8] via-[#F4F6F9] to-[#BAC2CE] border border-white/80 text-[#333C48] shadow-sm select-none shrink-0 ${className}`}
    >
      {/* Diamond Icon */}
      <svg className="w-3.5 h-3.5 drop-shadow-sm" viewBox="0 0 24 24" fill="none">
        <polygon points="12,2 22,8.5 12,22 2,8.5" fill="url(#vipDiaGrad)" />
        <polygon points="12,2 17,8.5 12,22 7,8.5" fill="#FFFFFF" opacity="0.6" />
        <polygon points="7,8.5 12,8.5 12,22" fill="#99B3D6" opacity="0.7" />
        <polygon points="17,8.5 12,8.5 12,22" fill="#5F7C9E" opacity="0.6" />
        <defs>
          <linearGradient id="vipDiaGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#A4C2E6" />
            <stop offset="100%" stopColor="#6C8BB3" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-[11px] font-black italic tracking-wider leading-none text-[#2C3440]">
        {label}
      </span>
    </div>
  );
};
