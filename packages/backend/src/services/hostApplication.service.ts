import { Types } from 'mongoose';
import { User, LiveStream, Transaction, OfficialHostApplication } from '../models';
import { notificationService } from './notification.service';
import { AppError } from '../middleware/errorHandler';
import { getSkip } from '../utils/pagination';

export interface EligibilityResult {
  isEligible: boolean;
  user: {
    _id: string;
    uid: string;
    nickname: string;
    avatar: string;
    gender: string;
    level: number;
    hostBadge: string;
  };
  targetHostType: 'alpha' | 'aurora';
  hasPendingApplication: boolean;
  latestApplication?: any;
  criteria: {
    liveTime: {
      currentSeconds: number;
      currentHours: number;
      targetHours: number;
      percent: number;
      passed: boolean;
    };
    dailyRules: {
      currentDays: number;
      targetDays: number;
      minHoursPerDay: number;
      dailyBreakdown: {
        date: string;
        seconds: number;
        hours: number;
        passed: boolean;
      }[];
      percent: number;
      passed: boolean;
    };
    giftCoins: {
      currentCoins: number;
      targetCoins: number;
      percent: number;
      passed: boolean;
    };
  };
}

export const hostApplicationService = {
  /**
   * Calculate 7-day qualification for Alpha / Aurora Host:
   * 1. সময়: ৭ দিনে ১৪ ঘন্টা লাইভ (>= 14 hours total live time)
   * 2. ডেইলি রুলস: কমপক্ষে ৫ দিন লাইভ করতে হবে, প্রতিদিন ১.৫ ঘন্টা minimum (>= 5 days with >= 1.5 hrs/day)
   * 3. গিফট: ৭ দিনে ৮০,০০০ কয়েন রিসিভ করতে হবে (>= 80,000 gift coins)
   */
  async getEligibility(userId: string): Promise<EligibilityResult> {
    const user = await User.findById(userId).select(
      'uid nickname avatar gender level hostBadge hostBadgeType'
    );
    if (!user) throw new AppError('User not found', 404);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const userObjId = new Types.ObjectId(userId);

    // 1. Live stream stats (last 7 days)
    const streams = await LiveStream.find({
      hostId: userObjId,
      startedAt: { $gte: sevenDaysAgo },
    }).sort({ startedAt: -1 });

    let totalLiveSeconds = 0;
    // Map of YYYY-MM-DD -> total stream seconds
    const dailyMap: Record<string, number> = {};

    // Prepare past 7 calendar days breakdown
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = 0;
    }

    for (const s of streams) {
      const start = s.startedAt.getTime();
      const end = (s.endedAt || (s.status === 'live' ? now : s.updatedAt || s.startedAt)).getTime();
      const durSec = Math.max(0, Math.floor((end - start) / 1000));
      totalLiveSeconds += durSec;

      const dateKey = s.startedAt.toISOString().slice(0, 10);
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + durSec;
    }

    const currentLiveHours = Number((totalLiveSeconds / 3600).toFixed(1));
    const targetLiveHours = 14;
    const meetsLiveTime = currentLiveHours >= targetLiveHours;

    // Daily breakdown & days with >= 1.5 hours (5400 seconds)
    const dailyBreakdown = Object.entries(dailyMap)
      .sort((a, b) => b[0].localeCompare(a[0])) // latest first
      .map(([date, seconds]) => {
        const hours = Number((seconds / 3600).toFixed(1));
        return {
          date,
          seconds,
          hours,
          passed: seconds >= 5400, // 1.5 hours
        };
      });

    const validDaysCount = dailyBreakdown.filter((d) => d.passed).length;
    const targetDays = 5;
    const meetsDailyRules = validDaysCount >= targetDays;

    // 2. Gift Coins received in last 7 days
    const earningsTx = await Transaction.aggregate([
      {
        $match: {
          $or: [
            { targetId: userObjId, type: 'gift_send', status: 'completed' },
            { userId: userObjId, type: 'gift_receive', status: 'completed' },
          ],
          createdAt: { $gte: sevenDaysAgo },
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
    const targetGiftCoins = 80000;
    const meetsGiftCoins = currentGiftCoins >= targetGiftCoins;

    const isEligible = meetsLiveTime && meetsDailyRules && meetsGiftCoins;

    // Target Host Type based on Gender
    // Alpha Host: Male ("chelera"), Aurora Host: Female ("meyera")
    const targetHostType: 'alpha' | 'aurora' =
      user.gender === 'female' ? 'aurora' : 'alpha';

    // Latest application
    const latestApplication = await OfficialHostApplication.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    const hasPendingApplication = latestApplication?.status === 'pending';

    return {
      isEligible,
      user: {
        _id: String(user._id),
        uid: user.uid,
        nickname: user.nickname,
        avatar: user.avatar,
        gender: user.gender || 'unspecified',
        level: user.level || 1,
        hostBadge: user.hostBadge || 'none',
      },
      targetHostType,
      hasPendingApplication,
      latestApplication,
      criteria: {
        liveTime: {
          currentSeconds: totalLiveSeconds,
          currentHours: currentLiveHours,
          targetHours: targetLiveHours,
          percent: Math.min(100, Math.round((currentLiveHours / targetLiveHours) * 100)),
          passed: meetsLiveTime,
        },
        dailyRules: {
          currentDays: validDaysCount,
          targetDays,
          minHoursPerDay: 1.5,
          dailyBreakdown,
          percent: Math.min(100, Math.round((validDaysCount / targetDays) * 100)),
          passed: meetsDailyRules,
        },
        giftCoins: {
          currentCoins: currentGiftCoins,
          targetCoins: targetGiftCoins,
          percent: Math.min(100, Math.round((currentGiftCoins / targetGiftCoins) * 100)),
          passed: meetsGiftCoins,
        },
      },
    };
  },

  /**
   * Submit host application
   */
  async submitApplication(
    userId: string,
    data: {
      realName: string;
      phone: string;
      whatsapp?: string;
      bio?: string;
      socialLink?: string;
      hostType?: 'alpha' | 'aurora';
    }
  ) {
    if (!data.realName || !data.phone) {
      throw new AppError('Real name and phone number are required', 400);
    }

    const eligibility = await this.getEligibility(userId);

    // If user already has a pending application
    if (eligibility.hasPendingApplication) {
      throw new AppError('You already have an application under review', 400);
    }

    // Must meet all 3 criteria to unlock
    if (!eligibility.isEligible) {
      throw new AppError(
        'You have not completed all requirements yet (14h live, 5 active days >=1.5h, 80,000 gift coins in 7 days).',
        400
      );
    }

    // Determine host type: default to gender-specific
    const hostType: 'alpha' | 'aurora' =
      data.hostType || eligibility.targetHostType;

    const application = await OfficialHostApplication.create({
      userId,
      hostType,
      gender: eligibility.user.gender,
      status: 'pending',
      realName: data.realName.trim(),
      phone: data.phone.trim(),
      whatsapp: (data.whatsapp || '').trim(),
      bio: (data.bio || '').trim(),
      socialLink: (data.socialLink || '').trim(),
      statsAtApplication: {
        liveSeconds7d: eligibility.criteria.liveTime.currentSeconds,
        liveHours7d: eligibility.criteria.liveTime.currentHours,
        validDays7d: eligibility.criteria.dailyRules.currentDays,
        giftCoins7d: eligibility.criteria.giftCoins.currentCoins,
        meetsLiveTime: eligibility.criteria.liveTime.passed,
        meetsDailyRules: eligibility.criteria.dailyRules.passed,
        meetsGiftCoins: eligibility.criteria.giftCoins.passed,
      },
    });

    // Notify user
    notificationService
      .createNotification({
        userId,
        type: 'system',
        title: 'Host Application Submitted 🌟',
        message: `Your application for ${hostType === 'alpha' ? 'Alpha Host' : 'Aurora Host'} has been submitted and is under review.`,
        targetUrl: '/host-application',
      })
      .catch(() => {});

    return application;
  },

  /**
   * Get user's own application status & full eligibility
   */
  async getMyApplication(userId: string) {
    return this.getEligibility(userId);
  },

  /**
   * Admin: List applications with filters and pagination
   */
  async getApplications(options: {
    status?: string;
    hostType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));

    const filter: any = {};
    if (options.status && options.status !== 'all') {
      filter.status = options.status;
    }
    if (options.hostType && options.hostType !== 'all') {
      filter.hostType = options.hostType;
    }

    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match realName, phone, or find matching users
      const matchingUsers = await User.find({
        $or: [
          { uid: { $regex: escaped, $options: 'i' } },
          { nickname: { $regex: escaped, $options: 'i' } },
        ],
      }).select('_id');

      filter.$or = [
        { realName: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
        { userId: { $in: matchingUsers.map((u) => u._id) } },
      ];
    }

    const total = await OfficialHostApplication.countDocuments(filter);
    const applications = await OfficialHostApplication.find(filter)
      .sort({ createdAt: -1 })
      .skip(getSkip(page, limit))
      .limit(limit)
      .populate('userId', 'uid nickname avatar gender level hostBadge phone isBanned')
      .populate('reviewedBy', 'nickname uid');

    return {
      data: applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Admin: Detailed view including full history:
   * - Live time history (streams list, durations, totals)
   * - Watch time history (views, peak viewers, avg viewers)
   * - Gift history (gifts received, top gifters, transactions)
   */
  async getApplicationDetail(applicationId: string) {
    const app = await OfficialHostApplication.findById(applicationId)
      .populate('userId', 'uid nickname avatar gender level hostBadge hostBadgeType phone createdAt isBanned')
      .populate('reviewedBy', 'nickname uid');

    if (!app) throw new AppError('Application not found', 404);

    const user = app.userId as any;
    const userId = user._id;
    const userObjId = new Types.ObjectId(userId);

    // 1. Live Time & Stream History
    const allStreams = await LiveStream.find({ hostId: userObjId })
      .sort({ startedAt: -1 })
      .limit(50)
      .lean();

    let totalLifetimeLiveSeconds = 0;
    let totalStreamViews = 0;
    let peakViewerCount = 0;

    const streamHistory = allStreams.map((s) => {
      const start = new Date(s.startedAt).getTime();
      const end = s.endedAt ? new Date(s.endedAt).getTime() : start;
      const durationSeconds = Math.max(0, Math.floor((end - start) / 1000));
      totalLifetimeLiveSeconds += durationSeconds;
      totalStreamViews += s.totalViewers || 0;
      if ((s.viewerCount || 0) > peakViewerCount) peakViewerCount = s.viewerCount;

      return {
        _id: s._id,
        title: s.title,
        type: s.type,
        category: s.category,
        viewerCount: s.viewerCount,
        totalViewers: s.totalViewers,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        status: s.status,
        durationMinutes: Math.round(durationSeconds / 60),
      };
    });

    const totalLiveHours = Number((totalLifetimeLiveSeconds / 3600).toFixed(1));

    // 2. Gift History & Top Gifters
    const recentGifts = await Transaction.find({
      $or: [
        { targetId: userObjId, type: 'gift_send', status: 'completed' },
        { userId: userObjId, type: 'gift_receive', status: 'completed' },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('userId', 'uid nickname avatar')
      .lean();

    // Top Gifters aggregation
    const topGiftersAgg = await Transaction.aggregate([
      {
        $match: {
          targetId: userObjId,
          type: 'gift_send',
          status: 'completed',
        },
      },
      {
        $group: {
          _id: '$userId',
          totalCoins: { $sum: '$amount' },
          giftCount: { $sum: 1 },
        },
      },
      { $sort: { totalCoins: -1 } },
      { $limit: 10 },
    ]);

    const topGifterUserIds = topGiftersAgg.map((g) => g._id);
    const topGifterUsers = await User.find({ _id: { $in: topGifterUserIds } })
      .select('uid nickname avatar level')
      .lean();

    const topGifters = topGiftersAgg.map((g) => {
      const u = topGifterUsers.find((userDoc) => String(userDoc._id) === String(g._id));
      return {
        user: u || { _id: g._id, nickname: 'Anonymous', uid: '000000' },
        totalCoins: g.totalCoins,
        giftCount: g.giftCount,
      };
    });

    // Total gifts received coins
    const totalGiftsAgg = await Transaction.aggregate([
      {
        $match: {
          targetId: userObjId,
          type: 'gift_send',
          status: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalGiftCoinsLifetime = totalGiftsAgg[0]?.total || 0;
    const totalGiftsCountLifetime = totalGiftsAgg[0]?.count || 0;

    return {
      application: app,
      history: {
        liveTime: {
          totalStreams: allStreams.length,
          totalLifetimeLiveSeconds,
          totalLiveHours,
          recentStreams: streamHistory,
        },
        watchTime: {
          totalStreamViews,
          peakViewerCount,
          averageViewers:
            allStreams.length > 0 ? Math.round(totalStreamViews / allStreams.length) : 0,
        },
        gifts: {
          totalGiftCoinsLifetime,
          totalGiftsCountLifetime,
          topGifters,
          recentGifts,
        },
      },
    };
  },

  /**
   * Admin: Review (Approve / Reject) host application
   */
  async reviewApplication(
    applicationId: string,
    action: 'approve' | 'reject',
    adminId: string,
    reason?: string
  ) {
    const app = await OfficialHostApplication.findById(applicationId);
    if (!app) throw new AppError('Application not found', 404);

    if (app.status !== 'pending') {
      throw new AppError(`Application is already ${app.status}`, 400);
    }

    if (action === 'approve') {
      app.status = 'approved';
      app.reviewedBy = new Types.ObjectId(adminId);
      app.reviewedAt = new Date();
      await app.save();

      // Update user hostBadge
      const badgeToAssign = app.hostType; // 'alpha' or 'aurora'
      await User.findByIdAndUpdate(app.userId, {
        hostBadge: badgeToAssign,
        hostBadgeType: 'manual',
        hostBadgeAssignedAt: new Date(),
        role: 'host',
      });

      // Send congratulations notification
      notificationService
        .createNotification({
          userId: String(app.userId),
          type: 'system',
          title: `🎉 ${badgeToAssign === 'alpha' ? 'Alpha Host' : 'Aurora Host'} Approved!`,
          message: `Congratulations! Your host application has been approved by the Admin team. Your official ${badgeToAssign.toUpperCase()} HOST badge is now active!`,
          targetUrl: '/profile',
        })
        .catch(() => {});

      return { success: true, status: 'approved', badge: badgeToAssign };
    } else {
      app.status = 'rejected';
      app.rejectionReason = reason || 'Requirements not met or profile incomplete';
      app.reviewedBy = new Types.ObjectId(adminId);
      app.reviewedAt = new Date();
      await app.save();

      // Send rejection notification
      notificationService
        .createNotification({
          userId: String(app.userId),
          type: 'system',
          title: 'Host Application Update',
          message: `Your host application was not approved. Reason: ${app.rejectionReason}. You may re-apply once eligible.`,
          targetUrl: '/host-application',
        })
        .catch(() => {});

      return { success: true, status: 'rejected', reason: app.rejectionReason };
    }
  },
};
