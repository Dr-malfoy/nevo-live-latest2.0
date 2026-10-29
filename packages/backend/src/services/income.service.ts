import mongoose from 'mongoose';
import { Transaction, User, PaymentConfig, getFormattedTxId } from '../models';
import { AppError } from '../middleware/errorHandler';

export type IncomeSourceKey = 'livestream' | 'party' | 'commission' | 'transfer' | 'platform_rewards';

const getRangeStartDate = (range: string = '1y'): Date | null => {
  const now = Date.now();
  if (range === '24h') return new Date(now - 24 * 60 * 60 * 1000);
  if (range === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
  if (range === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000);
  if (range === '1y' || range === '365d') return new Date(now - 365 * 24 * 60 * 60 * 1000);
  if (range === 'all') return null;
  return new Date(now - 365 * 24 * 60 * 60 * 1000);
};

export const incomeService = {
  async getIncomeSummary(userId: string, range: '24h' | '7d' | '30d' | '1y' | 'all' = '30d') {
    const user = await User.findById(userId).select('diamonds coins');
    if (!user) throw new AppError('User not found', 404);

    const startDate = getRangeStartDate(range);

    const query: any = {
      userId,
      status: { $in: ['completed', 'pending'] },
    };
    if (startDate) {
      query.createdAt = { $gte: startDate };
    }

    // Aggregate transactions for this user within the range
    const transactions = await Transaction.find(query);

    let livestreamPoints = 0;
    let partyPoints = 0;
    let commissionPoints = 0;
    let transferPoints = 0;
    let platformRewardPoints = 0;
    let unconfirmedPoints = 0;

    for (const tx of transactions) {
      if (tx.status === 'pending') {
        unconfirmedPoints += tx.amount || 0;
        continue;
      }

      const amount = tx.amount || 0;
      if (tx.type === 'gift_receive') {
        if (tx.sourceType === 'party') {
          partyPoints += amount;
        } else {
          livestreamPoints += amount;
        }
      } else if (tx.type === 'call_earning') {
        livestreamPoints += amount;
      } else if (tx.type === 'commission') {
        commissionPoints += amount;
      } else if (
        tx.type === 'transfer_in' ||
        (tx.type === 'transfer' && (!tx.description || !/^Transferred /i.test(tx.description)))
      ) {
        transferPoints += amount;
      } else if (
        [
          'daily_reward',
          'game_win',
          'task_reward',
          'signin_reward',
          'activity_reward',
          'spin_reward',
          'creator_reward',
          'ranking_prize',
          'referral_bonus',
          'platform_rewards',
        ].includes(tx.type)
      ) {
        platformRewardPoints += amount;
      }
    }

    const available = user.coins || 0;
    const total = available + unconfirmedPoints;

    return {
      available,
      total,
      unconfirmed: unconfirmedPoints,
      range,
      sources: [
        { key: 'livestream', label: 'Live Stream Earning', points: livestreamPoints },
        { key: 'party', label: 'Party Earning', points: partyPoints },
        { key: 'commission', label: 'Commission', points: commissionPoints },
        { key: 'transfer', label: 'Transfer Point', points: transferPoints },
        { key: 'platform_rewards', label: 'Platform Rewards', points: platformRewardPoints },
      ],
    };
  },

  async getIncomeSourceDrilldown(
    userId: string,
    key: IncomeSourceKey,
    range: string = '1y',
    page: number = 1,
    limit: number = 20
  ) {
    const startDate = getRangeStartDate(range);
    const filter: any = {
      userId,
      status: 'completed',
    };
    if (startDate) {
      filter.createdAt = { $gte: startDate };
    }

    if (key === 'livestream') {
      filter.$or = [
        { type: 'gift_receive', sourceType: { $ne: 'party' } },
        { type: 'call_earning' },
      ];
    } else if (key === 'party') {
      filter.type = 'gift_receive';
      filter.sourceType = 'party';
    } else if (key === 'commission') {
      filter.type = 'commission';
    } else if (key === 'transfer') {
      filter.$or = [
        { type: 'transfer_in' },
        { type: 'transfer', description: { $not: /^Transferred /i } },
      ];
    } else if (key === 'platform_rewards') {
      filter.type = {
        $in: [
          'daily_reward',
          'game_win',
          'task_reward',
          'signin_reward',
          'activity_reward',
          'spin_reward',
          'creator_reward',
          'ranking_prize',
          'referral_bonus',
          'platform_rewards',
        ],
      };
    }

    const total = await Transaction.countDocuments(filter);
    const rows = await Transaction.find(filter)
      .populate('targetId', '_id nickname avatar uid')
      .populate('giftId', 'name icon priceDiamonds')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalAgg = await Transaction.aggregate([
      { $match: filter },
      { $group: { _id: null, totalPoints: { $sum: '$amount' } } },
    ]);
    const totalPoints = totalAgg[0]?.totalPoints || 0;

    const data = rows.map((r) => {
      const fromUser = r.targetId as any;
      const gift = r.giftId as any;
      return {
        _id: r._id.toString(),
        txId: getFormattedTxId(r),
        from: fromUser
          ? {
              _id: fromUser._id,
              nickname: fromUser.nickname,
              avatar: fromUser.avatar,
              uid: fromUser.uid,
            }
          : undefined,
        points: r.amount,
        currency: r.currency || 'coin',
        type: r.type,
        sourceType: r.sourceType,
        giftName: gift?.name || r.description,
        giftIcon: gift?.icon,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      };
    });

    return {
      data,
      total,
      totalPoints,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      range,
    };
  },

  async exchangePoints(userId: string, points: number) {
    if (!points || points <= 0) {
      throw new AppError('Enter a valid points amount to exchange', 400);
    }

    const config = await PaymentConfig.getConfig();
    const rate = config.coinRate && config.diamondRate ? config.coinRate / config.diamondRate : 1;
    const coinsToAdd = Math.floor(points * rate);

    // Atomic deduction
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, diamonds: { $gte: points } },
      { $inc: { diamonds: -points, coins: coinsToAdd } },
      { new: true }
    );

    if (!updatedUser) {
      throw new AppError('Insufficient diamonds', 409);
    }

    await Transaction.create({
      userId,
      type: 'game_win',
      amount: coinsToAdd,
      currency: 'coin',
      status: 'completed',
      description: `Exchanged ${points} diamonds for ${coinsToAdd} coins`,
    });

    return {
      diamonds: updatedUser.diamonds,
      coins: updatedUser.coins,
    };
  },

  async getTransferQuote(receiverUid: string, senderId?: string) {
    if (!receiverUid || !receiverUid.trim()) throw new AppError('Receiver UID is required', 400);

    const cleanUid = receiverUid.trim();
    let receiver: any = await User.findOne({ uid: cleanUid }).select('_id uid nickname avatar coins diamonds isAgent role phone');
    if (!receiver && mongoose.isValidObjectId(cleanUid)) {
      receiver = await User.findById(cleanUid).select('_id uid nickname avatar coins diamonds isAgent role phone');
    }
    if (!receiver) {
      receiver = await User.findOne({ phone: cleanUid }).select('_id uid nickname avatar coins diamonds isAgent role phone');
    }
    if (!receiver) {
      throw new AppError('Receiver account not found', 404);
    }

    const { Agency } = await import('../models');
    const receiverIsAgent = Boolean(
      receiver.isAgent ||
      receiver.role === 'agent' ||
      (await Agency.exists({ agentId: receiver._id }))
    );

    let isMyAgent = false;
    let allowed = true;

    if (senderId) {
      const sender = await User.findById(senderId).select('_id agencyId');
      if (sender && sender.agencyId) {
        const senderAgency = await Agency.findById(sender.agencyId);
        if (senderAgency && receiver._id.toString() === senderAgency.agentId.toString()) {
          isMyAgent = true;
        }
      }
    }

    return {
      receiver: {
        _id: receiver._id.toString(),
        uid: receiver.uid,
        nickname: receiver.nickname,
        avatar: receiver.avatar || '',
        coins: receiver.coins || 0,
        diamonds: receiver.diamonds || 0,
        isAgent: receiverIsAgent,
        role: receiver.role,
        isMyAgent,
        allowed: true,
      },
    };
  },

  async transferPoints(senderId: string, receiverUid: string, points: number, currency: 'diamond' | 'coin' = 'diamond') {
    const amount = Math.floor(Number(points));
    if (!amount || isNaN(amount) || amount < 1) {
      throw new AppError(`Enter a valid transfer amount (minimum 1 ${currency === 'diamond' ? 'Diamond' : 'Coin'})`, 400);
    }

    // Sender check
    const sender = await User.findById(senderId);
    if (!sender) {
      throw new AppError('Sender not found', 404);
    }

    // Receiver check
    const cleanUid = String(receiverUid || '').trim();
    let receiver: any = null;
    if (mongoose.isValidObjectId(cleanUid)) {
      receiver = await User.findById(cleanUid);
    }
    if (!receiver) {
      receiver = await User.findOne({ uid: cleanUid });
    }
    if (!receiver) {
      receiver = await User.findOne({ phone: cleanUid });
    }
    if (!receiver) {
      throw new AppError('Receiver not found', 404);
    }

    if (receiver._id.toString() === senderId) {
      throw new AppError(`Cannot transfer ${currency === 'diamond' ? 'diamonds' : 'coins'} to yourself`, 400);
    }

    // 0% fee: recipient receives exact amount sent (e.g. 1,000 sent = 1,000 received)
    const charge = 0;
    const finalAmount = amount;
    const balanceField = currency === 'diamond' ? 'diamonds' : 'coins';
    const senderBalance = Number(sender[balanceField] || 0);

    if (senderBalance < amount) {
      throw new AppError(`Insufficient ${currency} balance (Balance: ${senderBalance.toLocaleString()})`, 400);
    }

    // Atomic debit sender of full transfer amount in diamond/coin
    const updatedSender = await User.findOneAndUpdate(
      { _id: senderId, [balanceField]: { $gte: amount } },
      { $inc: { [balanceField]: -amount } },
      { new: true }
    );

    if (!updatedSender) {
      throw new AppError(`Insufficient ${currency} balance`, 400);
    }

    // Atomic credit receiver of full transfer amount in diamond/coin
    const updatedReceiver = await User.findOneAndUpdate(
      { _id: receiver._id },
      { $inc: { [balanceField]: finalAmount } },
      { new: true }
    );

    // Update Agency totalContribution if sender belongs to an agency
    if (sender.agencyId) {
      try {
        const { Agency } = await import('../models');
        await Agency.updateOne({ _id: sender.agencyId }, { $inc: { totalContribution: amount } });
      } catch {}
    }

    // Write ledger entries
    const currencyName = currency === 'diamond' ? 'diamonds' : 'coins';
    await Transaction.create([
      {
        userId: senderId,
        type: 'transfer',
        amount: amount,
        currency,
        targetId: receiver._id,
        targetModel: 'User',
        status: 'completed',
        description: `Transferred ${amount.toLocaleString()} ${currencyName} to ${receiver.nickname} (${receiver.uid}) [Fee: Free, Net: ${finalAmount.toLocaleString()}]`,
      },
      {
        userId: receiver._id,
        type: 'transfer',
        amount: finalAmount,
        currency,
        targetId: senderId,
        targetModel: 'User',
        status: 'completed',
        description: `Received ${finalAmount.toLocaleString()} ${currencyName} from ${updatedSender.nickname} (${updatedSender.uid}) [Gross: ${amount.toLocaleString()}, Fee: Free]`,
      },
    ]);

    // Push real-time balance updates to both sender and receiver
    try {
      const { getIO } = await import('../socket');
      const io = getIO();
      if (io) {
        io.to(`user:${senderId}`).emit('balance:update', {
          coins: updatedSender.coins,
          diamonds: updatedSender.diamonds,
        });
        if (updatedReceiver) {
          io.to(`user:${receiver._id}`).emit('balance:update', {
            coins: updatedReceiver.coins,
            diamonds: updatedReceiver.diamonds,
          });
        }
      }
    } catch {}

    // Send push + in-app notification to receiver
    try {
      const { notificationService } = await import('./notification.service');
      const icon = currency === 'diamond' ? '💎' : '💰';
      const capName = currency === 'diamond' ? 'Diamond' : 'Coin';
      notificationService
        .createNotification({
          userId: receiver._id.toString(),
          type: (`${currency}_transfer` as any),
          title: `${capName} Transfer Received ${icon}`,
          message: `You received ${finalAmount.toLocaleString()} ${currencyName} from ${updatedSender.nickname} (${updatedSender.uid})`,
          senderId: senderId,
          senderInfo: {
            nickname: updatedSender.nickname,
            avatar: updatedSender.avatar,
            uid: updatedSender.uid,
          },
          targetUrl: '/wallet',
          data: { amount: finalAmount, senderId, senderUid: updatedSender.uid, currency },
        })
        .catch(() => {});
    } catch {}

    return {
      points: amount,
      amount,
      charge: 0,
      chargePercent: 0,
      finalAmount: amount,
      balance: updatedSender[balanceField],
      currency,
    };
  },

  async getTransferHistory(userId: string, page: number = 1, limit: number = 20) {
    const filter = { userId, type: 'transfer' };
    const total = await Transaction.countDocuments(filter);
    const rows = await Transaction.find(filter)
      .populate('targetId', 'uid nickname avatar role isAgent')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const data = rows.map((r) => {
      const target = r.targetId as any;
      return {
        _id: r._id.toString(),
        txId: getFormattedTxId(r as any),
        receiver: {
          _id: target?._id ? target._id.toString() : '',
          uid: target?.uid || '',
          nickname: target?.nickname || 'Agent',
          avatar: target?.avatar || '',
          isAgent: !!target?.isAgent,
        },
        points: r.amount,
        currency: r.currency || 'coin',
        status: r.status as 'pending' | 'completed' | 'failed',
        description: r.description || '',
        createdAt: r.createdAt.toISOString(),
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },
};
