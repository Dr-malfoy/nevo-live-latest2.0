import React from 'react';
import {
  PiCrownFill as Crown,
  PiSparkleFill as Sparkle,
  PiStarFill as Star,
  PiShieldStarFill as ShieldStar,
  PiFireFill as Fire,
  PiLightningFill as Lightning,
  PiDiamondsFourFill as Diamonds,
  PiMedalFill as Medal,
  PiTrophyFill as Trophy,
  PiBroadcastFill as Broadcast,
  PiCheckBold as Check,
  PiLockFill as Lock,
  PiUserBold as UserIcon,
} from 'react-icons/pi';
import type { LevelKind } from '../../api/progress.api';

export interface LevelBadgeTier {
  id: string;
  minLevel: number;
  maxLevel: number;
  title: string;
  shortTitle: string;
  subtitle: string;
  iconName: 'star' | 'shield' | 'wings' | 'crown' | 'fire' | 'diamond' | 'lightning' | 'mythic' | 'mic';
  gradient: string;
  borderGradient: string;
  glowColor: string;
  accentColor: string;
  bgGlow: string;
  benefits: string[];
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' | 'Transcendent' | 'Supreme';
}

export const WEALTH_BADGE_TIERS: LevelBadgeTier[] = [
  {
    id: 'w_novice',
    minLevel: 1,
    maxLevel: 9,
    title: 'Novice Star',
    shortTitle: 'Novice',
    subtitle: 'Beginner Supporter Tier',
    iconName: 'star',
    gradient: 'from-[#475569] via-[#64748B] to-[#334155]',
    borderGradient: 'from-[#94A3B8] via-[#E2E8F0] to-[#64748B]',
    glowColor: 'rgba(148, 163, 184, 0.35)',
    accentColor: '#94A3B8',
    bgGlow: 'bg-slate-500/20',
    rarity: 'Common',
    benefits: ['Novice Wealth Badge in chat', 'Highlighted name in room guest list', 'Access to level-up diamond gifts'],
  },
  {
    id: 'w_bronze',
    minLevel: 10,
    maxLevel: 19,
    title: 'Bronze Vanguard',
    shortTitle: 'Bronze',
    subtitle: 'Valued Contributor Tier',
    iconName: 'shield',
    gradient: 'from-[#78350F] via-[#B45309] to-[#92400E]',
    borderGradient: 'from-[#FDE68A] via-[#F59E0B] to-[#B45309]',
    glowColor: 'rgba(217, 119, 6, 0.45)',
    accentColor: '#F59E0B',
    bgGlow: 'bg-amber-600/25',
    rarity: 'Uncommon',
    benefits: ['Bronze Shield Badge in chat', 'Highlighted Bronze nickname frame', 'Silver room entry banner notification'],
  },
  {
    id: 'w_silver',
    minLevel: 20,
    maxLevel: 29,
    title: 'Silver Sovereign',
    shortTitle: 'Silver',
    subtitle: 'Elite Noble Supporter',
    iconName: 'wings',
    gradient: 'from-[#334155] via-[#64748B] to-[#1E293B]',
    borderGradient: 'from-[#FFFFFF] via-[#CBD5E1] to-[#64748B]',
    glowColor: 'rgba(203, 213, 225, 0.55)',
    accentColor: '#E2E8F0',
    bgGlow: 'bg-slate-300/25',
    rarity: 'Rare',
    benefits: ['Silver Wings Crest Badge', 'Sparkling Silver entry aura effect', 'Custom chat font highlight'],
  },
  {
    id: 'w_gold',
    minLevel: 30,
    maxLevel: 49,
    title: 'Gold Emperor',
    shortTitle: 'Gold',
    subtitle: 'Prestigious Imperial Patron',
    iconName: 'crown',
    gradient: 'from-[#B45309] via-[#F59E0B] to-[#D97706]',
    borderGradient: 'from-[#FEF08A] via-[#FDE047] to-[#CA8A04]',
    glowColor: 'rgba(234, 179, 8, 0.65)',
    accentColor: '#FACC15',
    bgGlow: 'bg-yellow-500/30',
    rarity: 'Epic',
    benefits: ['Imperial Gold Crown Badge', 'Full golden sports car animated entry', 'Exclusive gold-gradient chat bubble'],
  },
  {
    id: 'w_platinum',
    minLevel: 50,
    maxLevel: 69,
    title: 'Platinum Archon',
    shortTitle: 'Platinum',
    subtitle: 'Royal Archon Benefactor',
    iconName: 'lightning',
    gradient: 'from-[#4C1D95] via-[#7C3AED] to-[#5B21B6]',
    borderGradient: 'from-[#DDD6FE] via-[#C084FC] to-[#7C3AED]',
    glowColor: 'rgba(147, 51, 234, 0.7)',
    accentColor: '#C084FC',
    bgGlow: 'bg-purple-600/30',
    rarity: 'Legendary',
    benefits: ['Royal Archon Lightning Crest', 'Flying Castle Luxury 3D room mount', 'Server-wide level up fireworks event'],
  },
  {
    id: 'w_diamond',
    minLevel: 70,
    maxLevel: 89,
    title: 'Diamond Sovereign',
    shortTitle: 'Diamond',
    subtitle: 'Sovereign platform titan',
    iconName: 'diamond',
    gradient: 'from-[#0C4A6E] via-[#0284C7] to-[#0369A1]',
    borderGradient: 'from-[#E0F2FE] via-[#38BDF8] to-[#0284C7]',
    glowColor: 'rgba(14, 165, 233, 0.75)',
    accentColor: '#38BDF8',
    bgGlow: 'bg-sky-500/30',
    rarity: 'Mythic',
    benefits: ['Prismatic Diamond Crown Badge', 'Global server entry banner broadcast', 'Custom 3D animated room gift unlock'],
  },
  {
    id: 'w_cosmic',
    minLevel: 90,
    maxLevel: 99,
    title: 'Cosmic Overlord',
    shortTitle: 'Cosmic',
    subtitle: 'Galactic Dominator Tier',
    iconName: 'fire',
    gradient: 'from-[#701A75] via-[#C026D3] to-[#86198F]',
    borderGradient: 'from-[#FDF4FF] via-[#F472B6] to-[#C026D3]',
    glowColor: 'rgba(217, 70, 239, 0.8)',
    accentColor: '#F472B6',
    bgGlow: 'bg-fuchsia-600/35',
    rarity: 'Transcendent',
    benefits: ['Cosmic Starfire Aura & Badge', 'Top-tier VIP room crown in all streams', 'Platform manager direct hotline VIP service'],
  },
  {
    id: 'w_supreme',
    minLevel: 100,
    maxLevel: 100,
    title: 'Mythic Supreme God',
    shortTitle: 'Supreme',
    subtitle: 'Absolute Supreme Platform Ruler',
    iconName: 'mythic',
    gradient: 'from-[#831843] via-[#E11D48] to-[#9F1239]',
    borderGradient: 'from-[#FEF08A] via-[#F43F5E] to-[#BE123C]',
    glowColor: 'rgba(244, 63, 94, 0.9)',
    accentColor: '#FFD700',
    bgGlow: 'bg-rose-600/40',
    rarity: 'Supreme',
    benefits: ['Supreme God Mythic Crest with Dragon Wings', 'Server-shaking mythic entry animation', 'Permanent platform hall of fame status'],
  },
];

