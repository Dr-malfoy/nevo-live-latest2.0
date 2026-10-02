import mongoose from 'mongoose';
import { Transaction, User, PaymentConfig, getFormattedTxId } from '../models';
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
    let restrictionMessage: string | undefined = undefined;

    if (senderId) {
      const sender = await User.findById(senderId).select('_id role isAgent isAdmin agencyId');
      if (sender) {
        const senderIsAgent = Boolean(
          sender.role === 'agent' ||
          sender.isAgent ||
          sender.isAdmin ||
          (await Agency.exists({ agentId: sender._id }))
        );

        if (!senderIsAgent) {
          let senderAgency: any = null;
          if (sender.agencyId) {
            senderAgency = await Agency.findById(sender.agencyId);
          }
          if (!senderAgency) {
            senderAgency = await Agency.findOne({ hosts: sender._id });
          }

          if (senderAgency) {
            const agencyAgentId = senderAgency.agentId.toString();
            if (receiver._id.toString() === agencyAgentId) {
              isMyAgent = true;
            } else {
              allowed = false;
              restrictionMessage = `As a member of "${senderAgency.name}", you can only transfer coins to your own Agency Agent.`;
            }
          } else if (!receiverIsAgent) {
            allowed = false;
            restrictionMessage = 'Only certified agents can receive coin transfers.';
          }
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
        allowed,
        restrictionMessage,
      },
    };
  },

  async transferPoints(senderId: string, receiverUid: string, points: number) {
    const TRANSFER_UNIT = 100000;
    const MIN_TRANSFER = 100000; // 1 Unit = 100,000
    const CHARGE_PERCENT = 0.05; // 5% transfer charge

    const amount = Math.floor(Number(points));
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new AppError('Enter a valid transfer amount', 400);
    }

    // 1. Min 1 Unit = 100,000 points
    if (amount < MIN_TRANSFER) {
      throw new AppError('Minimum transfer is 1 Unit (100,000 Coins)', 400);
    }

    // 2. Exact multiple of 1 Unit = 100,000
    if (amount % TRANSFER_UNIT !== 0) {
      throw new AppError('Transfer amount must be an exact multiple of 1 Unit (100,000 Coins)', 400);
    }

    // 3. Sender check
    const sender = await User.findById(senderId);
    if (!sender) {
      throw new AppError('Sender not found', 404);
    }

    const { Agency } = await import('../models');

    // Check if sender is an Agent / Agency Owner / Admin
    const senderIsAgent = Boolean(
      sender.role === 'agent' ||
      sender.isAgent ||
      sender.isAdmin ||
      (await Agency.exists({ agentId: sender._id }))
    );

    // 4. Receiver check
    const cleanUid = receiverUid.trim();
    let receiver: any = await User.findOne({ uid: cleanUid });
    if (!receiver && mongoose.isValidObjectId(cleanUid)) {
      receiver = await User.findById(cleanUid);
    }
    if (!receiver) {
      receiver = await User.findOne({ phone: cleanUid });
    }
    if (!receiver) {
      throw new AppError('Receiver not found', 404);
    }

    if (receiver._id.toString() === senderId) {
      throw new AppError('Cannot transfer points to yourself', 400);
    }

    // 5. Transfer Role Permissions:
    // - AGENT: An Agent can transfer coins to ANY user AND to other agents.
    // - AGENCY MEMBER: A user of an agency can ONLY transfer coins to their own Agency Agent. They cannot transfer to other agents or users.
    // - NON-AGENCY USER: Can transfer to certified agents for trading.
    if (!senderIsAgent) {
      let senderAgency: any = null;
      if (sender.agencyId) {
        senderAgency = await Agency.findById(sender.agencyId);
      }
      if (!senderAgency) {
        senderAgency = await Agency.findOne({ hosts: sender._id });
      }

      if (senderAgency) {
        const agencyAgentId = senderAgency.agentId.toString();
        if (receiver._id.toString() !== agencyAgentId) {
          throw new AppError(
            `As a member of "${senderAgency.name}", you can only transfer coins directly to your Agency Agent. You cannot transfer coins to other agents.`,
            403
          );
        }
      } else {
        const receiverIsAgent = Boolean(
          receiver.isAgent ||
          receiver.role === 'agent' ||
          receiver.isAdmin ||
          (await Agency.exists({ agentId: receiver._id }))
        );
        if (!receiverIsAgent) {
          throw new AppError('Only certified agents can receive coin transfers. Join an agency to trade directly with your agent.', 403);
        }
      }
    }

    // 4. Calculate 5% transfer charge and final amount
    const charge = Math.round(amount * CHARGE_PERCENT); // 5% charge
    const finalAmount = amount - charge; // Final amount credited to receiver

    if ((sender.coins || 0) < amount) {
      throw new AppError(`Insufficient coin balance (Balance: ${(sender.coins || 0).toLocaleString()})`, 400);
    }

    // Atomic debit sender of full transfer amount in coins
    const updatedSender = await User.findOneAndUpdate(
      { _id: senderId, coins: { $gte: amount } },
      { $inc: { coins: -amount } },
      { new: true }
    );

    if (!updatedSender) {
      throw new AppError('Insufficient coin balance', 400);
    }

    // Atomic credit receiver of finalAmount (after 5% charge) in coins
    const updatedReceiver = await User.findOneAndUpdate(
      { _id: receiver._id },
      { $inc: { coins: finalAmount } },
      { new: true }
    );

    // Update Agency totalContribution if sender belongs to an agency
    if (sender.agencyId) {
      try {
        const { Agency } = await import('../models');
        await Agency.updateOne({ _id: sender.agencyId }, { $inc: { totalContribution: amount } });
      } catch {}
    }

    // Platform wallet / fee handling (credit platform cut in coins if PlatformWallet exists)
    try {
      const { PlatformWallet } = await import('../models');
      const platform = await PlatformWallet.getWallet();
      if (platform) {
        await PlatformWallet.updateOne({ _id: platform._id }, { $inc: { coins: charge } });
      }
    } catch {}

    // Write ledger entries
    await Transaction.create([
      {
        userId: senderId,
        type: 'transfer',
        amount: amount,
        currency: 'coin',
        targetId: receiver._id,
        targetModel: 'User',
        status: 'completed',
        description: `Transferred ${amount.toLocaleString()} coins to Agent ${receiver.nickname} (${receiver.uid}) [Fee (5%): ${charge.toLocaleString()}, Net: ${finalAmount.toLocaleString()}]`,
      },
      {
        userId: receiver._id,
        type: 'transfer',
        amount: finalAmount,
        currency: 'coin',
        targetId: senderId,
        targetModel: 'User',
        status: 'completed',
        description: `Received ${finalAmount.toLocaleString()} coins from ${updatedSender.nickname} (${updatedSender.uid}) [Gross: ${amount.toLocaleString()}, Fee (5%): ${charge.toLocaleString()}]`,
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

    return {
      points: amount,
      units: amount / TRANSFER_UNIT,
      charge,
      chargePercent: 5,
      finalAmount,
      balance: updatedSender.coins,
      currency: 'coin',
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
