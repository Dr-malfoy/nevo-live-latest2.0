import mongoose from 'mongoose';
import { Gift, User, Transaction, PlatformWallet, Agency, LiveStream } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getIO } from '../socket';
import { notificationService } from './notification.service';
import { calculateWealthLevel } from '../utils/userLevels';
import { calculateGiftCoinDistribution, getAgencyCommissionByLevel } from '../utils/agencyTiers';
import { calculateAgencyLevel } from './agency.service';
import { referralService } from './referral.service';

export const giftService = {
  async listActiveGifts() {
    return Gift.find({ isActive: true }).sort({ order: 1 });
  },

  async sendGift(
    senderId: string,
    receiverId: string,
    giftId: string,
    quantity: number = 1,
    /** §4.1 — which surface the gift came from, so income can split live vs party. */
    sourceType: 'live' | 'party' | 'call' | 'other' = 'other'
  ) {
    const receiverObjId = mongoose.Types.ObjectId.isValid(receiverId) ? new mongoose.Types.ObjectId(receiverId) : receiverId;

    // Auto-detect if receiver is currently live hosting a live stream
    if (!sourceType || sourceType === 'other') {
      const activeStream = await LiveStream.findOne({
        hostId: { $in: [receiverObjId, receiverId] },
        status: 'live',
      }).select('_id').lean();
      if (activeStream) {
        sourceType = 'live';
      }
    }

    const gift = await Gift.findById(giftId);
    if (!gift || !gift.isActive) throw new AppError('Gift not found', 404);

    const sender = await User.findById(senderId);
    if (!sender) throw new AppError('Sender not found', 404);

    const receiver = await User.findById(receiverId);
    if (!receiver) throw new AppError('Receiver not found', 404);

    const totalCost = gift.priceDiamonds * quantity;
    const canPayWithDiamonds = (sender.diamonds || 0) >= totalCost;
    const canPayWithCoins = (sender.coins || 0) >= totalCost;
    if (!canPayWithDiamonds && !canPayWithCoins) {
      throw new AppError('Insufficient balance to send gift', 400);
    }

    const payCurrency: 'diamond' | 'coin' = canPayWithDiamonds ? 'diamond' : 'coin';
    const deductField = payCurrency === 'diamond' ? 'diamonds' : 'coins';

    // Atomic deduction from sender — prevents double-spend
    const updatedSender = await User.findOneAndUpdate(
      { _id: senderId, [deductField]: { $gte: totalCost } },
      { $inc: { [deductField]: -totalCost } },
      { new: true }
    );
    if (!updatedSender) {
      throw new AppError('Insufficient balance to send gift', 400);
    }
    sender.coins = updatedSender.coins;
    sender.diamonds = updatedSender.diamonds;

    // Resolve agency & agent if receiver is associated with an agency
    let agency: any = null;
    let agentUser: any = null;

    if (receiver.agencyId) {
      agency = await Agency.findOne({ _id: receiver.agencyId, isBanned: { $ne: true } });
    }
    if (!agency) {
      agency = await Agency.findOne({ hosts: receiver._id, isBanned: { $ne: true } });
    }
    if (!agency) {
      agency = await Agency.findOne({ agentId: receiver._id, isBanned: { $ne: true } });
    }

    if (agency && agency.agentId) {
      agentUser = await User.findById(agency.agentId);
      // Auto-link agencyId on receiver and ensure receiver._id is in agency.hosts
      if (!receiver.agencyId) {
        await User.updateOne({ _id: receiver._id }, { $set: { agencyId: agency._id } });
        receiver.agencyId = agency._id;
      }
      if (agency.hosts && !agency.hosts.some((h: any) => h.toString() === receiver._id.toString())) {
        await Agency.updateOne({ _id: agency._id }, { $addToSet: { hosts: receiver._id } });
      }
      if (agentUser && !agentUser.isAgent) {
        await User.updateOne({ _id: agentUser._id }, { $set: { isAgent: true, role: 'agent' } });
        agentUser.isAgent = true;
      }
    }

    // Calculate coin distribution based on agency tier (1 diamond = 1 coin)
    // Host: 70% in coins
    // Agency (Agent): 4% to 20% tier-wise directly to agent account
    // Admin: Remainder (10% to 26% tier-wise, or 30% if no agency)
    const distribution = calculateGiftCoinDistribution(totalCost, agency);
    const { hostCoins, agencyCoins, adminCoins, agencyTier, tierConfig, agencyShareRate, adminShareRate } = distribution;

    // 1. Host receives coins (1 diamond = 1 coin, 70% share)
    const receiverNewWealthExp = (receiver.wealthExp || 0) + hostCoins;
    const receiverWealthInfo = calculateWealthLevel(receiverNewWealthExp, receiver.wealthLevel);
    const updatedReceiver = await User.findOneAndUpdate(
      { _id: receiverId },
      {
        $inc: { coins: hostCoins, wealthExp: hostCoins },
        $set: { wealthLevel: Math.max(receiver.wealthLevel || 1, receiverWealthInfo.level) },
      },
      { new: true }
    );
    if (updatedReceiver) {
      receiver.coins = updatedReceiver.coins;
      receiver.wealthExp = updatedReceiver.wealthExp;
      receiver.wealthLevel = updatedReceiver.wealthLevel;
    }

    // 1b. If gift is sent in a live stream, increment live stream earnings
    if (sourceType === 'live') {
      LiveStream.findOneAndUpdate(
        { hostId: { $in: [receiverObjId, receiverId] }, status: 'live' },
        { $inc: { earningsCoins: hostCoins } },
        { new: true, sort: { startedAt: -1 } }
      ).then(async (updated) => {
        if (!updated) {
          const recentStream = await LiveStream.findOne({
            hostId: { $in: [receiverObjId, receiverId] },
          }).sort({ startedAt: -1 });
          if (recentStream && Date.now() - new Date(recentStream.startedAt).getTime() < 86400000) {
            recentStream.earningsCoins = (recentStream.earningsCoins || 0) + hostCoins;
            await recentStream.save();
          }
        }
      }).catch((err) => console.warn('Failed to update live stream earningsCoins:', err));
    }

    // 2. Agency's coin share flows directly into the Agent's account
    let updatedAgentCoins = agentUser?.coins || 0;
    if (agentUser && agencyCoins > 0) {
      const updatedAgent = await User.findOneAndUpdate(
        { _id: agentUser._id },
        { $inc: { coins: agencyCoins } },
        { new: true }
      );
      if (updatedAgent) {
        updatedAgentCoins = updatedAgent.coins;
        agentUser.coins = updatedAgent.coins;
        if (receiverId.toString() === agentUser._id.toString()) {
          receiver.coins = updatedAgent.coins;
        }
      }
    }

    // Increment agency total contribution and sync dynamic level & commission
    if (agency) {
      const newContrib = (agency.totalContribution || 0) + totalCost;
      const levelInfo = calculateAgencyLevel(newContrib, agency.totalLiveHours || 0);
      const newLevel = Math.max(agency.level || 1, levelInfo.level);
      const newCommission = getAgencyCommissionByLevel(newLevel);
      await Agency.updateOne(
        { _id: agency._id },
        {
          $inc: { totalContribution: totalCost },
          $set: { level: newLevel, commission: newCommission }
        }
      );
    }

    // 3. Platform wallet receives admin cut in coins
    const platform = await PlatformWallet.getWallet();
    await PlatformWallet.updateOne({ _id: platform._id }, { $inc: { coins: adminCoins } });

    let adminUserId = platform.adminId;
    if (!adminUserId) {
      const adminUser = await User.findOne({ role: 'admin' }).select('_id');
      if (adminUser) adminUserId = adminUser._id as any;
    }

    // Build transactions
    const transactionsToCreate: any[] = [
      {
        userId: senderId,
        type: 'gift_send',
        amount: totalCost,
        currency: payCurrency,
        targetId: receiverId,
        targetModel: 'User',
        giftId: gift._id,
        status: 'completed',
        description: `Sent ${quantity}x ${gift.name} to ${receiver.nickname} (${totalCost} ${payCurrency}s)`,
      },
      {
        userId: receiverId,
        type: 'gift_receive',
        amount: hostCoins,
        currency: 'coin',
        sourceType,
        targetId: senderId,
        targetModel: 'User',
        giftId: gift._id,
        status: 'completed',
        description: `Received ${quantity}x ${gift.name} from ${sender.nickname} (70% host share: ${hostCoins} coins)`,
      },
    ];

    if (agentUser && agencyCoins > 0) {
      const tierLabel = tierConfig?.label || (agencyTier ? String(agencyTier).toUpperCase() : 'Agency');
      transactionsToCreate.push({
        userId: agentUser._id,
        type: 'commission',
        amount: agencyCoins,
        currency: 'coin',
        sourceType,
        targetId: receiverId,
        targetModel: 'User',
        giftId: gift._id,
        status: 'completed',
        description: `Agency commission (${tierLabel} ${(agencyShareRate * 100).toFixed(0)}%): ${agencyCoins} coins from ${sender.nickname}'s gift to ${receiver.nickname}`,
      });
    }

    transactionsToCreate.push({
      userId: adminUserId || receiverId,
      type: 'gift_cut',
      amount: adminCoins,
      currency: 'coin',
      sourceType,
      targetId: senderId,
      targetModel: 'User',
      giftId: gift._id,
      status: 'completed',
      description: `Admin cut (${(adminShareRate * 100).toFixed(0)}% share: ${adminCoins} coins) from ${quantity}x ${gift.name}`,
    });

    await Transaction.create(transactionsToCreate);

    // Distribute 10% Lifetime Referral Commission to inviter if qualified (25+ invites)
    referralService.distributeInviterLifetimeCommission(
      receiverId.toString(),
      hostCoins,
      `Stream gift: ${quantity}x ${gift.name}`
    ).catch((err) => console.error('[Referral] Lifetime commission distribution error:', err));

    // Push real-time balance updates to parties (per-user socket rooms)
    try {
      const io = getIO();
      const isSelfAgent = agentUser && receiverId.toString() === agentUser._id.toString();

      // Receiver (Host) balance update
      io.to(`user:${receiverId}`).emit('balance:update', {
        coins: receiver.coins,
        diamonds: receiver.diamonds,
        wealthExp: receiver.wealthExp,
        wealthLevel: receiver.wealthLevel,
        deltaCoins: isSelfAgent ? hostCoins + agencyCoins : hostCoins,
      });

      // Sender balance update
      io.to(`user:${senderId}`).emit('balance:update', {
        coins: sender.coins,
        diamonds: sender.diamonds,
        wealthExp: sender.wealthExp,
        wealthLevel: sender.wealthLevel,
      });

      // Agency Agent balance update (when distinct from host)
      if (agentUser && agencyCoins > 0 && !isSelfAgent) {
        io.to(`user:${agentUser._id}`).emit('balance:update', {
          coins: updatedAgentCoins,
          diamonds: agentUser.diamonds,
          deltaCoins: agencyCoins,
        });
      }
    } catch {
      // Socket not initialized — balances already persisted
    }

    // Real-time notifications
    try {
      await notificationService.createNotification(
        receiverId,
        'gift',
        'New Gift Received!',
        `${sender.nickname} sent you ${quantity}x ${gift.name} (+${hostCoins} Coins)`,
        { giftId: gift._id, quantity, coinsEarned: hostCoins }
      );

      if (agentUser && agencyCoins > 0) {
        const isSelfAgent = receiverId.toString() === agentUser._id.toString();
        await notificationService.createNotification(
          agentUser._id.toString(),
          'system',
          'Agency Commission Received',
          isSelfAgent
            ? `You earned ${agencyCoins} Coins (${(agencyShareRate * 100).toFixed(0)}% agency commission) from your stream gift!`
            : `Your agency earned ${agencyCoins} Coins (${(agencyShareRate * 100).toFixed(0)}% commission) from ${sender.nickname}'s gift to host ${receiver.nickname}`,
          { giftId: gift._id, quantity, agencyCoins, hostId: receiverId }
        );
      }
    } catch {
      // Notification failure must not block the gift
    }

    return {
      gift,
      quantity,
      totalCost,
      payCurrency,
      senderCoins: sender.coins,
      senderDiamonds: sender.diamonds,
      senderBalance: sender.coins, // backwards compatible
      receiverEarned: hostCoins,
      receiverCoins: receiver.coins,
      receiverDiamonds: receiver.diamonds,
      agencyEarned: agencyCoins,
      adminEarned: adminCoins,
      agencyTier,
      agencyPercent: Math.round(agencyShareRate * 100),
      adminPercent: Math.round(adminShareRate * 100),
      hostPercent: 70,
    };
  },
};
