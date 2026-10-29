import { Types } from 'mongoose';
import { User, LiveStream, Transaction, HostBonusCycle, IHostBonusCycleDocument, IHostBonusCycleDailyStat } from '../models';
import { notificationService } from './notification.service';
import { AppError } from '../middleware/errorHandler';

export const HOST_BONUS_RULES = {
  alpha: {
    hostType: 'alpha' as const,
    name: 'Alpha Host (Male ♂️)',
    cycleDays: 7,
    targetLiveHours: 15, // 15H in 7 days
    minDailyHours: 2, // minimum 2H daily to count towards weekly total
    maxDailyHours: 4, // maximum 4H counted per day (excess does not count)
    targetGiftCoins: 400_000, // 400,000 Coins in gifts received
    bonusDiamonds: 200_000, // 200,000 Diamonds reward
  },
  aurora: {
    hostType: 'aurora' as const,
    name: 'Aurora Host (Female ♀️)',
    cycleDays: 7,
    targetLiveHours: 20, // 20H in 7 days
    minDailyHours: 3, // minimum 3H daily to count towards weekly total
    maxDailyHours: 5, // maximum 5H counted per day (excess does not count)
    targetGiftCoins: 500_000, // 500,000 Coins in gifts received
    bonusDiamonds: 300_000, // 300,000 Diamonds reward
  },
};

