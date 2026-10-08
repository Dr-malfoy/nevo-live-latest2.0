import client from './client';
import type { ApiResponse } from '../types';

/**
 * Store, bag, games and the asset password.
 *
 * None of these endpoints exist yet — they are specified in BACKEND-GUIDE.md
 * §4.0, §4.2 and §4.13. Call them through `optional()` so a 404 degrades to a
 * documented fallback instead of an error.
 */

/* ── Store (#45–#49, #51) — §4.0 ──────────────────────────────────── */

export type StoreCategory =
  | 'badge'
  | 'popular'
  | 'honor'
  | 'rare_id'
  | 'ride'
  | 'profile_card'
  | 'avatar_frame'
  | 'party_theme'
  | 'chat_bubble';

export interface StoreItem {
  _id: string;
  category: StoreCategory;
  name: string;
  description?: string;
  image?: string;
  preview?: string;
  /** rare_id only — the id being sold, e.g. "40004". */
  displayId?: string;
  rarity?: 'SSR' | 'SR' | 'common' | 'rare' | 'epic' | 'legendary' | 'vip' | string | null;
  priceCoins?: number | null;
  priceDiamonds?: number | null;
  priceTickets?: number | null;
  durationDays?: number | null;
  badge?: 'NEW' | 'HOT' | string | null;
  giftable?: boolean;
  requiredHonorLevel?: number;
  dailyLimit?: number | null;
  monthlyLimit?: number | null;
  soldToday?: number;
  soldThisMonth?: number;
}

export interface BagItem {
  _id: string;
  itemId: string;
  category: StoreCategory;
  name: string;
  description?: string;
  icon?: string;
  image?: string;
  preview?: string;
  rarity?: string | null;
  displayId?: string | null;
  source?: 'purchased' | 'earned' | 'gift' | 'reward' | string;
  expiresAt?: string | null;
  acquiredAt?: string | null;
  equipped: boolean;
  isNew: boolean;
}

/* ── Games (#66–#70) — §4.13 ──────────────────────────────────────── */

export interface GameItem {
  key: string;
  name: string;
  icon?: string;
  color?: string;
  badge?: 'HOT' | 'NEW' | null;
  currency: 'diamond' | 'coupon';
  launchUrl?: string;
}

export interface SpinSlice {
  index: number;
  amount: number;
  currency: 'coin' | 'diamond' | 'ticket';
}

export interface LuckySpinState {
  slices: SpinSlice[];
  freeSpinAvailable: boolean;
  nextFreeSpinAt?: string | null;
  extraSpinCostCoins?: number;
}

export interface SpinResult {
  sliceIndex: number;
  reward: { amount: number; currency: string };
  balances?: { coins?: number; diamonds?: number; tickets?: number };
}

export interface ActivityTask {
  key: string;
  label: string;
  note?: string;
  metric: string;
  target: number;
  unit?: string;
  reward: {
    currency: 'coins' | 'diamonds';
    amount: number;
  };
  goTo?: string;
  actionLabel?: string;
  order: number;
  progress: number;
  state: 'todo' | 'claimable' | 'claimed';
}

export interface ActivityPrize {
  rankFrom: number;
  rankTo: number;
  amount: number;
  title?: string;
}

export interface ActivityItem {
  _id: string;
  key: string;
  title: string;
  tagline?: string;
  description?: string;
  banner?: string;
  badge?: string;
  prizePool: number;
  currency: 'coins' | 'diamonds' | 'coin' | 'diamond';
  startAt: string;
  endAt: string;
  status: 'ongoing' | 'closed';
  featured?: boolean;
  rules?: string[];
  rulesUrl?: string;
  prizes?: ActivityPrize[];
  tasks?: ActivityTask[];
  completedTasksCount?: number;
  totalTasksCount?: number;
  claimableCoins?: number;
  userStats?: {
    totalEarnedCoins: number;
    claimableCoins: number;
    completedCount: number;
  };
  note?: string;
}

export interface ActivityRewardRecord {
  _id: string;
  activityKey: string;
  activityTitle: string;
  taskKey: string;
  taskLabel: string;
  rewardAmount: number;
  currency: string;
  dateKey: string;
  claimedAt: string;
}

export interface GameWinner {
  nickname: string;
  avatar?: string;
  amount: number;
  currency: 'diamond' | 'coin';
  gameKey?: string;
}

