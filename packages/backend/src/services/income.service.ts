import { Transaction, User, PaymentConfig } from '../models';
import { AppError } from '../middleware/errorHandler';

export type IncomeSourceKey = 'livestream' | 'party' | 'commission' | 'transfer' | 'platform_rewards';

const getRangeStartDate = (range: string = '30d'): Date => {
  const now = Date.now();
  if (range === '24h') return new Date(now - 24 * 60 * 60 * 1000);
  if (range === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
  return new Date(now - 30 * 24 * 60 * 60 * 1000);
};

export const incomeService = {
  async getIncomeSummary(userId: string, range: '24h' | '7d' | '30d' = '30d') {
    const user = await User.findById(userId).select('diamonds coins');
    if (!user) throw new AppError('User not found', 404);

    const startDate = getRangeStartDate(range);

    // Aggregate transactions for this user within the range
    const transactions = await Transaction.find({
      userId,
      createdAt: { $gte: startDate },
      status: { $in: ['completed', 'pending'] },
    });

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
      } else if (tx.type === 'commission') {
        commissionPoints += amount;
      } else if (tx.type === 'transfer' && tx.currency === 'diamond') {
        transferPoints += amount;
      } else if (tx.type === 'daily_reward' || tx.type === 'game_win') {
        platformRewardPoints += amount;
      }
    }

    const available = user.diamonds || 0;
    const total = available + unconfirmedPoints;

    return {
      available,
      total,
      unconfirmed: unconfirmedPoints,
      range,
      sources: [
        { key: 'livestream', label: 'Livestream', points: livestreamPoints },
        { key: 'party', label: 'Party', points: partyPoints },
        { key: 'commission', label: 'Commission', points: commissionPoints },
        { key: 'transfer', label: 'Transfer Points', points: transferPoints },
        { key: 'platform_rewards', label: 'Platform Rewards', points: platformRewardPoints },
      ],
    };
  },

  async getIncomeSourceDrilldown(
    userId: string,
    key: IncomeSourceKey,
    range: '24h' | '7d' | '30d' = '30d',
    page: number = 1,
    limit: number = 20
  ) {
    const startDate = getRangeStartDate(range);
    const filter: any = {
      userId,
      createdAt: { $gte: startDate },
      status: 'completed',
    };

    if (key === 'livestream') {
      filter.type = 'gift_receive';
      filter.sourceType = { $ne: 'party' };
    } else if (key === 'party') {
      filter.type = 'gift_receive';
      filter.sourceType = 'party';
    } else if (key === 'commission') {
      filter.type = 'commission';
    } else if (key === 'transfer') {
      filter.type = 'transfer';
    } else if (key === 'platform_rewards') {
      filter.type = { $in: ['daily_reward', 'game_win'] };
    }

    const total = await Transaction.countDocuments(filter);
    const rows = await Transaction.find(filter)
      .populate('targetId', '_id nickname avatar uid')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const data = rows.map((r) => {
      const fromUser = r.targetId as any;
      return {
        _id: r._id.toString(),
        from: fromUser
          ? {
              _id: fromUser._id,
              nickname: fromUser.nickname,
              avatar: fromUser.avatar,
              uid: fromUser.uid,
            }
          : undefined,
        points: r.amount,
        giftName: r.description,
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

  async getTransferQuote(receiverUid: string) {
    if (!receiverUid) throw new AppError('Receiver UID is required', 400);

    const receiver = await User.findOne({ uid: receiverUid }).select('uid nickname avatar isAgent');
    if (!receiver) {
      throw new AppError('Receiver account not found', 404);
    }

    return {
      receiver: {
        uid: receiver.uid,
        nickname: receiver.nickname,
        avatar: receiver.avatar,
        isAgent: !!receiver.isAgent,
      },
    };
  },

  async transferPoints(senderId: string, receiverUid: string, points: number) {
    // 1. Min 500,000 points
    if (points < 500000) {
      throw new AppError('Minimum transfer is 500,000 points', 400);
    }

    // 2. Exact multiple of 100,000
    if (points % 100000 !== 0) {
      throw new AppError('Amount must be a multiple of 100,000', 400);
    }

    // 3. Receiver check
    const receiver = await User.findOne({ uid: receiverUid });
    if (!receiver) {
      throw new AppError('Receiver not found', 404);
    }
    if (!receiver.isAgent) {
      throw new AppError('Only agent can receive point transfers', 400);
    }

    if (receiver._id.toString() === senderId) {
      throw new AppError('Cannot transfer points to yourself', 400);
    }

    // 4. Atomic debit sender
    const updatedSender = await User.findOneAndUpdate(
      { _id: senderId, diamonds: { $gte: points } },
      { $inc: { diamonds: -points } },
      { new: true }
    );

    if (!updatedSender) {
      throw new AppError('Insufficient diamonds balance', 400);
    }

    // 5. Credit receiver
    const updatedReceiver = await User.findOneAndUpdate(
      { _id: receiver._id },
      { $inc: { diamonds: points } },
      { new: true }
    );

    // 6. Write ledger entries
    await Transaction.create([
      {
        userId: senderId,
        type: 'transfer',
        amount: points,
        currency: 'diamond',
        targetId: receiver._id,
        targetModel: 'User',
        status: 'completed',
        description: `Transferred ${points} diamonds to Agent ${receiver.nickname} (${receiver.uid})`,
      },
      {
        userId: receiver._id,
        type: 'transfer',
        amount: points,
        currency: 'diamond',
        targetId: senderId,
        targetModel: 'User',
        status: 'completed',
        description: `Received ${points} diamonds from ${updatedSender.nickname} (${updatedSender.uid})`,
      },
    ]);

    return {
      points,
      balance: updatedSender.diamonds,
    };
  },

  async getTransferHistory(userId: string, page: number = 1, limit: number = 20) {
    const filter = { userId, type: 'transfer' };
    const total = await Transaction.countDocuments(filter);
    const rows = await Transaction.find(filter)
      .populate('targetId', 'uid nickname avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const data = rows.map((r) => {
      const target = r.targetId as any;
      return {
        _id: r._id.toString(),
        receiver: {
          uid: target?.uid || '',
          nickname: target?.nickname || 'Agent',
          avatar: target?.avatar || '',
        },
        points: r.amount,
        status: r.status as 'pending' | 'completed' | 'failed',
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