export const LIVESTREAM_BADGE_TIERS: LevelBadgeTier[] = [
  {
    id: 'ls_rookie',
    minLevel: 1,
    maxLevel: 9,
    title: 'Streamer Rookie',
    shortTitle: 'Rookie',
    subtitle: 'Newcomer Creator Tier',
    iconName: 'mic',
    gradient: 'from-[#1E293B] via-[#334155] to-[#0F172A]',
    borderGradient: 'from-[#94A3B8] via-[#CBD5E1] to-[#475569]',
    glowColor: 'rgba(148, 163, 184, 0.35)',
    accentColor: '#94A3B8',
    bgGlow: 'bg-slate-500/20',
    rarity: 'Common',
    benefits: ['Official Streamer Badge in live rooms', 'Highlighted broadcast status on profile', 'Access to room moderation tools'],
  },
  {
    id: 'ls_bronze',
    minLevel: 10,
    maxLevel: 19,
    title: 'Bronze Host',
    shortTitle: 'Bronze',
    subtitle: 'Active Live Broadcaster',
    iconName: 'shield',
    gradient: 'from-[#78350F] via-[#B45309] to-[#92400E]',
    borderGradient: 'from-[#FDE68A] via-[#F59E0B] to-[#B45309]',
    glowColor: 'rgba(217, 119, 6, 0.45)',
    accentColor: '#F59E0B',
    bgGlow: 'bg-amber-600/25',
    rarity: 'Uncommon',
    benefits: ['Bronze Broadcast Camera Frame', 'Glowing avatar aura in room header', 'Interactive live room sticker pack'],
  },
  {
    id: 'ls_silver',
    minLevel: 20,
    maxLevel: 29,
    title: 'Silver Spotlight',
    shortTitle: 'Silver',
    subtitle: 'Rising Star Streamer',
    iconName: 'wings',
    gradient: 'from-[#1E3A8A] via-[#2563EB] to-[#1D4ED8]',
    borderGradient: 'from-[#DBEAFE] via-[#93C5FD] to-[#3B82F6]',
    glowColor: 'rgba(59, 130, 246, 0.55)',
    accentColor: '#60A5FA',
    bgGlow: 'bg-blue-600/25',
    rarity: 'Rare',
    benefits: ['Silver Star Streamer Badge', '+5% Bonus conversion rate on gifts', 'Custom interactive stream soundboard'],
  },
  {
    id: 'ls_gold',
    minLevel: 30,
    maxLevel: 49,
    title: 'Gold Superhost',
    shortTitle: 'Gold',
    subtitle: 'Top Tier Broadcaster',
    iconName: 'crown',
    gradient: 'from-[#B45309] via-[#F59E0B] to-[#D97706]',
    borderGradient: 'from-[#FEF08A] via-[#FDE047] to-[#CA8A04]',
    glowColor: 'rgba(234, 179, 8, 0.65)',
    accentColor: '#FACC15',
    bgGlow: 'bg-yellow-500/30',
    rarity: 'Epic',
    benefits: ['Diamond Streamer Crown & Recommendation', 'Priority homepage stream boost', 'AR 3D Facial filters and studio effects'],
  },
  {
    id: 'ls_platinum',
    minLevel: 50,
    maxLevel: 69,
    title: 'Platinum Luminary',
    shortTitle: 'Platinum',
    subtitle: 'Platform Star Creator',
    iconName: 'lightning',
    gradient: 'from-[#065F46] via-[#059669] to-[#047857]',
    borderGradient: 'from-[#A7F3D0] via-[#34D399] to-[#059669]',
    glowColor: 'rgba(16, 185, 129, 0.7)',
    accentColor: '#34D399',
    bgGlow: 'bg-emerald-600/30',
    rarity: 'Legendary',
    benefits: ['Platinum Stage Luminary Crest', 'Star Ambassador platform creator contract', 'Platform-wide event promotional banners'],
  },
  {
    id: 'ls_diamond',
    minLevel: 70,
    maxLevel: 89,
    title: 'Diamond Sensation',
    shortTitle: 'Diamond',
    subtitle: 'Celebrity Streamer Tier',
    iconName: 'diamond',
    gradient: 'from-[#0C4A6E] via-[#0284C7] to-[#0369A1]',
    borderGradient: 'from-[#E0F2FE] via-[#38BDF8] to-[#0284C7]',
    glowColor: 'rgba(14, 165, 233, 0.75)',
    accentColor: '#38BDF8',
    bgGlow: 'bg-sky-500/30',
    rarity: 'Mythic',
    benefits: ['Diamond Sensation Wings Crest', 'Permanent 1080p 60fps Ultra HD broadcast', 'Priority live recommendation banner on explore'],
  },
  {
    id: 'ls_cosmic',
    minLevel: 90,
    maxLevel: 99,
    title: 'Astral Icon',
    shortTitle: 'Astral',
    subtitle: 'Global Phenomenon Host',
    iconName: 'fire',
    gradient: 'from-[#4C1D95] via-[#7C3AED] to-[#5B21B6]',
    borderGradient: 'from-[#DDD6FE] via-[#C084FC] to-[#7C3AED]',
    glowColor: 'rgba(147, 51, 234, 0.8)',
    accentColor: '#C084FC',
    bgGlow: 'bg-purple-600/35',
    rarity: 'Transcendent',
    benefits: ['Astral Nebula Broadcast Crown', 'Custom designed interactive gift for your room', 'VIP concierge account manager'],
  },
  {
    id: 'ls_supreme',
    minLevel: 100,
    maxLevel: 100,
    title: 'Platform Legend',
    shortTitle: 'Legend',
    subtitle: 'Hall of Fame Supreme Star',
    iconName: 'mythic',
    gradient: 'from-[#831843] via-[#E11D48] to-[#9F1239]',
    borderGradient: 'from-[#FEF08A] via-[#F43F5E] to-[#BE123C]',
    glowColor: 'rgba(244, 63, 94, 0.9)',
    accentColor: '#FFD700',
    bgGlow: 'bg-rose-600/40',
    rarity: 'Supreme',
    benefits: ['Legendary Hall of Fame Streamer Trophy', 'Custom server-wide animated gift in your name', 'Permanent Hall of Fame placement'],
  },
];

