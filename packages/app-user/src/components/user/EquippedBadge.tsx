import React from 'react';
import { getMediaUrl } from '../../lib/media';

export interface EquippedBadgeData {
  _id?: string;
  name?: string;
  image?: string;
  preview?: string;
  rarity?: string;
}

interface EquippedBadgeProps {
  badge?: EquippedBadgeData | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 3D High-Definition Vector Badge Emblems
 * ───────────────────────────────────────────────────────────────────────────── */

export const DragonEmblem = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={`shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="dragonGoldGrad" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF275" />
        <stop offset="35%" stopColor="#FFD700" />
        <stop offset="70%" stopColor="#E69500" />
        <stop offset="100%" stopColor="#8C4D00" />
      </linearGradient>
      <linearGradient id="dragonHornGrad" x1="10" y1="2" x2="24" y2="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="50%" stopColor="#FFE57F" />
        <stop offset="100%" stopColor="#D48800" />
      </linearGradient>
      <linearGradient id="dragonGemGrad" x1="14" y1="12" x2="18" y2="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF6B6B" />
        <stop offset="100%" stopColor="#D90429" />
      </linearGradient>
    </defs>
    {/* Dragon Wings / Mane */}
    <path d="M4 14C4 10 8 4 16 3C24 4 28 10 28 14C28 20 22 28 16 30C10 28 4 20 4 14Z" fill="url(#dragonGoldGrad)" />
    {/* Inner Dragon Crest / Armor Plate */}
    <path d="M7 14C7 11 10 6 16 5C22 6 25 11 25 14C25 19 20 26 16 28C12 26 7 19 7 14Z" fill="#1C0F02" />
    {/* Golden Dragon Horns */}
    <path d="M16 7L13 2L15 8L10 6L14 11L7 10L13 14L16 9L19 14L25 10L18 11L22 6L17 8L19 2L16 7Z" fill="url(#dragonHornGrad)" />
    {/* Dragon Face Contour */}
    <path d="M12 15C12 13 14 11 16 11C18 11 20 13 20 15L18 22L16 24L14 22L12 15Z" fill="url(#dragonGoldGrad)" />
    {/* Ruby Dragon Eyes */}
    <circle cx="14" cy="15" r="1.3" fill="url(#dragonGemGrad)" />
    <circle cx="18" cy="15" r="1.3" fill="url(#dragonGemGrad)" />
    {/* Forehead Imperial Diamond */}
    <polygon points="16,10 17.5,12 16,14 14.5,12" fill="#FFFFFF" />
    {/* Golden Whiskers */}
    <path d="M13 20C10 21 8 24 6 23" stroke="#FFD700" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M19 20C22 21 24 24 26 23" stroke="#FFD700" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export const CrownEmblem = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={`shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="crownGrad" x1="2" y1="4" x2="30" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF59D" />
        <stop offset="30%" stopColor="#FFD54F" />
        <stop offset="70%" stopColor="#FFA000" />
        <stop offset="100%" stopColor="#FF6F00" />
      </linearGradient>
    </defs>
    <path d="M3 11L8 23H24L29 11L21 16L16 6L11 16L3 11Z" fill="url(#crownGrad)" stroke="#FFE082" strokeWidth="0.8" strokeLinejoin="round" />
    <rect x="7" y="23" width="18" height="4" rx="1.5" fill="url(#crownGrad)" stroke="#FFE082" strokeWidth="0.8" />
    {/* Jewels */}
    <circle cx="16" cy="6" r="2.2" fill="#FFFFFF" />
    <circle cx="3" cy="11" r="1.8" fill="#FF5252" />
    <circle cx="29" cy="11" r="1.8" fill="#FF5252" />
    <circle cx="11" cy="25" r="1.2" fill="#00E5FF" />
    <circle cx="16" cy="25" r="1.4" fill="#FF5252" />
    <circle cx="21" cy="25" r="1.2" fill="#00E5FF" />
  </svg>
);

export const DiamondEmblem = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={`shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gemTop" x1="4" y1="4" x2="28" y2="12" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#80DEEA" />
      </linearGradient>
      <linearGradient id="gemBot" x1="4" y1="12" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#26C6DA" />
        <stop offset="60%" stopColor="#0097A7" />
        <stop offset="100%" stopColor="#006064" />
      </linearGradient>
    </defs>
    <polygon points="9,6 23,6 29,13 16,28 3,13" fill="url(#gemBot)" stroke="#E0F7FA" strokeWidth="0.8" strokeLinejoin="round" />
    <polygon points="9,6 23,6 26,13 6,13" fill="url(#gemTop)" />
    <polygon points="16,13 26,13 16,28" fill="#00ACC1" opacity="0.8" />
    <polygon points="16,13 6,13 16,28" fill="#00838F" opacity="0.9" />
    <polygon points="12,6 20,6 16,13" fill="#FFFFFF" opacity="0.9" />
  </svg>
);

export const FlameEmblem = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={`shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="flameOuter" x1="4" y1="3" x2="28" y2="29" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF9100" />
        <stop offset="50%" stopColor="#FF3D00" />
        <stop offset="100%" stopColor="#DD2C00" />
      </linearGradient>
      <linearGradient id="flameInner" x1="10" y1="10" x2="22" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFF00" />
        <stop offset="60%" stopColor="#FFAB00" />
        <stop offset="100%" stopColor="#FF6D00" />
      </linearGradient>
    </defs>
    <path d="M16 2C16 2 20 8 20 12C20 14 19 15 18 16C22 14 26 18 26 22C26 26.5 21.5 30 16 30C10.5 30 6 26.5 6 22C6 17 11 11 11 11C11 11 12 15 14 15C14 12 16 2 16 2Z" fill="url(#flameOuter)" />
    <path d="M16 14C16 14 18 18 18 20C18 21.5 17 22 16 23C19 22 21 24 21 25.5C21 27.5 18.8 29 16 29C13.2 29 11 27.5 11 25.5C11 23 13.5 19.5 13.5 19.5C13.5 19.5 14 21.5 15 21.5C15 20 16 14 16 14Z" fill="url(#flameInner)" />
    <circle cx="16" cy="26" r="2" fill="#FFFFFF" opacity="0.9" />
  </svg>
);

export const StarEmblem = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={`shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="starGrad" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF9C4" />
        <stop offset="40%" stopColor="#FFD54F" />
        <stop offset="80%" stopColor="#FFB300" />
        <stop offset="100%" stopColor="#FF8F00" />
      </linearGradient>
    </defs>
    <polygon points="16,2 20.5,11.5 31,12.5 23,19.5 25.5,30 16,24.5 6.5,30 9,19.5 1,12.5 11.5,11.5" fill="url(#starGrad)" stroke="#FFF59D" strokeWidth="0.8" strokeLinejoin="round" />
    <polygon points="16,2 20.5,11.5 16,18 11.5,11.5" fill="#FFFFFF" opacity="0.85" />
    <circle cx="16" cy="15" r="2.5" fill="#FFFFFF" />
  </svg>
);

export const FalconEmblem = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={`shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="falconGrad" x1="2" y1="4" x2="30" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE082" />
        <stop offset="50%" stopColor="#FFA000" />
        <stop offset="100%" stopColor="#E65100" />
      </linearGradient>
    </defs>
    <path d="M16 3L11 9L4 7L8 15L2 19L9 22L7 29L16 25L25 29L23 22L30 19L24 15L28 7L21 9L16 3Z" fill="url(#falconGrad)" stroke="#FFE57F" strokeWidth="0.8" strokeLinejoin="round" />
    <path d="M16 9L13 14L16 19L19 14L16 9Z" fill="#FFFFFF" opacity="0.9" />
    <circle cx="16" cy="14" r="1.5" fill="#D50000" />
  </svg>
);

export const ShieldEmblem = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={`shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shieldGrad" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#E0E0E0" />
        <stop offset="50%" stopColor="#9E9E9E" />
        <stop offset="100%" stopColor="#616161" />
      </linearGradient>
      <linearGradient id="shieldGold" x1="8" y1="6" x2="24" y2="26" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFD54F" />
        <stop offset="100%" stopColor="#FF8F00" />
      </linearGradient>
    </defs>
    <path d="M16 2L6 6V15C6 22 10.5 28 16 30C21.5 28 26 22 26 15V6L16 2Z" fill="url(#shieldGrad)" stroke="#FFFFFF" strokeWidth="1" />
    <path d="M16 5L9 8V15C9 20.5 12 25 16 27C20 25 23 20.5 23 15V8L16 5Z" fill="#1C1C1C" />
    <polygon points="16,8 19,14 22,14 17,18 19,24 16,20 13,24 15,18 10,14 13,14" fill="url(#shieldGold)" />
  </svg>
);

export const TrophyEmblem = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={`shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="trophyGrad" x1="4" y1="2" x2="28" y2="26" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF9C4" />
        <stop offset="40%" stopColor="#FFD54F" />
        <stop offset="80%" stopColor="#FFA000" />
        <stop offset="100%" stopColor="#FF6F00" />
      </linearGradient>
    </defs>
    <path d="M8 4H24V14C24 18.5 20.5 22 16 22C11.5 22 8 18.5 8 14V4Z" fill="url(#trophyGrad)" stroke="#FFE082" strokeWidth="0.8" />
    <path d="M8 7H4C4 11 6 14 8 15V7Z" fill="url(#trophyGrad)" />
    <path d="M24 7H28C28 11 26 14 24 15V7Z" fill="url(#trophyGrad)" />
    <rect x="14" y="22" width="4" height="5" fill="url(#trophyGrad)" />
    <rect x="10" y="27" width="12" height="3" rx="1" fill="#424242" stroke="#FFD54F" strokeWidth="0.8" />
    <polygon points="16,9 17.5,12 20.5,12 18,14 19,17 16,15 13,17 14,14 11.5,12 14.5,12" fill="#FFFFFF" />
  </svg>
);

export const ThunderEmblem = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={`shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="thunderGrad" x1="6" y1="2" x2="26" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="30%" stopColor="#FFF176" />
        <stop offset="70%" stopColor="#FFD600" />
        <stop offset="100%" stopColor="#FF9100" />
      </linearGradient>
    </defs>
    <polygon points="18,2 6,17 15,17 12,30 26,13 17,13" fill="url(#thunderGrad)" stroke="#FFFDE7" strokeWidth="0.8" strokeLinejoin="round" />
  </svg>
);

export const SakuraEmblem = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={`shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="sakuraGrad" cx="16" cy="16" r="14" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="40%" stopColor="#F8BBD0" />
        <stop offset="80%" stopColor="#EC407A" />
        <stop offset="100%" stopColor="#C2185B" />
      </radialGradient>
    </defs>
    <circle cx="16" cy="8" r="5" fill="url(#sakuraGrad)" />
    <circle cx="23" cy="13" r="5" fill="url(#sakuraGrad)" />
    <circle cx="20" cy="22" r="5" fill="url(#sakuraGrad)" />
    <circle cx="12" cy="22" r="5" fill="url(#sakuraGrad)" />
    <circle cx="9" cy="13" r="5" fill="url(#sakuraGrad)" />
    <circle cx="16" cy="16" r="3.5" fill="#FFEB3B" />
  </svg>
);

export const RocketEmblem = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={`shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="rocketGrad" x1="8" y1="2" x2="24" y2="26" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="60%" stopColor="#90CAF9" />
        <stop offset="100%" stopColor="#1565C0" />
      </linearGradient>
    </defs>
    <path d="M16 2C16 2 23 8 23 18L16 24L9 18C9 8 16 2 16 2Z" fill="url(#rocketGrad)" stroke="#E3F2FD" strokeWidth="0.8" />
    <circle cx="16" cy="12" r="2.5" fill="#00E5FF" stroke="#FFFFFF" strokeWidth="0.8" />
    <polygon points="9,18 4,23 9,23" fill="#D32F2F" />
    <polygon points="23,18 28,23 23,23" fill="#D32F2F" />
    <polygon points="14,24 16,30 18,24" fill="#FF9100" />
  </svg>
);

export const FleurEmblem = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={`shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fleurGrad" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF59D" />
        <stop offset="50%" stopColor="#FFCA28" />
        <stop offset="100%" stopColor="#FF8F00" />
      </linearGradient>
    </defs>
    <path d="M16 3C14 8 11 12 11 16C13 16 15 14 16 11C17 14 19 16 21 16C21 12 18 8 16 3Z" fill="url(#fleurGrad)" />
    <path d="M6 14C8 16 11 18 11 19C9 20 6 20 4 17C3 15 4 13 6 14Z" fill="url(#fleurGrad)" />
    <path d="M26 14C24 16 21 18 21 19C23 20 26 20 28 17C29 15 28 13 26 14Z" fill="url(#fleurGrad)" />
    <rect x="9" y="19" width="14" height="2.5" rx="1" fill="#FFF9C4" stroke="#FF8F00" strokeWidth="0.6" />
    <path d="M13 22C13 26 16 29 16 29C16 29 19 26 19 22H13Z" fill="url(#fleurGrad)" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────────
 * Emblem Resolver: Resolves matching 3D emblem by name / keyword
 * ───────────────────────────────────────────────────────────────────────────── */

function renderBadgeEmblem(name: string, rawIcon: string, iconClass: string) {
  const norm = (name + ' ' + rawIcon).toLowerCase();

  if (norm.includes('dragon')) return <DragonEmblem className={iconClass} />;
  if (norm.includes('crown') || norm.includes('monarch') || norm.includes('king') || norm.includes('queen')) return <CrownEmblem className={iconClass} />;
  if (norm.includes('diamond') || norm.includes('vip elite') || norm.includes('gem') || norm.includes('crystal')) return <DiamondEmblem className={iconClass} />;
  if (norm.includes('inferno') || norm.includes('fire') || norm.includes('flame')) return <FlameEmblem className={iconClass} />;
  if (norm.includes('star') || norm.includes('stellar')) return <StarEmblem className={iconClass} />;
  if (norm.includes('falcon') || norm.includes('eagle') || norm.includes('hawk') || norm.includes('bird')) return <FalconEmblem className={iconClass} />;
  if (norm.includes('shield') || norm.includes('guardian') || norm.includes('protect')) return <ShieldEmblem className={iconClass} />;
  if (norm.includes('champion') || norm.includes('trophy') || norm.includes('cup') || norm.includes('winner')) return <TrophyEmblem className={iconClass} />;
  if (norm.includes('thunder') || norm.includes('lightning') || norm.includes('bolt') || norm.includes('electric')) return <ThunderEmblem className={iconClass} />;
  if (norm.includes('sakura') || norm.includes('princess') || norm.includes('flower') || norm.includes('rose') || norm.includes('blossom')) return <SakuraEmblem className={iconClass} />;
  if (norm.includes('voyager') || norm.includes('rocket') || norm.includes('space') || norm.includes('cosmic')) return <RocketEmblem className={iconClass} />;
  if (norm.includes('fleur') || norm.includes('royal') || norm.includes('noble')) return <FleurEmblem className={iconClass} />;

  // Fallback to Crown
  return <CrownEmblem className={iconClass} />;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Luxury Theme Styler
 * ───────────────────────────────────────────────────────────────────────────── */

interface BadgeThemeConfig {
  capsuleBg: string;
  capsuleBorder: string;
  textStyle: string;
  glowShadow: string;
}

function resolveBadgeTheme(name: string, rarity: string): BadgeThemeConfig {
  const norm = (name + ' ' + rarity).toLowerCase();

  // 1. Dragon / Imperial Obsidian Gold
  if (norm.includes('dragon') || norm.includes('emperor') || norm.includes('imperial')) {
    return {
      capsuleBg: 'bg-gradient-to-r from-[#1A0A02] via-[#381B05] to-[#170801]',
      capsuleBorder: 'border-[#F59E0B]',
      textStyle: 'text-transparent bg-clip-text bg-gradient-to-b from-[#FFFFFF] via-[#FDE68A] to-[#F59E0B]',
      glowShadow: 'shadow-[0_2px_10px_rgba(0,0,0,0.6),0_0_10px_rgba(245,158,11,0.5),inset_0_1px_1px_rgba(255,255,255,0.45)]',
    };
  }

  // 2. Crown / Monarch / Sovereign Gold
  if (norm.includes('crown') || norm.includes('monarch') || norm.includes('king') || norm.includes('champion') || norm.includes('trophy')) {
    return {
      capsuleBg: 'bg-gradient-to-r from-[#1F1401] via-[#3E2905] to-[#1A1001]',
      capsuleBorder: 'border-[#FBBF24]',
      textStyle: 'text-transparent bg-clip-text bg-gradient-to-b from-[#FFFFFF] via-[#FEF08A] to-[#EAB308]',
      glowShadow: 'shadow-[0_2px_10px_rgba(0,0,0,0.6),0_0_10px_rgba(251,191,36,0.5),inset_0_1px_1px_rgba(255,255,255,0.45)]',
    };
  }

  // 3. Diamond / VIP Elite / Sapphire Cyan
  if (norm.includes('diamond') || norm.includes('vip') || norm.includes('crystal') || norm.includes('sapphire')) {
    return {
      capsuleBg: 'bg-gradient-to-r from-[#031526] via-[#082E4D] to-[#02101C]',
      capsuleBorder: 'border-[#38BDF8]',
      textStyle: 'text-transparent bg-clip-text bg-gradient-to-b from-[#FFFFFF] via-[#BAE6FD] to-[#38BDF8]',
      glowShadow: 'shadow-[0_2px_10px_rgba(0,0,0,0.6),0_0_10px_rgba(56,189,248,0.5),inset_0_1px_1px_rgba(255,255,255,0.45)]',
    };
  }

  // 4. Inferno / Fire / Flame / Crimson Ruby
  if (norm.includes('inferno') || norm.includes('fire') || norm.includes('flame')) {
    return {
      capsuleBg: 'bg-gradient-to-r from-[#240404] via-[#4D0A0A] to-[#1F0303]',
      capsuleBorder: 'border-[#FB7185]',
      textStyle: 'text-transparent bg-clip-text bg-gradient-to-b from-[#FFFFFF] via-[#FECDD3] to-[#F43F5E]',
      glowShadow: 'shadow-[0_2px_10px_rgba(0,0,0,0.6),0_0_10px_rgba(244,63,94,0.5),inset_0_1px_1px_rgba(255,255,255,0.45)]',
    };
  }

  // 5. Falcon / Shield / Emerald Jade
  if (norm.includes('falcon') || norm.includes('shield') || norm.includes('eagle') || norm.includes('guardian')) {
    return {
      capsuleBg: 'bg-gradient-to-r from-[#031C0D] via-[#073B1B] to-[#021409]',
      capsuleBorder: 'border-[#34D399]',
      textStyle: 'text-transparent bg-clip-text bg-gradient-to-b from-[#FFFFFF] via-[#A7F3D0] to-[#10B981]',
      glowShadow: 'shadow-[0_2px_10px_rgba(0,0,0,0.6),0_0_10px_rgba(52,211,153,0.5),inset_0_1px_1px_rgba(255,255,255,0.45)]',
    };
  }

  // 6. Sakura / Rose Princess
  if (norm.includes('sakura') || norm.includes('princess') || norm.includes('flower') || norm.includes('rose')) {
    return {
      capsuleBg: 'bg-gradient-to-r from-[#29081A] via-[#521235] to-[#210515]',
      capsuleBorder: 'border-[#F472B6]',
      textStyle: 'text-transparent bg-clip-text bg-gradient-to-b from-[#FFFFFF] via-[#FBCFE8] to-[#EC4899]',
      glowShadow: 'shadow-[0_2px_10px_rgba(0,0,0,0.6),0_0_10px_rgba(244,114,182,0.5),inset_0_1px_1px_rgba(255,255,255,0.45)]',
    };
  }

  // 7. Star / Cosmic / Thunder / Voyager / Amethyst
  if (norm.includes('star') || norm.includes('voyager') || norm.includes('thunder') || norm.includes('cosmic') || norm.includes('fleur')) {
    return {
      capsuleBg: 'bg-gradient-to-r from-[#170529] via-[#330B59] to-[#120321]',
      capsuleBorder: 'border-[#C084FC]',
      textStyle: 'text-transparent bg-clip-text bg-gradient-to-b from-[#FFFFFF] via-[#E9D5FF] to-[#A855F7]',
      glowShadow: 'shadow-[0_2px_10px_rgba(0,0,0,0.6),0_0_10px_rgba(192,132,252,0.5),inset_0_1px_1px_rgba(255,255,255,0.45)]',
    };
  }

  // Default Sovereign Luxury Gold
  return {
    capsuleBg: 'bg-gradient-to-r from-[#1F1401] via-[#3E2905] to-[#1A1001]',
    capsuleBorder: 'border-[#FBBF24]',
    textStyle: 'text-transparent bg-clip-text bg-gradient-to-b from-[#FFFFFF] via-[#FEF08A] to-[#EAB308]',
    glowShadow: 'shadow-[0_2px_10px_rgba(0,0,0,0.6),0_0_10px_rgba(251,191,36,0.5),inset_0_1px_1px_rgba(255,255,255,0.45)]',
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Main EquippedBadge Component
 * ───────────────────────────────────────────────────────────────────────────── */

export const EquippedBadge: React.FC<EquippedBadgeProps> = ({
  badge,
  size = 'sm',
  showLabel = true,
  className = '',
  onClick,
}) => {
  if (!badge || (!badge.image && !badge.preview && !badge.name)) return null;

  const rawSrc = badge.image || badge.preview || '';
  const badgeName = badge.name || 'Badge';
  const rarity = badge.rarity || 'legendary';

  const isCustomImage = Boolean(
    rawSrc &&
      (rawSrc.startsWith('http://') ||
        rawSrc.startsWith('https://') ||
        rawSrc.startsWith('data:') ||
        rawSrc.startsWith('/') ||
        rawSrc.startsWith('blob:') ||
        (rawSrc.includes('.') && rawSrc.length > 4))
  );

  const theme = resolveBadgeTheme(badgeName, rarity);

  // Sizing styles
  const dims =
    size === 'xs'
      ? 'h-[18px] px-1.5 gap-1 text-[9px]'
      : size === 'sm'
      ? 'h-[22px] px-2 gap-1.5 text-[10px]'
      : size === 'md'
      ? 'h-[26px] px-2.5 gap-1.5 text-[11px]'
      : 'h-[30px] px-3 gap-2 text-xs';

  const iconDims =
    size === 'xs'
      ? 'w-3 h-3'
      : size === 'sm'
      ? 'w-3.5 h-3.5'
      : size === 'md'
      ? 'w-4 h-4'
      : 'w-5 h-5';

  return (
    <span
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      title={badgeName}
      className={`relative inline-flex items-center rounded-full border border-solid font-black uppercase tracking-wider select-none shrink-0 overflow-hidden transition-all ${dims} ${theme.capsuleBg} ${theme.capsuleBorder} ${theme.glowShadow} ${
        onClick ? 'cursor-pointer active:scale-95 hover:brightness-110' : ''
      } ${className}`}
    >
      {/* Glossy Upper Light Reflex Overlay */}
      <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 via-white/10 to-transparent pointer-events-none rounded-t-full" />

      {/* 3D Emblem or Custom Upload Image */}
      {isCustomImage ? (
        <img
          src={getMediaUrl(rawSrc)}
          alt={badgeName}
          className={`${iconDims} object-contain shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]`}
          onError={(e: any) => {
            e.target.style.display = 'none';
          }}
        />
      ) : (
        renderBadgeEmblem(badgeName, rawSrc, iconDims)
      )}

      {/* High-Contrast Luxury Metallic Text */}
      {showLabel && (
        <span
          className={`relative z-10 font-extrabold tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] whitespace-nowrap ${theme.textStyle}`}
        >
          {badgeName}
        </span>
      )}
    </span>
  );
};
