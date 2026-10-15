export type AgencyTier = 'starter' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface AgencyTierConfig {
  tier: AgencyTier;
  label: string;
  agencyPercent: number; // 4, 8, 12, 16, 18, 20
  adminPercent: number;  // 26, 22, 18, 14, 12, 10
  hostPercent: number;   // 70
  minHosts: number;
  criteria: string;
  milestoneDescription: string;
}

const LEVEL_COMMISSIONS: Record<number, number> = {
  1: 4,
  2: 6,
  3: 8,
  4: 10,
  5: 12,
  6: 14,
  7: 16,
  8: 18,
  9: 19,
  10: 20,
};

export function getAgencyCommissionByLevel(level: number = 1): number {
  const lvl = Math.max(1, Math.floor(level || 1));
  if (lvl >= 10) return 20;
  return LEVEL_COMMISSIONS[lvl] ?? 4;
}

export const AGENCY_TIERS: Record<AgencyTier, AgencyTierConfig> = {
  starter: {
    tier: 'starter',
    label: 'Starter',
    agencyPercent: 4,
    adminPercent: 26,
    hostPercent: 70,
    minHosts: 2,
    criteria: 'Agency opening with at least 2 hosts (Host 70%, Admin 26%, Agency 4%)',
    milestoneDescription: 'Unlocked upon opening agency with 2+ hosts',
  },
  bronze: {
    tier: 'bronze',
    label: 'Bronze',
    agencyPercent: 8,
    adminPercent: 22,
    hostPercent: 70,
    minHosts: 5,
    criteria: '5 active hosts + 7-day host milestone (Host 70%, Admin 22%, Agency 8%)',
    milestoneDescription: '5 active hosts with 7-day milestone completed',
  },
  silver: {
    tier: 'silver',
    label: 'Silver',
    agencyPercent: 12,
    adminPercent: 18,
    hostPercent: 70,
    minHosts: 20,
    criteria: '20 active hosts + 30-day milestone + team revenue & retention (Host 70%, Admin 18%, Agency 12%)',
    milestoneDescription: '20 active hosts with 30-day milestone, team revenue target and 7+ day retention',
  },
  gold: {
    tier: 'gold',
    label: 'Gold',
    agencyPercent: 16,
    adminPercent: 14,
    hostPercent: 70,
    minHosts: 50,
    criteria: '50 active hosts + 30+90 day milestone + quality score (Host 70%, Admin 14%, Agency 16%)',
    milestoneDescription: '50 active hosts with 30+90 day milestone and high quality score',
  },
  platinum: {
    tier: 'platinum',
    label: 'Platinum',
    agencyPercent: 18,
    adminPercent: 12,
    hostPercent: 70,
    minHosts: 100,
    criteria: '100 active hosts + high team revenue + leaderboard presence (Host 70%, Admin 12%, Agency 18%)',
    milestoneDescription: '100 active hosts, high team revenue, and featured on the leaderboard',
  },
  diamond: {
    tier: 'diamond',
    label: 'Diamond',
    agencyPercent: 20,
    adminPercent: 10,
    hostPercent: 70,
    minHosts: 100,
    criteria: '100+ active hosts + top performance + weekly/monthly top leaderboard + elite rank (Host 70%, Admin 10%, Agency 20%)',
    milestoneDescription: '100+ active hosts, top performance, weekly/monthly #1 leaderboard and elite rank',
  },
};

export const TIER_ORDER: AgencyTier[] = ['starter', 'bronze', 'silver', 'gold', 'platinum', 'diamond'];

/**
 * Resolves the agency's tier configuration.
 * Checks explicit agency.tier first, then fallback to commission-based or host-count/milestone evaluation.
 */
export function resolveAgencyTier(agency?: {
  tier?: AgencyTier | string;
  commission?: number;
  hosts?: any[];
  totalContribution?: number;
} | null): AgencyTierConfig {
  if (!agency) {
    return AGENCY_TIERS.starter;
  }

  // 1. Explicit valid tier field
  if (agency.tier && AGENCY_TIERS[agency.tier as AgencyTier]) {
    return AGENCY_TIERS[agency.tier as AgencyTier];
  }

  // 2. Custom commission matching a tier percentage
  if (typeof agency.commission === 'number') {
    if (agency.commission >= 20) return AGENCY_TIERS.diamond;
    if (agency.commission >= 18) return AGENCY_TIERS.platinum;
    if (agency.commission >= 16) return AGENCY_TIERS.gold;
    if (agency.commission >= 12) return AGENCY_TIERS.silver;
    if (agency.commission >= 8) return AGENCY_TIERS.bronze;
    if (agency.commission >= 4) return AGENCY_TIERS.starter;
  }

  // 3. Fallback evaluation based on host count & contribution
  const hostCount = Array.isArray(agency.hosts) ? agency.hosts.length : 0;
  const contrib = agency.totalContribution || 0;

  if (hostCount >= 100 && contrib >= 5000000) {
    return AGENCY_TIERS.diamond;
  }
  if (hostCount >= 100) {
    return AGENCY_TIERS.platinum;
  }
  if (hostCount >= 50) {
    return AGENCY_TIERS.gold;
  }
  if (hostCount >= 20) {
    return AGENCY_TIERS.silver;
  }
  if (hostCount >= 5) {
    return AGENCY_TIERS.bronze;
  }

  return AGENCY_TIERS.starter;
}

/**
 * Calculates coin distribution for a gift:
 * Receiver (Host) gets 70% in coins (1 diamond = 1 coin).
 * The remaining 30% is split between Agency (Agent) and Admin according to agency tier:
 * - Starter: Agency 4%, Admin 26%
 * - Bronze: Agency 8%, Admin 22%
 * - Silver: Agency 12%, Admin 18%
 * - Gold: Agency 16%, Admin 14%
 * - Platinum: Agency 18%, Admin 12%
 * - Diamond: Agency 20%, Admin 10%
 * - No Agency: Agency 0%, Admin 30%
 */
export function calculateGiftCoinDistribution(
  totalCostDiamonds: number,
  agency?: {
    level?: number;
    tier?: AgencyTier | string;
    commission?: number;
    hosts?: any[];
    totalContribution?: number;
    isBanned?: boolean;
  } | null
) {
  const hostCoins = Math.floor(totalCostDiamonds * 0.70);

  if (!agency || agency.isBanned) {
    const adminCoins = totalCostDiamonds - hostCoins;
    return {
      hostCoins,
      agencyCoins: 0,
      adminCoins,
      agencyTier: null,
      tierConfig: null,
      hostShareRate: 0.70,
      agencyShareRate: 0,
      adminShareRate: 0.30,
    };
  }

  // Calculate dynamic commission percentage based on agency level
  const agencyLevel = agency.level || 1;
  const agencyPercent = getAgencyCommissionByLevel(agencyLevel);
  const agencyShareRate = agencyPercent / 100;
  const adminShareRate = Math.max(0, 0.30 - agencyShareRate);

  const agencyCoins = Math.floor(totalCostDiamonds * agencyShareRate);
  // Admin receives exact remaining balance to prevent rounding leak
  const adminCoins = totalCostDiamonds - hostCoins - agencyCoins;

  const tierConfig = resolveAgencyTier(agency);

  return {
    hostCoins,
    agencyCoins,
    adminCoins,
    agencyTier: tierConfig.tier,
    tierConfig,
    hostShareRate: 0.70,
    agencyShareRate,
    adminShareRate,
  };
}
