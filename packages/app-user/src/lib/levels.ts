/**
 * Requirement #3C — the level tier system.
 *
 *   Lv 1–10   Beginner
 *   Lv 11–30  Rising
 *   Lv 31–50  Popular
 *   Lv 51+    Superstar
 */

export type LevelTierKey = 'beginner' | 'rising' | 'popular' | 'superstar';

export interface LevelTier {
  key: LevelTierKey;
  label: string;
  min: number;
  /** Exclusive upper bound; `Infinity` for the top tier. */
  max: number;
  /** Tailwind classes for the level pill. */
  pill: string;
  /** Tailwind text colour for tier labels on a white surface. */
  text: string;
}

export const LEVEL_TIERS: LevelTier[] = [
  {
    key: 'beginner',
    label: 'Beginner',
    min: 1,
    max: 26,
    pill: 'bg-[#9AA1AC] text-white',
    text: 'text-[#6B7280]',
  },
  {
    key: 'rising',
    label: 'Rising',
    min: 26,
    max: 51,
    pill: 'bg-gradient-to-r from-[#3EC6F0] to-[#2F80ED] text-white',
    text: 'text-[#2F80ED]',
  },
  {
    key: 'popular',
    label: 'Popular',
    min: 51,
    max: 76,
    pill: 'bg-gradient-to-r from-[#F5A623] to-[#F2761B] text-white',
    text: 'text-[#D97706]',
  },
  {
    key: 'superstar',
    label: 'Superstar',
    min: 76,
    max: 101,
    pill: 'bg-gradient-to-r from-[#B341F5] to-[#F2477B] text-white',
    text: 'text-[#B341F5]',
  },
];

export function levelTier(level?: number | null): LevelTier {
  const value = Math.min(100, Math.max(1, Math.floor(level || 1)));
  return LEVEL_TIERS.find((t) => value >= t.min && value < t.max) ?? LEVEL_TIERS[0];
}

/** Progress through the current tier, 0–1. The top tier always reads full. */
export function tierProgress(level?: number | null): number {
  const value = Math.max(1, Math.floor(level || 1));
  const tier = levelTier(value);
  if (tier.max === Infinity) return 1;
  return Math.min(1, Math.max(0, (value - tier.min) / (tier.max - tier.min)));
}

/** The level at which the next tier unlocks, or null at the top. */
export function nextTierAt(level?: number | null): number | null {
  const tier = levelTier(level);
  return tier.max === Infinity ? null : tier.max;
}

/* ── VIP / noble ─────────────────────────────────────────────────── */

/** Noble tiers map onto the VIP1–VIP4 badge shown next to the level. */
const VIP_RANK: Record<string, number> = {
  silver: 1,
  gold: 2,
  platinum: 3,
  diamond: 4,
};

const VIP_STYLE: Record<number, string> = {
  1: 'bg-gradient-to-r from-[#B9BFC9] to-[#8C94A1] text-white',
  2: 'bg-gradient-to-r from-[#F6C453] to-[#E0A83C] text-white',
  3: 'bg-gradient-to-r from-[#7ED8F2] to-[#2AB6E4] text-white',
  4: 'bg-gradient-to-r from-[#8B5CF6] to-[#5B5BF5] text-white',
};

export interface VipInfo {
  rank: number;
  label: string;
  pill: string;
}

/**
 * Resolve a noble grant into a VIP badge, or null when the user has none or
 * the grant has expired.
 */
export function vipInfo(noble?: { type?: string; expiry?: string } | null): VipInfo | null {
  if (!noble?.type) return null;
  if (noble.expiry && new Date(noble.expiry).getTime() < Date.now()) return null;

  const rank = VIP_RANK[noble.type] ?? 0;
  if (!rank) return null;

  return { rank, label: `VIP${rank}`, pill: VIP_STYLE[rank] };
}
