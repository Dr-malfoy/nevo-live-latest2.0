import { Gift, User, Transaction, PlatformWallet } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getIO } from '../socket';
import { notificationService } from './notification.service';
import { calculateWealthLevel } from '../utils/userLevels';

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

    // Add Diamonds to receiver (standard host takes 70%, Alpha/Aurora premium host takes 75% with +5% bonus, remainder to admin)
    const isPremiumBadge = receiver.hostBadge === 'alpha' || receiver.hostBadge === 'aurora';
    const hostShareRate = isPremiumBadge ? 0.75 : 0.70;
    const adminShareRate = isPremiumBadge ? 0.25 : 0.30;
    const hostDiamonds = Math.floor(totalCost * hostShareRate);
    const adminDiamonds = Math.floor(totalCost * adminShareRate);

    // Receiver earned income -> increments diamonds AND cumulative wealthExp
    const receiverNewWealthExp = (receiver.wealthExp || 0) + hostDiamonds;
    const receiverWealthInfo = calculateWealthLevel(receiverNewWealthExp, receiver.wealthLevel);
    const updatedReceiver = await User.findOneAndUpdate(
      { _id: receiverId },
      {
        $inc: { diamonds: hostDiamonds, wealthExp: hostDiamonds },
        $set: { wealthLevel: Math.max(receiver.wealthLevel || 1, receiverWealthInfo.level) },
      },
      { new: true }
    );
    if (updatedReceiver) {
      receiver.diamonds = updatedReceiver.diamonds;
      receiver.wealthExp = updatedReceiver.wealthExp;
      receiver.wealthLevel = updatedReceiver.wealthLevel;
    }

    // Credit the platform's diamond inventory with the admin share
    const platform = await PlatformWallet.getWallet();
    await PlatformWallet.updateOne({ _id: platform._id }, { $inc: { diamonds: adminDiamonds } });

    let adminUserId = platform.adminId;
    if (!adminUserId) {
      const adminUser = await User.findOne({ role: 'admin' }).select('_id');
      if (adminUser) adminUserId = adminUser._id as any;
    }

    const hostShareLabel = isPremiumBadge
      ? `75% share incl. +5% ${receiver.hostBadge === 'alpha' ? 'ALPHA' : 'AURORA'} HOST bonus`
      : '70% share';
    const adminShareLabel = isPremiumBadge ? '25% share' : '30% share';

    // Create transactions (send in coin/diamond + receive diamonds + admin cut in diamonds)
    await Transaction.create([
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
        amount: hostDiamonds,
        currency: 'diamond',
        sourceType,
        targetId: senderId,
        targetModel: 'User',
        giftId: gift._id,
        status: 'completed',
        description: `Received ${quantity}x ${gift.name} from ${sender.nickname} (${hostShareLabel}: ${hostDiamonds} diamonds)`,
      },
      {
        userId: adminUserId || receiverId,
        type: 'gift_cut',
        amount: adminDiamonds,
        currency: 'diamond',
        targetId: senderId,
        targetModel: 'User',
        giftId: gift._id,
        status: 'completed',
        description: `Admin cut (${adminShareLabel}: ${adminDiamonds} diamonds) from ${quantity}x ${gift.name}`,
      },
    ]);

    // Push real-time balance updates to both parties (per-user socket rooms)
    try {
      getIO().to(`user:${receiverId}`).emit('balance:update', {
        coins: receiver.coins,
        diamonds: receiver.diamonds,
        wealthExp: receiver.wealthExp,
        wealthLevel: receiver.wealthLevel,
        deltaDiamonds: hostDiamonds,
      });
      getIO().to(`user:${senderId}`).emit('balance:update', {
        coins: sender.coins,
        diamonds: sender.diamonds,
        wealthExp: sender.wealthExp,
        wealthLevel: sender.wealthLevel,
      });
    } catch {
      // Socket not initialized — balances already persisted
    }

    // Notify the receiver in real time (persisted + socket push to user room)
    try {
      await notificationService.createNotification(
        receiverId,
        'gift',
        'New Gift Received!',
        `${sender.nickname} sent you ${quantity}x ${gift.name}`,
        { giftId: gift._id, quantity, diamondsEarned: hostDiamonds }
      );
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
      receiverEarned: hostDiamonds,
      receiverDiamonds: receiver.diamonds,
      receiverCoins: receiver.coins,
    };
  },
};
