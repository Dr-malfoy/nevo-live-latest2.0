import React from 'react';
import { PiCrownFill as Crown, PiSparkleFill as Sparkle } from 'react-icons/pi';

export type HostBadgeType = 'alpha' | 'aurora' | 'none' | string | null | undefined;

export interface HostBadgeProps {
  badge?: HostBadgeType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  xs: {
    container: 'h-[17px] px-1.5 rounded-full text-[9px] gap-0.5',
    crown: 'w-2.5 h-2.5',
    icon: 'text-[9px] font-black',
    label: 'text-[8.5px] font-black tracking-wider',
  },
  sm: {
    container: 'h-[21px] px-2 rounded-full text-[10px] gap-1',
    crown: 'w-3 h-3',
    icon: 'text-[11px] font-black',
    label: 'text-[9.5px] font-black tracking-wider',
  },
  md: {
    container: 'h-[25px] px-2.5 rounded-full text-[11px] gap-1.5',
    crown: 'w-3.5 h-3.5',
    icon: 'text-[13px] font-black',
    label: 'text-[10.5px] font-black tracking-wider',
  },
  lg: {
    container: 'h-[29px] px-3 rounded-full text-xs gap-1.5',
    crown: 'w-4 h-4',
    icon: 'text-[15px] font-black',
    label: 'text-[11.5px] font-black tracking-wider',
  },
};

/**
 * Premium 3D Host Badges:
 * - ALPHA HOST (Male): α + Crown, Gold + Black (#FFD700 → #000000), 3D shimmer + pulse glow
 * - AURORA HOST (Female): Northern Light + Crown, Purple + Pink (#9B59B6 → #FF69B4), 3D shimmer + pulse glow
 */
export const HostBadge: React.FC<HostBadgeProps> = ({
  badge,
  size = 'sm',
  showLabel = true,
  className = '',
}) => {
  if (!badge || badge === 'none') return null;

  const cfg = sizeConfig[size] || sizeConfig.sm;

  if (badge === 'alpha') {
    return (
      <span
        title="ALPHA HOST • Premium Host Badge (+5% Earning Bonus)"
        className={`badge-alpha-3d inline-flex items-center select-none shadow-md cursor-default text-white shrink-0 ${cfg.container} ${className}`}
      >
        {/* α symbol with metallic gradient text */}
        <span
          className={`leading-none font-serif ${cfg.icon} text-amber-200 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]`}
          style={{ textShadow: '0 0 4px rgba(255,215,0,0.9)' }}
        >
          α
        </span>

        {/* 3D Crown Icon */}
        <Crown
          className={`${cfg.crown} text-yellow-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] shrink-0 animate-bounce`}
          style={{ animationDuration: '3s' }}
        />

        {showLabel && (
          <span className={`${cfg.label} text-yellow-100 uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)]`}>
            ALPHA HOST
          </span>
        )}
      </span>
    );
  }

  if (badge === 'aurora') {
    return (
      <span
        title="AURORA HOST • Premium Host Badge (+5% Earning Bonus)"
        className={`badge-aurora-3d inline-flex items-center select-none shadow-md cursor-default text-white shrink-0 ${cfg.container} ${className}`}
      >
        {/* Northern Light Sparkle Icon */}
        <Sparkle
          className={`${cfg.crown} text-pink-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] shrink-0 animate-pulse`}
          style={{ animationDuration: '2s' }}
        />

        {/* 3D Crown Icon */}
        <Crown
          className={`${cfg.crown} text-pink-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] shrink-0 animate-bounce`}
          style={{ animationDuration: '3.5s' }}
        />

        {showLabel && (
          <span className={`${cfg.label} text-pink-50 uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]`}>
            AURORA HOST
          </span>
        )}
      </span>
    );
  }

  return null;
};