export const hostBonusService = {
  /**
   * Recalculates stats (live hours, capped daily hours, gift coins) for a given cycle
   */
  async recalculateCycle(cycle: IHostBonusCycleDocument): Promise<IHostBonusCycleDocument> {
    const now = new Date();
    const cycleStart = cycle.startDate.getTime();
    const cycleEnd = cycle.endDate.getTime();
    const effectiveEnd = Math.min(now.getTime(), cycleEnd);
    const userIdObj = new Types.ObjectId(String(cycle.userId));

    // 1. Fetch all streams in cycle window
    const streams = await LiveStream.find({
      hostId: userIdObj,
      startedAt: { $lt: new Date(effectiveEnd) },
      $or: [{ endedAt: { $gt: cycle.startDate } }, { endedAt: null }, { status: 'live' }],
    }).sort({ startedAt: 1 });

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const dailyStats: IHostBonusCycleDailyStat[] = [];

    let totalRawSeconds = 0;
    let totalEligibleSeconds = 0;

    // Loop through each of the 7 days of the cycle
    for (let dayIndex = 1; dayIndex <= 7; dayIndex++) {
      const dayStartMs = cycleStart + (dayIndex - 1) * ONE_DAY_MS;
      const dayEndMs = Math.min(cycleStart + dayIndex * ONE_DAY_MS, cycleEnd);
      const dateStr = new Date(dayStartMs).toISOString().slice(0, 10);

      let dayRawSec = 0;

      for (const s of streams) {
        const streamStart = s.startedAt.getTime();
        const streamEnd = (
          s.endedAt || (s.status === 'live' ? now : s.updatedAt || s.startedAt)
        ).getTime();

        // Calculate overlap between stream and this calendar day
        const overlapStart = Math.max(streamStart, dayStartMs);
        const overlapEnd = Math.min(streamEnd, dayEndMs);

        if (overlapEnd > overlapStart) {
          dayRawSec += Math.floor((overlapEnd - overlapStart) / 1000);
        }
      }

      totalRawSeconds += dayRawSec;
      const rawHours = Number((dayRawSec / 3600).toFixed(1));

      // Daily rule:
      // Minimum required hours: if rawHours < minDailyHours, 0 hours count!
      // Maximum capped hours: if rawHours > maxDailyHours, only maxDailyHours count!
      let eligibleSec = 0;
      let eligibleHours = 0;
      let passedDaily = false;

      if (rawHours >= cycle.minDailyHours) {
        passedDaily = true;
        const cappedHours = Math.min(cycle.maxDailyHours, rawHours);
        eligibleHours = Number(cappedHours.toFixed(1));
        eligibleSec = Math.min(dayRawSec, cycle.maxDailyHours * 3600);
      }

      totalEligibleSeconds += eligibleSec;

      dailyStats.push({
        date: dateStr,
        dayIndex,
        rawSeconds: dayRawSec,
        rawHours,
        eligibleSeconds: eligibleSec,
        eligibleHours,
        minRequiredHours: cycle.minDailyHours,
        maxCountedHours: cycle.maxDailyHours,
        passedDailyRule: passedDaily,
      });
    }

    const totalEligibleHours = Number((totalEligibleSeconds / 3600).toFixed(1));
    const totalRawHours = Number((totalRawSeconds / 3600).toFixed(1));
    const validDaysCount = dailyStats.filter((d) => d.passedDailyRule).length;

    // 2. Fetch Gift Coins received during this cycle
    const earningsTx = await Transaction.aggregate([
      {
        $match: {
          $or: [
            { targetId: userIdObj, type: 'gift_send', status: 'completed' },
            { userId: userIdObj, type: 'gift_receive', status: 'completed' },
          ],
          createdAt: { $gte: cycle.startDate, $lt: new Date(effectiveEnd) },
        },
      },
      {
        $project: {
          coins: {
            $cond: [
              { $eq: ['$type', 'gift_send'] },
              '$amount',
              { $divide: ['$amount', 0.7] },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalCoins: { $sum: '$coins' },
        },
      },
    ]);

    const currentGiftCoins = Math.max(0, Math.round(earningsTx[0]?.totalCoins || 0));

    // 3. Evaluate criteria
    const meetsLiveHours = totalEligibleHours >= cycle.targetLiveHours;
    const meetsGiftCoins = currentGiftCoins >= cycle.targetGiftCoins;
    const isEligibleForBonus = meetsLiveHours && meetsGiftCoins;

    cycle.dailyStats = dailyStats;
    cycle.totalEligibleLiveHours = totalEligibleHours;
    cycle.totalRawLiveHours = totalRawHours;
    cycle.validDaysCount = validDaysCount;
    cycle.currentGiftCoins = currentGiftCoins;
    cycle.meetsLiveHours = meetsLiveHours;
    cycle.meetsGiftCoins = meetsGiftCoins;
    cycle.isEligibleForBonus = isEligibleForBonus;

    // 4. Auto-award if eligible and not awarded yet
    if (isEligibleForBonus && !cycle.bonusAwarded) {
      await this.awardCycleBonus(cycle);
    } else {
      await cycle.save();
    }

    return cycle;
  },

  /**
   * Awards bonus diamonds to user and creates audit transaction + notification
   */
  async awardCycleBonus(cycle: IHostBonusCycleDocument) {
    if (cycle.bonusAwarded) return;

    cycle.bonusAwarded = true;
    cycle.awardedAt = new Date();
    cycle.status = 'awarded';

    // 1. Credit diamonds to User
    await User.findByIdAndUpdate(cycle.userId, {
      $inc: { diamonds: cycle.bonusDiamonds },
    });

    // 2. Create Transaction ledger record
    const tx = await Transaction.create({
      userId: cycle.userId,
      type: 'host_bonus',
      amount: cycle.bonusDiamonds,
      currency: 'diamond',
      status: 'completed',
      description: `Official ${cycle.hostType === 'alpha' ? 'Alpha Host' : 'Aurora Host'} 7-Day Performance Bonus (Cycle #${cycle.cycleNumber})`,
    });

    cycle.transactionId = tx._id as any;
    await cycle.save();

    // 3. Send Notification to User
    notificationService
      .createNotification({
        userId: String(cycle.userId),
        type: 'system',
        title: `🎉 ${cycle.bonusDiamonds.toLocaleString()} 💎 Host Bonus Awarded!`,
        message: `Congratulations! You fulfilled the 7-day criteria for ${cycle.hostType === 'alpha' ? 'Alpha Host' : 'Aurora Host'} (15h/20h live, daily hours & gift targets). ${cycle.bonusDiamonds.toLocaleString()} Diamonds have been automatically credited to your wallet!`,
        targetUrl: '/host-application',
      })
      .catch((err) => console.error('Failed to send host bonus notification:', err));
  },

  /**
   * Settle an expired cycle and start the next 7-day cycle
   */
  async settleAndAdvanceCycle(cycle: IHostBonusCycleDocument): Promise<IHostBonusCycleDocument> {
    // Settle current cycle
    await this.recalculateCycle(cycle);

    if (cycle.isEligibleForBonus && !cycle.bonusAwarded) {
      await this.awardCycleBonus(cycle);
    } else if (!cycle.bonusAwarded) {
      cycle.status = 'missed';
      await cycle.save();
    }

    // Advance to next cycle
    const nextStartDate = new Date(cycle.endDate);
    const nextEndDate = new Date(nextStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextCycleNumber = cycle.cycleNumber + 1;

    const user = await User.findById(cycle.userId).select('hostBadge');
    const hostType: 'alpha' | 'aurora' =
      user?.hostBadge === 'alpha' || user?.hostBadge === 'aurora'
        ? user.hostBadge
        : cycle.hostType;

    const rule = HOST_BONUS_RULES[hostType];

    const newCycle = await HostBonusCycle.create({
      userId: cycle.userId,
      hostType,
      cycleNumber: nextCycleNumber,
      startDate: nextStartDate,
      endDate: nextEndDate,
      status: 'active',
      targetLiveHours: rule.targetLiveHours,
      minDailyHours: rule.minDailyHours,
      maxDailyHours: rule.maxDailyHours,
      targetGiftCoins: rule.targetGiftCoins,
      bonusDiamonds: rule.bonusDiamonds,
    });

    return await this.recalculateCycle(newCycle);
  },

  /**
   * Get or initialize current active 7-day cycle for user
   */
  async getActiveCycleForUser(userId: string | Types.ObjectId) {
    const user = await User.findById(userId).select(
      'uid nickname avatar gender hostBadge hostBadgeType hostBadgeAssignedAt diamonds level'
    );
    if (!user) throw new AppError('User not found', 404);

    const isApprovedHost = user.hostBadge === 'alpha' || user.hostBadge === 'aurora';
    const hostType = (user.hostBadge === 'aurora' ? 'aurora' : 'alpha') as 'alpha' | 'aurora';
    const rule = HOST_BONUS_RULES[hostType];

    if (!isApprovedHost) {
      return {
        user: {
          _id: String(user._id),
          uid: user.uid,
          nickname: user.nickname,
          avatar: user.avatar,
          hostBadge: user.hostBadge || 'none',
          diamonds: user.diamonds || 0,
        },
        isApprovedHost: false,
        hostType,
        rule,
        currentCycle: null,
        pastCycles: [],
        rulesSummary: HOST_BONUS_RULES,
      };
    }

    const now = new Date();
    let currentCycle: any = await HostBonusCycle.findOne({
      userId: user._id,
      status: 'active',
    }).sort({ cycleNumber: -1 });

    // If no active cycle exists, check latest finished cycle or create Cycle #1
    if (!currentCycle) {
      const latestCycle: any = await HostBonusCycle.findOne({ userId: user._id }).sort({
        cycleNumber: -1,
      });

      if (latestCycle) {
        // Check if latest cycle can be advanced
        if (now.getTime() >= latestCycle.endDate.getTime()) {
          currentCycle = await this.settleAndAdvanceCycle(latestCycle);
        } else {
          currentCycle = latestCycle;
        }
      } else {
        // Create Initial Cycle #1 starting from hostBadgeAssignedAt or beginning of today
        let startDate = user.hostBadgeAssignedAt ? new Date(user.hostBadgeAssignedAt) : new Date();
        // If assigned date is far in the past, roll forward in 7-day increments so active cycle covers now
        const cycleDurationMs = 7 * 24 * 60 * 60 * 1000;
        let endDate = new Date(startDate.getTime() + cycleDurationMs);
        let cycleNum = 1;

        while (endDate.getTime() <= now.getTime()) {
          startDate = new Date(endDate);
          endDate = new Date(startDate.getTime() + cycleDurationMs);
          cycleNum++;
        }

        currentCycle = await HostBonusCycle.create({
          userId: user._id,
          hostType,
          cycleNumber: cycleNum,
          startDate,
          endDate,
          status: 'active',
          targetLiveHours: rule.targetLiveHours,
          minDailyHours: rule.minDailyHours,
          maxDailyHours: rule.maxDailyHours,
          targetGiftCoins: rule.targetGiftCoins,
          bonusDiamonds: rule.bonusDiamonds,
        });
      }
    }

    if (currentCycle) {
      // If current cycle's endDate has passed, settle and advance!
      if (now.getTime() >= currentCycle.endDate.getTime()) {
        currentCycle = await this.settleAndAdvanceCycle(currentCycle);
      } else {
        // Recalculate progress for active cycle
        currentCycle = await this.recalculateCycle(currentCycle);
      }
    }

    // Fetch past cycles for history tab
    const pastCycles = await HostBonusCycle.find({
      userId: user._id,
      cycleNumber: { $ne: currentCycle.cycleNumber },
    })
      .sort({ cycleNumber: -1 })
      .limit(10)
      .lean();

    return {
      user: {
        _id: String(user._id),
        uid: user.uid,
        nickname: user.nickname,
        avatar: user.avatar,
        hostBadge: user.hostBadge,
        diamonds: user.diamonds || 0,
        level: user.level || 1,
      },
      isApprovedHost: true,
      hostType,
      rule,
      currentCycle,
      pastCycles,
      rulesSummary: HOST_BONUS_RULES,
      serverTime: now,
    };
  },

  /**
   * Background engine tick: runs every 5 minutes to settle cycles and award bonuses
   */
  async processAllHostCycles() {
    const now = new Date();

    // 1. Find all active cycles that expired
    const expiredCycles = await HostBonusCycle.find({
      status: 'active',
      endDate: { $lte: now },
    });

    for (const c of expiredCycles) {
      try {
        await this.settleAndAdvanceCycle(c);
      } catch (err) {
        console.error(`Failed to settle host cycle ${c._id}:`, err);
      }
    }

    // 2. Find all approved Alpha/Aurora hosts without an active cycle and initialize them
    const approvedHosts = await User.find({
      hostBadge: { $in: ['alpha', 'aurora'] },
    }).select('_id');

    for (const h of approvedHosts) {
      try {
        const activeCycle = await HostBonusCycle.findOne({
          userId: h._id,
          status: 'active',
        });
        if (!activeCycle) {
          await this.getActiveCycleForUser(h._id);
        } else {
          // Recalculate to trigger instant auto-award if criteria met
          await this.recalculateCycle(activeCycle);
        }
      } catch (err) {
        console.error(`Failed to process host cycles for user ${h._id}:`, err);
      }
    }
  },

  /**
   * Admin: List all host cycles with search and filtering
   */
  async getAdminHostBonuses(query: {
    page?: number;
    limit?: number;
    hostType?: string;
    status?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(query.limit) || 15));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.hostType && query.hostType !== 'all') {
      filter.hostType = query.hostType;
    }

    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }

    if (query.search?.trim()) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      const matchingUsers = await User.find({
        $or: [{ nickname: searchRegex }, { uid: searchRegex }],
      }).select('_id');

      filter.userId = { $in: matchingUsers.map((u) => u._id) };
    }

    const total = await HostBonusCycle.countDocuments(filter);
    const cycles = await HostBonusCycle.find(filter)
      .populate('userId', 'uid nickname avatar gender level hostBadge')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      cycles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Admin: Force recalculate or settle a cycle
   */
  async adminForceSettle(cycleId: string) {
    const cycle = await HostBonusCycle.findById(cycleId);
    if (!cycle) throw new AppError('Cycle not found', 404);

    if (cycle.status === 'active') {
      return await this.settleAndAdvanceCycle(cycle);
    } else {
      return await this.recalculateCycle(cycle);
    }
  },
};

/**
 * Background periodic worker (runs every 5 minutes)
 */
let workerTimer: NodeJS.Timeout | null = null;

export const startHostBonusWorker = () => {
  if (workerTimer) return;

  // Run on start after 5 seconds delay
  setTimeout(() => {
    hostBonusService.processAllHostCycles().catch((err) => {
      console.error('Host bonus worker tick failed:', err);
    });
  }, 5000);

  // Then run every 5 minutes
  workerTimer = setInterval(() => {
    hostBonusService.processAllHostCycles().catch((err) => {
      console.error('Host bonus worker tick failed:', err);
    });
  }, 5 * 60 * 1000);

  console.log('✅ Host 7-Day Performance Bonus worker started (interval: 5m)');
};
