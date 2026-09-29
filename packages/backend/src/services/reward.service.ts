import { User, LiveStream, Transaction, DailyRewardConfig, DailyRewardClaim } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getIO } from '../socket';
import { notificationService } from './notification.service';
import { getBangladeshDayBounds, getRewardCycleBounds } from '../utils/date';

export const rewardService = {
  // ─── Config ────────────────────────────────────────────────────────

  async getConfig() {
    const config = await DailyRewardConfig.getConfig();
    return config;
  },

  async updateConfig(patch: any) {
    const config = await DailyRewardConfig.getConfig();

    if (typeof patch.giftUserShare === 'number' && typeof patch.giftAdminShare === 'number') {
      if (patch.giftUserShare + patch.giftAdminShare !== 100) {
        throw new AppError('User share + admin share must equal 100', 400);
      }
      config.giftUserShare = patch.giftUserShare;
      config.giftAdminShare = patch.giftAdminShare;
    }

    if (Array.isArray(patch.tiers)) {
      for (const tier of patch.tiers) {
        if (
          typeof tier.count !== 'number' ||
          typeof tier.rewardCoins !== 'number' ||
          typeof tier.requiredHours !== 'number' ||
          tier.count < 0 ||
          tier.rewardCoins < 0 ||
          tier.requiredHours < 0
        ) {
          throw new AppError('Each tier needs valid count, rewardCoins and requiredHours', 400);
        }
      }
      config.tiers = [...patch.tiers].sort((a, b) => a.count - b.count);
    }

    await config.save();
    return config;
  },

  // ─── Daily metrics ─────────────────────────────────────────────────

  /**
   * Computes the host's metrics for the current 7-day count cycle and today's live minutes.
   * count      → coins earned from gifts (gift_receive) within the current weekly cycle
   * liveMinutes→ minutes live today, from streams the host has actually ended today
   */
  async computeDailyMetrics(userId: string) {
    const cycle = getRewardCycleBounds();
    const day = getBangladeshDayBounds();

    // Count = host's earned coins from gifts in the current 7-day cycle
    const countAgg = await Transaction.aggregate([
      {
        $match: {
          userId: { $eq: userId as any },
          type: 'gift_receive',
          status: 'completed',
          createdAt: { $gte: cycle.start, $lt: cycle.end },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const count = countAgg[0]?.total || 0;

    // Live time today = sum of durations of streams started today that the host ended
    const streams = await LiveStream.find({
      hostId: userId,
      startedAt: { $gte: day.start, $lt: day.end },
    }).select('startedAt endedAt status');

    let liveMinutes = 0;
    let endedToday = false;
    for (const s of streams) {
      if (s.status === 'ended' && s.endedAt) {
        endedToday = true;
        const duration = (s.endedAt.getTime() - s.startedAt.getTime()) / 60000;
        if (duration > 0) liveMinutes += duration;
      }
    }

    return { count, liveMinutes, endedToday, cycleStart: cycle.start, cycleEnd: cycle.end, dayStart: day.start, dayEnd: day.end, dateKey: day.dateKey };
  },

  // ─── Status (progress card) ────────────────────────────────────────

  async getStatus(userId: string) {
    const config = await DailyRewardConfig.getConfig();
    const metrics = await this.computeDailyMetrics(userId);
    const existingClaim = await DailyRewardClaim.findOne({ userId, date: metrics.dateKey });

    // Highest tier whose requirements (count + today's live hours) are met
    let qualifiedTier: any = null;
    for (const tier of config.tiers) {
      if (metrics.count >= tier.count && metrics.liveMinutes >= tier.requiredHours * 60) {
        qualifiedTier = tier;
      }
    }

    // Next tier the host is progressing toward
    const nextTier = config.tiers.find(
      (t) => metrics.count < t.count || metrics.liveMinutes < t.requiredHours * 60
    );

    return {
      dateKey: metrics.dateKey,
      cycleStart: metrics.cycleStart,
      cycleEnd: metrics.cycleEnd,
      count: metrics.count,
      liveMinutes: Math.floor(metrics.liveMinutes),
      endedToday: metrics.endedToday,
      claimable: !!qualifiedTier,
      claimed: !!existingClaim,
      claimedTier: existingClaim?.tier || null,
      qualifiedTier,
      nextTier: nextTier || null,
      tiers: config.tiers,
      giftUserShare: config.giftUserShare,
      giftAdminShare: config.giftAdminShare,
    };
  },

  // ─── Claim ─────────────────────────────────────────────────────────

  async claimReward(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const config = await DailyRewardConfig.getConfig();
    const metrics = await this.computeDailyMetrics(userId);

    // Idempotency: one claim per user per Bangladesh day
    const existingClaim = await DailyRewardClaim.findOne({ userId, date: metrics.dateKey });
    if (existingClaim) throw new AppError('Daily reward already claimed today', 409);

    // Live-hours gate: host must have actually ended at least one stream today
    if (!metrics.endedToday) {
      throw new AppError('You must go live and end your stream before claiming today’s reward', 400);
    }

    // Find the highest qualifying tier
    let qualifiedTier: any = null;
    for (const tier of config.tiers) {
      if (metrics.count >= tier.count && metrics.liveMinutes >= tier.requiredHours * 60) {
        qualifiedTier = tier;
      }
    }
    if (!qualifiedTier) {
      throw new AppError('Daily reward requirements not met yet', 400);
    }

    // Credit coins atomically
    const updated = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { coins: qualifiedTier.rewardCoins } },
      { new: true }
    );
    if (!updated) throw new AppError('User not found', 404);

    // Persist the claim (unique { userId, date } guards racing double-claims)
    let claim;
    try {
      claim = await DailyRewardClaim.create({
        userId,
        date: metrics.dateKey,
        count: metrics.count,
        liveMinutes: Math.floor(metrics.liveMinutes),
        tier: qualifiedTier,
        rewardCoins: qualifiedTier.rewardCoins,
        status: 'claimed',
      });
    } catch (err: any) {
      // Duplicate key (concurrent claim) — roll back the credit
      if (err?.code === 11000) {
        await User.updateOne({ _id: userId }, { $inc: { coins: -qualifiedTier.rewardCoins } });
        throw new AppError('Daily reward already claimed today', 409);
      }
      throw err;
    }

    // Transaction record
    await Transaction.create({
      userId,
      type: 'daily_reward',
      amount: qualifiedTier.rewardCoins,
      currency: 'coin',
      status: 'completed',
      description: `Daily live reward (count ${metrics.count.toLocaleString()})`,
    });

    // Real-time balance push + notification (must not block the claim)
    try {
      getIO().to(`user:${userId}`).emit('balance:update', { coins: updated.coins, diamonds: updated.diamonds });
    } catch { /* socket not initialized */ }
    try {
      await notificationService.createNotification(
        userId,
        'system',
        'Daily Reward Claimed',
        `You claimed ${qualifiedTier.rewardCoins.toLocaleString()} coins for today's live reward!`,
        { rewardCoins: qualifiedTier.rewardCoins, tier: qualifiedTier }
      );
    } catch { /* notification failure must not block the claim */ }

    return {
      rewardCoins: qualifiedTier.rewardCoins,
      tier: qualifiedTier,
      count: metrics.count,
      liveMinutes: Math.floor(metrics.liveMinutes),
      balance: { coins: updated.coins, diamonds: updated.diamonds },
      claim,
    };
  },
};
