export interface RewardTier {
  count: number;          // minimum daily count (host's earned coins) for this tier
  rewardCoins: number;    // coins credited when claiming this tier
  requiredHours: number;  // minimum live hours that day to claim this tier
}

export interface RewardStatus {
  dateKey: string;          // today's Bangladesh date 'YYYY-MM-DD'
  cycleStart: string;       // ISO — start of current 7-day count cycle
  cycleEnd: string;         // ISO — end of current 7-day count cycle
  count: number;            // host's coins earned from gifts this 7-day cycle
  liveMinutes: number;      // minutes live today
  endedToday: boolean;      // whether host ended at least one stream today
  claimable: boolean;       // requirements met and not yet claimed today
  claimed: boolean;         // whether today already has a claim
  claimedTier: RewardTier | null;
  qualifiedTier: RewardTier | null;  // highest tier currently met
  nextTier: RewardTier | null;       // next tier the host is progressing toward
  tiers: RewardTier[];
  giftUserShare: number;
  giftAdminShare: number;
}

export interface DailyRewardConfigData {
  giftUserShare: number;
  giftAdminShare: number;
  tiers: RewardTier[];
  createdAt: string;
  updatedAt: string;
}