export const storeApi = {
  getItems: (params: { category: StoreCategory; sort?: 'hot' | 'latest' | 'level'; page?: number }) =>
    client.get<ApiResponse<StoreItem[]>>('/store/items', { params }),

  getHonor: () =>
    client.get<ApiResponse<{ honorLevel: number; items: StoreItem[] }>>('/store/honor'),

  buy: (itemId: string, payWith: 'coins' | 'diamonds' | 'tickets', giftToUserId?: string) =>
    client.post<ApiResponse>('/store/buy', { itemId, payWith, giftToUserId }),

  getBag: () => client.get<ApiResponse<{ items: BagItem[]; hasNew: boolean }>>('/users/me/bag'),

  equip: (inventoryId: string, equipped: boolean) =>
    client.post<ApiResponse>(`/users/me/bag/${inventoryId}/equip`, { equipped }),
};

export const gamesApi = {
  list: () => client.get<ApiResponse<GameItem[]>>('/games'),

  home: () =>
    client.get<ApiResponse<{ games: GameItem[]; banner?: ActivityItem | null }>>('/games/home'),

  winners: () => client.get<ApiResponse<GameWinner[]>>('/games/winners'),

  getActivities: (status: 'ongoing' | 'closed' = 'ongoing') =>
    client.get<ApiResponse<ActivityItem[]>>('/activities', { params: { status } }),

  getActivity: (key: string) =>
    client.get<ApiResponse<ActivityItem>>(`/activities/${key}`),

  claimActivityTask: (activityKey: string, taskKey: string) =>
    client.post<ApiResponse<{ rewardAmount: number; newCoinsBalance: number }>>(
      `/activities/${activityKey}/claim/${taskKey}`
    ),

  claimAllActivityTasks: () =>
    client.post<ApiResponse<{ claimedCount: number; totalCoinsClaimed: number; newCoinsBalance: number }>>(
      '/activities/claim-all'
    ),

  getActivityRewards: () =>
    client.get<ApiResponse<ActivityRewardRecord[]>>('/activities/rewards'),

  recordProgress: (metric: string, increment = 1) =>
    client.post<ApiResponse>('/activities/progress', { metric, increment }),

  getLuckySpin: () => client.get<ApiResponse<LuckySpinState>>('/lucky-spin'),

  /**
   * The server picks the slice and credits it, then tells the client which
   * index to animate to. The client must never choose the outcome.
   */
  spin: (paid = false) => client.post<ApiResponse<SpinResult>>('/lucky-spin/spin', { paid }),

  getSignIn: () =>
    client.get<ApiResponse<{ days: { day: number; reward: number; claimed: boolean }[]; todayClaimed: boolean }>>(
      '/signin'
    ),

  claimSignIn: () => client.post<ApiResponse>('/signin/claim'),
};

/* ── Asset password (#6) — §4.2 ───────────────────────────────────── */

export interface AssetPasswordState {
  isSet: boolean;
  lockedUntil?: string | null;
  failCount?: number;
}

export const securityApi = {
  getAssetPasswordState: () => client.get<ApiResponse<AssetPasswordState>>('/security/asset-password'),

  setAssetPassword: (password: string) =>
    client.post<ApiResponse>('/security/asset-password', { password }),

  changeAssetPassword: (currentPassword: string, newPassword: string) =>
    client.put<ApiResponse>('/security/asset-password', { currentPassword, newPassword }),

  /** Returns a short-lived token that value-moving endpoints require. */
  verifyAssetPassword: (password: string) =>
    client.post<ApiResponse<{ token: string; expiresAt: string }>>(
      '/security/asset-password/verify',
      { password }
    ),

  resetAssetPassword: (payload: {
    emailOtp: string;
    phoneOtp: string;
    nid?: string;
    newPassword: string;
  }) => client.post<ApiResponse>('/security/asset-password/reset', payload),

  /** #72 — host sets their own per-minute call price. */
  setCallPrice: (coinsPerMinute: number) =>
    client.put<ApiResponse<{ coinsPerMinute: number }>>('/users/me/call-price', { coinsPerMinute }),

  getCallQuote: (hostId: string) =>
    client.get<ApiResponse<{ coinsPerMinute: number; balance: number; canCall: boolean; reason?: string }>>(
      `/calls/quote/${hostId}`
    ),
};