export function getBadgeTierForLevel(level: number, kind: LevelKind): LevelBadgeTier {
  const tiers = kind === 'livestream' ? LIVESTREAM_BADGE_TIERS : WEALTH_BADGE_TIERS;
  const val = Math.max(1, Math.min(100, Math.floor(level || 1)));
  return tiers.find((t) => val >= t.minLevel && val <= t.maxLevel) || tiers[0];
}

/**
 * High-End 3D Luxury Crest Emblem Component
 */
export const PremiumBadgeEmblem: React.FC<{
  tier: LevelBadgeTier;
  level?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLevel?: boolean;
  animated?: boolean;
}> = ({ tier, level, size = 'md', showLevel = true, animated = false }) => {
  const displayLevel = level ? Math.max(1, Math.floor(level)) : tier.minLevel;

  const dims =
    size === 'sm'
      ? 'w-10 h-10'
      : size === 'md'
      ? 'w-14 h-14'
      : size === 'lg'
      ? 'w-20 h-20'
      : 'w-28 h-28';

  const iconSize =
    size === 'sm'
      ? 'w-4 h-4'
      : size === 'md'
      ? 'w-6 h-6'
      : size === 'lg'
      ? 'w-8 h-8'
      : 'w-12 h-12';

  const levelBadgeStyle =
    size === 'sm'
      ? 'text-[8px] px-1 py-0 -bottom-1'
      : size === 'md'
      ? 'text-[10px] px-1.5 py-0.2 -bottom-1.5'
      : size === 'lg'
      ? 'text-xs px-2 py-0.5 -bottom-2'
      : 'text-sm px-3 py-1 -bottom-2.5';

  const renderIcon = () => {
    switch (tier.iconName) {
      case 'crown':
        return <Crown className={`${iconSize} drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`} style={{ color: tier.accentColor }} />;
      case 'wings':
        return <Diamonds className={`${iconSize} drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`} style={{ color: tier.accentColor }} />;
      case 'shield':
        return <ShieldStar className={`${iconSize} drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`} style={{ color: tier.accentColor }} />;
      case 'diamond':
        return <Sparkle className={`${iconSize} drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`} style={{ color: tier.accentColor }} />;
      case 'lightning':
        return <Lightning className={`${iconSize} drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`} style={{ color: tier.accentColor }} />;
      case 'fire':
        return <Fire className={`${iconSize} drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`} style={{ color: tier.accentColor }} />;
      case 'mythic':
        return <Trophy className={`${iconSize} drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] animate-bounce`} style={{ color: tier.accentColor }} />;
      case 'mic':
        return <Broadcast className={`${iconSize} drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`} style={{ color: tier.accentColor }} />;
      default:
        return <Star className={`${iconSize} drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`} style={{ color: tier.accentColor }} />;
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${dims}`}>
      {/* Outer Glow Halo */}
      <div
        className={`absolute inset-0 rounded-2xl blur-md opacity-80 pointer-events-none transition-all duration-500 ${
          animated ? 'animate-pulse' : ''
        }`}
        style={{ backgroundColor: tier.glowColor }}
      />

      {/* 3D Crest Outer Bevel Ring */}
      <div
        className={`relative w-full h-full rounded-2xl p-[2px] bg-gradient-to-br ${tier.borderGradient} shadow-xl flex items-center justify-center`}
      >
        {/* Inner Shield / Core Surface */}
        <div
          className={`w-full h-full rounded-[14px] bg-gradient-to-b ${tier.gradient} flex flex-col items-center justify-center relative overflow-hidden border border-white/20`}
        >
          {/* Top Surface Light Reflection */}
          <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

          {/* Central Tier Icon */}
          <div className="relative z-10">{renderIcon()}</div>

          {/* Particle Glints */}
          {size !== 'sm' && (
            <div className="absolute top-1 right-1">
              <Sparkle className="w-2.5 h-2.5 text-white/80 animate-ping" />
            </div>
          )}
        </div>
      </div>

      {/* Level Tag Capsule */}
      {showLevel && (
        <span
          className={`absolute rounded-full font-black text-white shadow-md border border-white/40 flex items-center justify-center z-20 ${levelBadgeStyle}`}
          style={{
            background: `linear-gradient(135deg, ${tier.accentColor}, #111827)`,
            boxShadow: `0 2px 8px ${tier.glowColor}`,
          }}
        >
          Lv.{displayLevel}
        </span>
      )}
    </div>
  );
};
