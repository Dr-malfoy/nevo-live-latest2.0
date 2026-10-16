import mongoose from 'mongoose';
import { User, ReferralTemplate, ReferralClaim, ReferralRecord, Transaction, Agency } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getBangladeshDayBounds } from '../utils/date';
import { getIO } from '../socket';

/**
 * Navo Live Referral Service
 *
 * Rules:
 * - 1 Invite = 13,000 Coins (100 TK)
 * - 5 Invites = 65,000 Coins
 * - 10 Invites = VIP + 65,000 Coins
 * - 25 Invites = 10% Lifetime Commission from invited users' income
 *
 * Invitee Reward:
 * - New User Join = 13,000 Coins (100 TK) after registration + 10 min watch time
 *
 * Referral Validity Logic:
 * - Valid only if: OTP verified + WatchTime > 30 min + Login Day 2
 * - If DeviceID duplicate -> Invalid
 * - Coin Release: 50% instant (6,500 coins), 50% after Day 2 login (6,500 coins)
 */

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

  /**
   * Called during registration when a user signs up with an invite code.
   */
  async recordReferralOnSignup(params: {
    invitee: any;
    inviterId: any;
    inviteCode: string;
    deviceId?: string;
    otpVerified: boolean;
  }) {
    const { invitee, inviterId, inviteCode, deviceId, otpVerified } = params;

    if (!inviterId || !invitee || invitee._id.toString() === inviterId.toString()) {
      return null;
    }

    const inviter = await User.findById(inviterId);
    if (!inviter) return null;

    const { dateKey } = getBangladeshDayBounds();
    const cleanDeviceId = (deviceId || '').trim();

    // Check Duplicate DeviceID
    let isDuplicateDevice = false;
    let invalidReason: string | undefined = undefined;

    if (cleanDeviceId) {
      const existingDeviceUser = await User.findOne({
        deviceId: cleanDeviceId,
        _id: { $ne: invitee._id },
      });
      const existingDeviceRecord = await ReferralRecord.findOne({
        inviteeDeviceId: cleanDeviceId,
        inviteeId: { $ne: invitee._id },
      });

      if (existingDeviceUser || existingDeviceRecord) {
        isDuplicateDevice = true;
        invalidReason = 'duplicate_device';
        console.warn(`[Referral] Duplicate DeviceID detected (${cleanDeviceId}) for invitee ${invitee.uid}. Marked invalid.`);
      }
    }

    // Step 1: 50% instant release (6,500 coins) if unique device & OTP verified
    const canPayStep1 = !isDuplicateDevice && otpVerified;

    const record = await ReferralRecord.findOneAndUpdate(
      { inviteeId: invitee._id },
      {
        $setOnInsert: {
          inviterId: inviter._id,
          inviteeId: invitee._id,
          inviteCode: inviteCode || inviter.uid,
          inviteeDeviceId: cleanDeviceId || undefined,
          isDuplicateDevice,
          invalidReason,
          otpVerified,
          watchTimeMinutes: 0,
          signupDateKey: dateKey,
          loginDates: [dateKey],
          hasDay2Login: false,
          status: isDuplicateDevice ? 'invalid' : 'pending',
          step1Coins: 6500,
          step1Paid: canPayStep1,
          step1PaidAt: canPayStep1 ? new Date() : undefined,
          step2Coins: 6500,
          step2Paid: false,
          inviteeRewardPaid: false,
        },
      },
      { upsert: true, new: true }
    );

    // Save deviceId and invitedBy on user
    invitee.invitedBy = inviter._id;
    if (cleanDeviceId && !invitee.deviceId) {
      invitee.deviceId = cleanDeviceId;
    }
    if (!invitee.loginDates) invitee.loginDates = [];
    if (!invitee.loginDates.includes(dateKey)) invitee.loginDates.push(dateKey);
    invitee.lastLoginDateKey = dateKey;
    await invitee.save();

    console.log(`[Referral] Referral recorded: Inviter ${inviter.uid} -> Invitee ${invitee.uid} (status: ${record.status}, step1Paid: ${record.step1Paid})`);
    return record;
  },

  /**
   * Called on user login or authenticated active request.
   * Tracks distinct login dates and checks for Day 2 login fulfillment.
   */
  async onUserLogin(userId: string, deviceId?: string) {
    if (!userId) return;
    const { dateKey } = getBangladeshDayBounds();
    const cleanDeviceId = (deviceId || '').trim();

    const user = await User.findById(userId);
    if (!user) return;

    if (cleanDeviceId && !user.deviceId) {
      user.deviceId = cleanDeviceId;
    }
    if (!user.loginDates) user.loginDates = [];
    if (!user.loginDates.includes(dateKey)) {
      user.loginDates.push(dateKey);
    }
    user.lastLoginDateKey = dateKey;
    await user.save();

    // Check if user is an invitee in ReferralRecord
    const record = await ReferralRecord.findOne({ inviteeId: userId });
    if (!record) return;

    if (cleanDeviceId && !record.inviteeDeviceId) {
      record.inviteeDeviceId = cleanDeviceId;
    }
    if (!record.loginDates.includes(dateKey)) {
      record.loginDates.push(dateKey);
    }

    // Check Day 2 Login (login on a day after registration)
    if (dateKey !== record.signupDateKey) {
      record.hasDay2Login = true;
    }

    // Evaluate qualification rules
    if (!record.isDuplicateDevice && record.otpVerified) {
      // If Day 2 Login done and Watch Time >= 30 min -> Valid & release Step 2 (50% = 6,500 coins)
      if (record.hasDay2Login && record.watchTimeMinutes >= 30) {
        record.status = 'valid';
        if (!record.step2Paid) {
          record.step2Paid = true;
          record.step2PaidAt = new Date();
          console.log(`[Referral] Invitee ${user.uid} fulfilled all conditions! Step 2 (6,500 coins) unlocked for inviter.`);
          await this.checkAndAwardMilestones(record.inviterId.toString());
        }
      }
    }

    await record.save();
  },

  /**
   * Called whenever user watch time increases (e.g. watching live streams).
   * - Unlocks Invitee Reward (13,000 Coins / 100 TK) at >= 10 mins.
   * - Unlocks Inviter Step 2 (6,500 Coins) at >= 30 mins (with Day 2 login).
   */
  async onUserWatchTime(userId: string, minutes: number = 1) {
    if (!userId || minutes <= 0) return;

    await User.updateOne({ _id: userId }, { $inc: { totalWatchMinutes: minutes } });

    const record = await ReferralRecord.findOne({ inviteeId: userId });
    if (!record) return;

    record.watchTimeMinutes = (record.watchTimeMinutes || 0) + minutes;

    // 1. Invitee Reward: 13,000 Coins (100 TK) after registration + 10 min watch time
    if (
      record.watchTimeMinutes >= 10 &&
      !record.inviteeRewardPaid &&
      record.otpVerified &&
      !record.isDuplicateDevice
    ) {
      record.inviteeRewardPaid = true;
      record.inviteeRewardPaidAt = new Date();

      await User.updateOne({ _id: userId }, { $inc: { coins: 13000 } });
      await Transaction.create({
        userId,
        type: 'referral_bonus',
        amount: 13000,
        currency: 'coin',
        status: 'completed',
        description: 'New User Referral Welcome Bonus: 13,000 Coins (100 TK) for watching 10 mins',
      });

      console.log(`[Referral] Invitee ${userId} received welcome bonus of 13,000 coins (100 TK)!`);

      try {
        const io = getIO();
        io.to(`user:${userId}`).emit('toast', {
          type: 'success',
          message: '🎉 Congratulations! You received 13,000 Coins (100 TK) referral welcome bonus!',
        });
        const updatedUser = await User.findById(userId).select('coins diamonds');
        if (updatedUser) {
          io.to(`user:${userId}`).emit('balance:update', { coins: updatedUser.coins, diamonds: updatedUser.diamonds });
        }
      } catch {}
    }

    // 2. Inviter Step 2 Validation: WatchTime >= 30 min + Day 2 Login + OTP Verified
    if (
      record.watchTimeMinutes >= 30 &&
      record.hasDay2Login &&
      record.otpVerified &&
      !record.isDuplicateDevice
    ) {
      record.status = 'valid';
      if (!record.step2Paid) {
        record.step2Paid = true;
        record.step2PaidAt = new Date();
        console.log(`[Referral] Invitee ${userId} completed 30m watch time & Day 2 login! Step 2 (6,500 coins) unlocked.`);
        await this.checkAndAwardMilestones(record.inviterId.toString());
      }
    }

    await record.save();
  },

  /**
   * Checks inviter milestones:
   * - 10 Invites = VIP + 65,000 Coins
   * - 25 Invites = 10% Lifetime Commission from invited users' income
   */
  async checkAndAwardMilestones(inviterId: string) {
    const inviter = await User.findById(inviterId);
    if (!inviter) return;

    const validCount = await ReferralRecord.countDocuments({
      inviterId: inviter._id,
      status: 'valid',
    });

    // Milestone 10: VIP + 65,000 Coins
    if (validCount >= 10 && !inviter.isVip) {
      inviter.isVip = true;
      inviter.coins += 65000;
      await Transaction.create({
        userId: inviter._id,
        type: 'referral_bonus',
        amount: 65000,
        currency: 'coin',
        status: 'completed',
        description: 'Referral Milestone Reached (10 Valid Invites): VIP Status + 65,000 Bonus Coins',
      });
      console.log(`[Referral] Inviter ${inviter.uid} achieved 10 valid invites! VIP + 65k awarded.`);
    }

    // Milestone 25: 10% Lifetime Commission from invited users' income
    if (validCount >= 25 && !inviter.hasLifetimeReferralCommission) {
      inviter.hasLifetimeReferralCommission = true;
      inviter.lifetimeReferralCommissionPercent = 10;
      await Transaction.create({
        userId: inviter._id,
        type: 'platform_rewards',
        amount: 0,
        currency: 'coin',
        status: 'completed',
        description: 'Referral Milestone Reached (25 Valid Invites): 10% Lifetime Commission Unlocked',
      });
      console.log(`[Referral] Inviter ${inviter.uid} achieved 25 valid invites! 10% Lifetime Commission active.`);
    }

    await inviter.save();
  },

  /**
   * Distributes 10% Lifetime Commission to inviter when an invited user earns income (gifts, calls, etc.).
   */
  async distributeInviterLifetimeCommission(earningUserId: string, incomeCoins: number, sourceDescription: string) {
    if (!earningUserId || incomeCoins <= 0) return;

    const earner = await User.findById(earningUserId).select('invitedBy nickname').lean();
    if (!earner || !earner.invitedBy) return;

    const inviter = await User.findById(earner.invitedBy);
    if (!inviter) return;

    // Check if inviter has 25+ valid invites or unlocked lifetime commission
    const validCount = await ReferralRecord.countDocuments({ inviterId: inviter._id, status: 'valid' });
    if (validCount >= 25 || inviter.hasLifetimeReferralCommission) {
      if (!inviter.hasLifetimeReferralCommission) {
        inviter.hasLifetimeReferralCommission = true;
        inviter.lifetimeReferralCommissionPercent = 10;
        await inviter.save();
      }

      const commissionRate = (inviter.lifetimeReferralCommissionPercent || 10) / 100;
      const commissionCoins = Math.floor(incomeCoins * commissionRate);

      if (commissionCoins > 0) {
        await User.updateOne({ _id: inviter._id }, { $inc: { coins: commissionCoins } });
        await Transaction.create({
          userId: inviter._id,
          type: 'commission',
          amount: commissionCoins,
          currency: 'coin',
          status: 'completed',
          description: `10% Lifetime Referral Commission: ${commissionCoins} coins from ${earner.nickname} (${sourceDescription})`,
        });

        console.log(`[Referral] Paid 10% commission (${commissionCoins} coins) to inviter ${inviter.uid} from ${earner.nickname}`);
      }
    }
  },

  /**
   * Referral Dashboard Summary for /invite page
   */
  async getSummary(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // Fetch all referral records for this user as inviter
    const records = await ReferralRecord.find({ inviterId: user._id })
      .populate('inviteeId', 'uid nickname avatar createdAt phone')
      .sort({ createdAt: -1 });

    // Handle existing legacy users in User collection who may not have a ReferralRecord yet
    const legacyInvitedUsers = await User.find({ invitedBy: user._id }).select('_id uid nickname avatar createdAt phone');
    const existingInviteeIds = new Set(
      records.map((r) => ((r.inviteeId as any)?._id?.toString() || (r.inviteeId as any)?.toString()))
    );

    for (const legacyUser of legacyInvitedUsers) {
      if (!existingInviteeIds.has(legacyUser._id.toString())) {
        const { dateKey } = getBangladeshDayBounds(legacyUser.createdAt || new Date());
        const newRec = await ReferralRecord.create({
          inviterId: user._id,
          inviteeId: legacyUser._id,
          inviteCode: user.uid,
          isDuplicateDevice: false,
          otpVerified: true,
          watchTimeMinutes: 30, // grandfather legacy users
          signupDateKey: dateKey,
          loginDates: [dateKey, 'next-day'],
          hasDay2Login: true,
          status: 'valid',
          step1Coins: 6500,
          step1Paid: true,
          step1PaidAt: legacyUser.createdAt,
          step2Coins: 6500,
          step2Paid: true,
          step2PaidAt: legacyUser.createdAt,
          inviteeRewardPaid: true,
        });
        records.push(newRec as any);
      }
    }

    const inviteeCount = records.length;
    const validInviteeCount = records.filter((r) => r.status === 'valid').length;
    const pendingInviteeCount = records.filter((r) => r.status === 'pending').length;
    const invalidInviteeCount = records.filter((r) => r.status === 'invalid').length;

    // Calculate total earned: Step 1 (6,500) + Step 2 (6,500) + Milestone bonuses
    const step1Earned = records.filter((r) => r.step1Paid).reduce((acc, r) => acc + (r.step1Coins || 6500), 0);
    const step2Earned = records.filter((r) => r.step2Paid).reduce((acc, r) => acc + (r.step2Coins || 6500), 0);
    const milestoneBonus = validInviteeCount >= 10 ? 65000 : 0;

    const totalEarned = step1Earned + step2Earned + milestoneBonus;

    // Claims by this user
    const claims = await ReferralClaim.find({ userId: user._id });
    const claimedTotal = claims.reduce((acc, c) => acc + c.amount, 0);

    const unclaimed = Math.max(0, totalEarned - claimedTotal);
    const availableToday = unclaimed;

    const perInvite = 13000;
    const maxReward = 1000000;

    // Milestones tracker
    const milestones = [
      {
        count: 1,
        title: '1 Invite',
        reward: '13,000 Coins (100 TK)',
        coins: 13000,
        unlocked: validInviteeCount >= 1,
      },
      {
        count: 5,
        title: '5 Invites',
        reward: '65,000 Coins (500 TK)',
        coins: 65000,
        unlocked: validInviteeCount >= 5,
      },
      {
        count: 10,
        title: '10 Invites',
        reward: 'VIP Status + 65,000 Coins',
        coins: 65000,
        unlocked: validInviteeCount >= 10,
        perk: 'VIP Badge Activated',
      },
      {
        count: 25,
        title: '25 Invites',
        reward: '10% Lifetime Commission from invited users income',
        unlocked: validInviteeCount >= 25,
        perk: '10% Lifetime Commission',
      },
    ];

    // Detailed invitee status list for the UI
    const invitees = records.slice(0, 50).map((r) => {
      const invitee = (r.inviteeId as any) || {};
      const earnedFromInvitee = (r.step1Paid ? r.step1Coins : 0) + (r.step2Paid ? r.step2Coins : 0);

      return {
        _id: r._id,
        inviteeId: invitee._id,
        uid: invitee.uid || 'User',
        nickname: invitee.nickname || `User${(invitee.uid || '').slice(-4)}`,
        avatar: invitee.avatar || '',
        status: r.status,
        invalidReason: r.invalidReason || null,
        isDuplicateDevice: r.isDuplicateDevice,
        otpVerified: r.otpVerified,
        watchTimeMinutes: r.watchTimeMinutes || 0,
        hasDay2Login: r.hasDay2Login,
        step1Paid: r.step1Paid,
        step2Paid: r.step2Paid,
        coinsEarned: earnedFromInvitee,
        createdAt: r.createdAt,
      };
    });

    return {
      myId: user.uid,
      maxReward,
      claimed: claimedTotal,
      totalEarned,
      inviteeCount,
      validInviteeCount,
      pendingInviteeCount,
      invalidInviteeCount,
      availableToday,
      perInvite,
      isVip: Boolean(user.isVip),
      hasLifetimeCommission: Boolean(user.hasLifetimeReferralCommission || validInviteeCount >= 25),
      lifetimeCommissionPercent: user.lifetimeReferralCommissionPercent || 10,
      milestones,
      invitees,
    };
  },

  /**
   * Claim all available referral rewards
   */
  async claimDailyReward(userId: string) {
    const summary = await this.getSummary(userId);
    if (summary.availableToday <= 0) {
      throw new AppError('No referral rewards available to claim at this moment', 400);
    }

    const amount = summary.availableToday;
    const { dateKey } = getBangladeshDayBounds();

    let claim = await ReferralClaim.findOne({ userId, dateKey });
    if (claim) {
      claim.amount += amount;
      claim.inviteeCount = summary.inviteeCount;
      await claim.save();
    } else {
      claim = await ReferralClaim.create({
        userId,
        dateKey,
        amount,
        currency: 'coins',
        inviteeCount: summary.inviteeCount,
      });
    }

    // Credit user coins atomically
    await User.updateOne({ _id: userId }, { $inc: { coins: amount } });

    // Record Transaction
    await Transaction.create({
      userId,
      type: 'referral_bonus',
      amount,
      currency: 'coin',
      status: 'completed',
      description: `Claimed ${amount.toLocaleString()} referral reward coins`,
    });

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

    // Default top ranking users
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
      amount: (5 - i) * 65000,
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
        { key: 'invite_1_friend', label: '1 Invite = 13,000 Coins', reward: 13000, done: false },
        { key: 'invite_5_friends', label: '5 Invites = 65,000 Coins', reward: 65000, done: false },
        { key: 'invite_10_friends', label: '10 Invites = VIP + 65,000 Coins', reward: 65000, done: false },
        { key: 'invite_25_friends', label: '25 Invites = 10% Lifetime Commission', reward: 0, done: false },
      ],
    };
  },

  async getTicker() {
    return [
      { nickname: 'Zayan_99', claimed: 13000, earned: 65000 },
      { nickname: 'Amina_Live', claimed: 26000, earned: 130000 },
      { nickname: 'KingRaj', claimed: 65000, earned: 325000 },
      { nickname: 'StarHost_01', claimed: 13000, earned: 52000 },
    ];
  },

  async inviteHostToAgency(agentId: string, targetUserId: string, hostCode: string) {
    const agent = await User.findById(agentId);
    if (!agent || (!agent.isAgent && agent.role !== 'agent' && !agent.isAdmin && agent.role !== 'admin')) {
      throw new AppError('Only registered agents can invite hosts', 403);
    }

    let agency = await Agency.findOne({ agentId });
    if (!agency && agent.agencyId) {
      agency = await Agency.findById(agent.agencyId);
    }
    if (!agency) {
      throw new AppError('Agency not found for this agent', 404);
    }

    const isValidId = mongoose.isValidObjectId(targetUserId);
    const targetUser = await User.findOne({
      $or: [
        { uid: targetUserId },
        ...(isValidId ? [{ _id: targetUserId }] : []),
      ],
    });
    if (!targetUser) {
      throw new AppError('Target host not found', 404);
    }

    if (targetUser.agencyId) {
      throw new AppError('This user is already part of an agency', 409);
    }

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
    let agency = await Agency.findOne({ agentId });
    if (!agency) {
      const agent = await User.findById(agentId);
      if (agent?.agencyId) {
        agency = await Agency.findById(agent.agencyId);
      }
    }
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
