import { User, ReferralTemplate, ReferralClaim, Agency } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getBangladeshDayBounds } from '../utils/date';

const DEFAULT_TEMPLATES = [
  {
    key: 'invite_special',
    title: 'Special Referral Invitation',
    thumbnail: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=400&q=80',
    badge: 'HOT',
    shareCount: 1420,
    downloadCount: 890,
    shareUrl: 'https://nevolive.com/invite?code={uid}',
    order: 1,
  },
  {
    key: 'invite_standard',
    title: 'Invite Friends & Win Rewards',
    thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=80',
    badge: 'NEW',
    shareCount: 650,
    downloadCount: 310,
    shareUrl: 'https://nevolive.com/join?referrer={uid}',
    order: 2,
  },
  {
    key: 'material_poster_1',
    title: 'Navo Live Streamer Banner',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
    badge: null,
    shareCount: 310,
    downloadCount: 450,
    shareUrl: 'https://nevolive.com/streamer?agent={uid}',
    order: 3,
  },
];

export const referralService = {
  async ensureSeedTemplates() {
    const count = await ReferralTemplate.countDocuments();
    if (count === 0) {
      await ReferralTemplate.insertMany(DEFAULT_TEMPLATES);
    }
  },

  async getSummary(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const inviteeCount = await User.countDocuments({ invitedBy: user._id });

    // Claims by this user
    const claims = await ReferralClaim.find({ userId: user._id });
    const claimedTotal = claims.reduce((acc, c) => acc + c.amount, 0);

    const { dateKey } = getBangladeshDayBounds();
    const todayClaim = await ReferralClaim.findOne({ userId: user._id, dateKey });

    const perInvite = 500; // 500 coins per invite
    const maxReward = 100000;
    const totalEarnable = Math.min(maxReward, inviteeCount * perInvite);
    const unclaimed = Math.max(0, totalEarnable - claimedTotal);
    const availableToday = todayClaim ? 0 : unclaimed;

    return {
      myId: user.uid,
      maxReward,
      claimed: claimedTotal,
      inviteeCount,
      availableToday,
      perInvite,
    };
  },

  async claimDailyReward(userId: string) {
    const { dateKey } = getBangladeshDayBounds();

    const alreadyClaimed = await ReferralClaim.findOne({ userId, dateKey });
    if (alreadyClaimed) {
      throw new AppError('Already claimed referral rewards today', 400);
    }

    const summary = await this.getSummary(userId);
    if (summary.availableToday <= 0) {
      throw new AppError('No referral rewards available to claim today', 400);
    }

    const amount = summary.availableToday;

    // Idempotent record create
    const claim = await ReferralClaim.create({
      userId,
      dateKey,
      amount,
      currency: 'coins',
      inviteeCount: summary.inviteeCount,
    });

    // Credit user coins atomically
    await User.updateOne({ _id: userId }, { $inc: { coins: amount } });

    return {
      claimed: amount,
      claimId: claim._id,
    };
  },

  async getRank(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const rankAgg = await ReferralClaim.aggregate([
      { $group: { _id: '$userId', totalAmount: { $sum: '$amount' } } },
      { $sort: { totalAmount: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
    ]);

    if (rankAgg.length > 0) {
      return rankAgg.map((r, i) => ({
        rank: skip + i + 1,
        user: {
          _id: r.user._id,
          uid: r.user.uid,
          nickname: r.user.nickname,
          avatar: r.user.avatar,
          level: r.user.level,
        },
        amount: r.totalAmount,
      }));
    }

    // Default mock rank data if database is fresh
    const topUsers = await User.find().limit(5);
    return topUsers.map((u, i) => ({
      rank: i + 1,
      user: {
        _id: u._id,
        uid: u.uid,
        nickname: u.nickname,
        avatar: u.avatar,
        level: u.level,
      },
      amount: (5 - i) * 15000,
    }));
  },

  async getTemplates(userId: string) {
    await this.ensureSeedTemplates();
    const user = await User.findById(userId).select('uid');
    const uid = user?.uid || '168000';

    const templates = await ReferralTemplate.find({ isActive: true }).sort({ order: 1 });
    return templates.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      thumbnail: t.thumbnail,
      badge: t.badge as any,
      shareCount: t.shareCount,
      downloadCount: t.downloadCount,
      shareUrl: t.shareUrl.replace('{uid}', uid),
    }));
  },

  async shareTemplate(userId: string, templateId: string) {
    const user = await User.findById(userId).select('uid');
    const uid = user?.uid || '168000';

    const template = await ReferralTemplate.findByIdAndUpdate(
      templateId,
      { $inc: { shareCount: 1 } },
      { new: true }
    );

    if (!template) throw new AppError('Template not found', 404);

    return {
      shareUrl: template.shareUrl.replace('{uid}', uid),
    };
  },

  async getMaterials(userId: string) {
    return this.getTemplates(userId);
  },

  async getReferralTasks() {
    return {
      rules: {
        maxDailyLiveHoursCounted: 2,
      },
      tasks: [
        { key: 'invite_1_friend', label: 'Invite 1 new friend to register', reward: 500, done: false },
        { key: 'invitee_watch_1h', label: 'Invitee watches live stream for ≥1 hour', reward: 1000, done: false },
        { key: 'invitee_becomes_host', label: 'Invitee passes verification and becomes host', reward: 5000, done: false },
        { key: 'invitee_stream_2h', label: 'Invited host streams ≥2 hours in a day', reward: 3000, done: false },
      ],
    };
  },

  async getTicker() {
    return [
      { nickname: 'SushilaThapa3020', claimed: 1000, earned: 5000 },
      { nickname: 'RohitKumar_88', claimed: 2500, earned: 12000 },
      { nickname: 'NadiaAkter', claimed: 500, earned: 3500 },
      { nickname: 'KingAlex', claimed: 5000, earned: 25000 },
    ];
  },

  async inviteHostToAgency(agentId: string, targetUserId: string, hostCode: string) {
    const agent = await User.findById(agentId);
    if (!agent || !agent.isAgent) {
      throw new AppError('Only registered agents can invite hosts', 403);
    }

    const agency = await Agency.findOne({ agentId });
    if (!agency) {
      throw new AppError('Agency not found for this agent', 404);
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw new AppError('Target host not found', 404);
    }

    if (targetUser.agencyId) {
      throw new AppError('This user is already part of an agency', 409);
    }

    // Add to agency members
    targetUser.agencyId = agency._id as any;
    targetUser.role = 'host';
    await targetUser.save();

    return {
      success: true,
      agencyId: agency._id,
      host: {
        _id: targetUser._id,
        uid: targetUser.uid,
        nickname: targetUser.nickname,
      },
    };
  },

  async getAgencyInvitations(agentId: string) {
    const agency = await Agency.findOne({ agentId });
    if (!agency) return [];

    const members = await User.find({ agencyId: agency._id })
      .select('uid nickname avatar createdAt')
      .sort({ createdAt: -1 });

    return members.map((m) => ({
      _id: m._id.toString(),
      invitee: {
        uid: m.uid,
        nickname: m.nickname,
        avatar: m.avatar,
      },
      status: 'accepted' as const,
      sentAt: m.createdAt.toISOString(),
    }));
  },
};
