import { Types } from 'mongoose';
import { User, LiveStream, Transaction } from '../models';
import { getRewardCycleBounds, DayBounds } from '../utils/date';
import { getSkip } from '../utils/pagination';

export const QUALIFICATION_REQUIREMENTS = {
  MIN_WEEKLY_COINS: 500_000,
  MIN_WEEKLY_LIVE_SECONDS: 50 * 3600, // 50 hours = 180,000 seconds
  MIN_WEEKLY_LIVE_HOURS: 50,
  EARNING_BONUS_RATE: 0.05, // 5% extra earning bonus
};

export interface HostWeeklyStats {
  hostId: string;
  nickname: string;
  uid: string;
  avatar: string;
  gender: string;
  level: number;
  currentBadge: 'alpha' | 'aurora' | 'none';
  hostBadgeType: 'manual' | 'auto' | 'none';
  weeklyEarnings: number;
  weeklyLiveSeconds: number;
  weeklyLiveHours: number;
  meetsEarnings: boolean;
  meetsLiveHours: boolean;
  qualifiesAuto: boolean;
  eligibleBadge: 'alpha' | 'aurora' | null;
  assignedAt?: Date;
}

export const hostBadgeService = {
  getWeeklyBounds(now: Date = new Date()): DayBounds {
    return getRewardCycleBounds(now);
  },

  /**
   * Calculate a single host's weekly earnings (in Coins) and weekly live stream hours
   */
  async getHostWeeklyStats(hostId: string, customBounds?: DayBounds): Promise<HostWeeklyStats | null> {
    const user = await User.findById(hostId).select(
      'uid nickname avatar gender level hostBadge hostBadgeType hostBadgeAssignedAt role'
    );
    if (!user) return null;

    const bounds = customBounds || this.getWeeklyBounds();
    const hostObjectId = new Types.ObjectId(hostId);

    // 1. Calculate Weekly Live Time (seconds)
    const streamDurations = await LiveStream.aggregate([
      {
        $match: {
          hostId: hostObjectId,
          startedAt: { $gte: bounds.start, $lt: bounds.end },
        },
      },
      {
        $project: {
          durationSeconds: {
            $divide: [
              {
                $subtract: [
                  { $ifNull: ['$endedAt', bounds.end > new Date() ? '$$NOW' : bounds.end] },
                  '$startedAt',
                ],
              },
              1000,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalSeconds: { $sum: '$durationSeconds' },
        },
      },
    ]);

    const weeklyLiveSeconds = Math.max(0, Math.floor(streamDurations[0]?.totalSeconds || 0));
    const weeklyLiveHours = Number((weeklyLiveSeconds / 3600).toFixed(1));

    // 2. Calculate Weekly Earnings (Coins)
    // From gifts sent to host (gift_send targetId = hostId) or received gifts
    const earningsTx = await Transaction.aggregate([
      {
        $match: {
          $or: [
            { targetId: hostObjectId, type: 'gift_send', status: 'completed' },
            { userId: hostObjectId, type: 'gift_receive', status: 'completed' },
            { userId: hostObjectId, type: 'call_earning', status: 'completed' },
            { userId: hostObjectId, type: 'fanclub_join', status: 'completed' },
          ],
          createdAt: { $gte: bounds.start, $lt: bounds.end },
        },
      },
      {
        $project: {
          // If gift_send, amount is in coins; if gift_receive diamonds, convert to coin equiv (/ 0.70)
          coinValue: {
            $cond: [
              { $eq: ['$type', 'gift_send'] },
              '$amount',
              {
                $cond: [
                  { $eq: ['$type', 'gift_receive'] },
                  { $divide: ['$amount', 0.7] },
                  '$amount',
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalCoins: { $sum: '$coinValue' },
        },
      },
    ]);

    const weeklyEarnings = Math.max(0, Math.round(earningsTx[0]?.totalCoins || 0));

    // 3. Determine Eligibility
    const meetsEarnings = weeklyEarnings >= QUALIFICATION_REQUIREMENTS.MIN_WEEKLY_COINS;
    const meetsLiveHours = weeklyLiveSeconds >= QUALIFICATION_REQUIREMENTS.MIN_WEEKLY_LIVE_SECONDS;
    const qualifiesBoth = meetsEarnings && meetsLiveHours;

    let eligibleBadge: 'alpha' | 'aurora' | null = null;
    if (qualifiesBoth) {
      if (user.gender === 'male') {
        eligibleBadge = 'alpha';
      } else if (user.gender === 'female') {
        eligibleBadge = 'aurora';
      }
      // Note: Gender must strictly be 'male' for Alpha and 'female' for Aurora
    }

    return {
      hostId: String(user._id),
      nickname: user.nickname,
      uid: user.uid,
      avatar: user.avatar,
      gender: user.gender || 'unspecified',
      level: user.level || 1,
      currentBadge: (user.hostBadge as any) || 'none',
      hostBadgeType: (user.hostBadgeType as any) || 'none',
      weeklyEarnings,
      weeklyLiveSeconds,
      weeklyLiveHours,
      meetsEarnings,
      meetsLiveHours,
      qualifiesAuto: !!eligibleBadge,
      eligibleBadge,
      assignedAt: user.hostBadgeAssignedAt,
    };
  },

  /**
   * Evaluate and automatically assign or revoke badge for a single host
   */
  async evaluateAndAssignHostBadge(hostId: string): Promise<HostWeeklyStats | null> {
    const stats = await this.getHostWeeklyStats(hostId);
    if (!stats) return null;

    const user = await User.findById(hostId);
    if (!user) return null;

    // If manually assigned by admin, do not automatically revoke/override
    if (user.hostBadgeType === 'manual' && user.hostBadge && user.hostBadge !== 'none') {
      return stats;
    }

    if (stats.eligibleBadge) {
      // Host qualifies automatically for alpha (male) or aurora (female)
      if (user.hostBadge !== stats.eligibleBadge || user.hostBadgeType !== 'auto') {
        user.hostBadge = stats.eligibleBadge;
        user.hostBadgeType = 'auto';
        user.hostBadgeAssignedAt = new Date();
        await user.save();
        stats.currentBadge = stats.eligibleBadge;
        stats.hostBadgeType = 'auto';
      }
    } else {
      // Host does NOT qualify; if they had an 'auto' badge, revoke it
      if (user.hostBadgeType === 'auto' && user.hostBadge !== 'none') {
        user.hostBadge = 'none';
        user.hostBadgeType = 'none';
        await user.save();
        stats.currentBadge = 'none';
        stats.hostBadgeType = 'none';
      }
    }

    return stats;
  },

  /**
   * Admin manual assignment/removal
   */
  async setManualBadge(
    hostId: string,
    badge: 'alpha' | 'aurora' | 'none'
  ): Promise<{ success: boolean; user: any }> {
    const user = await User.findById(hostId);
    if (!user) throw new Error('Host not found');

    user.hostBadge = badge;
    user.hostBadgeType = badge === 'none' ? 'none' : 'manual';
    user.hostBadgeAssignedAt = badge === 'none' ? undefined : new Date();
    await user.save();

    return { success: true, user };
  },

  /**
   * Batch recalculation across all hosts (called by cron engine & admin action)
   */
  async recalculateAllHostBadges(): Promise<{
    totalEvaluated: number;
    alphaAssigned: number;
    auroraAssigned: number;
    autoRevoked: number;
  }> {
    // Find all users who are hosts or have streamed / have a badge
    const hosts = await User.find({
      $or: [
        { role: 'host' },
        { hostBadge: { $in: ['alpha', 'aurora'] } },
        { 'verification.status': 'VERIFIED', 'verification.type': 'host' },
      ],
    }).select('_id hostBadge hostBadgeType gender');

    let alphaAssigned = 0;
    let auroraAssigned = 0;
    let autoRevoked = 0;

    for (const host of hosts) {
      try {
        const stats = await this.evaluateAndAssignHostBadge(String(host._id));
        if (stats?.hostBadgeType === 'auto') {
          if (stats.currentBadge === 'alpha') alphaAssigned++;
          if (stats.currentBadge === 'aurora') auroraAssigned++;
        } else if (host.hostBadgeType === 'auto' && stats?.currentBadge === 'none') {
          autoRevoked++;
        }
      } catch (err) {
        console.error(`[hostBadge] Error evaluating host ${host._id}:`, err);
      }
    }

    return {
      totalEvaluated: hosts.length,
      alphaAssigned,
      auroraAssigned,
      autoRevoked,
    };
  },

  /**
   * Query hosts with weekly stats and qualification details for Admin panel
   */
  async getHostsWithStats(options: {
    page?: number;
    limit?: number;
    search?: string;
    badge?: string;
    gender?: string;
  }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 20);

    const filter: any = {
      $or: [
        { role: 'host' },
        { hostBadge: { $in: ['alpha', 'aurora'] } },
        { 'verification.status': 'VERIFIED', 'verification.type': 'host' },
      ],
    };

    if (options.gender && options.gender !== 'all') {
      filter.gender = options.gender;
    }

    if (options.badge && options.badge !== 'all') {
      if (options.badge === 'none') {
        filter.hostBadge = { $in: ['none', null, ''] };
      } else {
        filter.hostBadge = options.badge;
      }
    }

    if (options.search) {
      const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$and = [
        {
          $or: [
            { nickname: { $regex: escaped, $options: 'i' } },
            { uid: { $regex: escaped, $options: 'i' } },
            { phone: { $regex: escaped, $options: 'i' } },
          ],
        },
      ];
    }

    const total = await User.countDocuments(filter);
    const hosts = await User.find(filter)
      .sort({ hostBadge: -1, createdAt: -1 })
      .skip(getSkip(page, limit))
      .limit(limit)
      .select('uid nickname avatar gender level diamonds coins role hostBadge hostBadgeType hostBadgeAssignedAt phone isBanned');

    const bounds = this.getWeeklyBounds();
    const enrichedHosts = await Promise.all(
      hosts.map(async (h) => {
        const stats = await this.getHostWeeklyStats(String(h._id), bounds);
        return {
          ...h.toObject(),
          weeklyEarnings: stats?.weeklyEarnings || 0,
          weeklyLiveSeconds: stats?.weeklyLiveSeconds || 0,
          weeklyLiveHours: stats?.weeklyLiveHours || 0,
          meetsEarnings: stats?.meetsEarnings || false,
          meetsLiveHours: stats?.meetsLiveHours || false,
          qualifiesAuto: stats?.qualifiesAuto || false,
          eligibleBadge: stats?.eligibleBadge || null,
        };
      })
    );

    return {
      data: enrichedHosts,
      total,
      page,
      limit,
      weeklyBounds: {
        start: bounds.start.toISOString(),
        end: bounds.end.toISOString(),
        dateKey: bounds.dateKey,
      },
    };
  },
};
