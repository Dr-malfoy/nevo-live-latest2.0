import mongoose from 'mongoose';
import { PlatformWallet, User, Transaction } from '../models';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { auditService } from './audit.service';
import { calculateWealthLevel } from '../utils/userLevels';

export const walletService = {
  async getWallet() {
    return PlatformWallet.getWallet();
  },

  async lookupRecipient(identifier: string) {
    if (!identifier || !identifier.trim()) {
      throw new AppError('User ID / UID is required', 400);
    }
    const cleanId = identifier.trim();
    let user: any = await User.findOne({ uid: cleanId }).select('uid nickname avatar phone role level diamonds coins isAgent');
    if (!user && mongoose.isValidObjectId(cleanId)) {
      user = await User.findById(cleanId).select('uid nickname avatar phone role level diamonds coins isAgent');
    }
    if (!user) {
      user = await User.findOne({ phone: cleanId }).select('uid nickname avatar phone role level diamonds coins isAgent');
    }
    if (!user) {
      user = await User.findOne({ username: cleanId.toLowerCase() }).select('uid nickname avatar phone role level diamonds coins isAgent');
    }
    if (!user) {
      user = await User.findOne({ email: cleanId.toLowerCase() }).select('uid nickname avatar phone role level diamonds coins isAgent');
    }
    if (!user) {
      throw new AppError('User/Agent not found with given ID/UID/Phone', 404);
    }
    return user;
  },

  async transferCurrency(
    adminId: string,
    targetIdentifier: string,
    currency: 'diamond' | 'coin',
    amount: number,
    ip?: string
  ) {
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new AppError('Amount must be a positive number', 400);
    }

    if (currency !== 'diamond' && currency !== 'coin') {
      throw new AppError('Currency must be diamond or coin', 400);
    }

    const cleanId = targetIdentifier ? String(targetIdentifier).trim() : '';
    if (!cleanId) {
      throw new AppError('Target User ID / Agent ID is required', 400);
    }

    // Find target user by UID, ObjectId, Phone, Username, or Email
    let target: any = await User.findOne({ uid: cleanId });
    if (!target && mongoose.isValidObjectId(cleanId)) {
      target = await User.findById(cleanId);
    }
    if (!target) {
      target = await User.findOne({ phone: cleanId });
    }
    if (!target) {
      target = await User.findOne({ username: cleanId.toLowerCase() });
    }
    if (!target) {
      target = await User.findOne({ email: cleanId.toLowerCase() });
    }
    if (!target) {
      throw new AppError('Recipient user/agent not found', 404);
    }

    // Platform wallet inventory tracking
    let wallet: any = null;
    try {
      wallet = await PlatformWallet.getWallet();
      const field = currency === 'diamond' ? 'diamonds' : 'coins';
      if (wallet && wallet[field] && wallet[field] >= amount) {
        await PlatformWallet.findByIdAndUpdate(wallet._id, { $inc: { [field]: -amount } });
        wallet[field] -= amount;
      }
    } catch (walletErr) {
      console.warn('[WalletService] Platform wallet balance update warning:', walletErr);
    }

    // Credit target user balance (works for users, agents, hosts, etc.)
    let updateQuery: any = {};
    if (currency === 'diamond') {
      const currentWealthExp = target.wealthExp || 0;
      const newWealthExp = currentWealthExp + amount;
      const wealthInfo = calculateWealthLevel(newWealthExp, target.wealthLevel);
      const newWealthLevel = Math.max(target.wealthLevel || 1, wealthInfo.level);

      const setObj: any = {
        wealthLevel: newWealthLevel,
        hasPurchasedDiamonds: true,
        isVip: true,
      };

      if (!target.noble || !target.noble.type) {
        setObj.noble = {
          type: 'diamond',
          expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        };
      }

      updateQuery = {
        $inc: { diamonds: amount, wealthExp: amount },
        $set: setObj,
      };
    } else {
      updateQuery = {
        $inc: { coins: amount },
      };
    }

    const updated = await User.findByIdAndUpdate(target._id, updateQuery, { new: true });
    if (updated) {
      target = updated;
    }

    // Create transaction record
    try {
      await Transaction.create({
        userId: target._id,
        type: 'transfer',
        amount,
        currency,
        status: 'completed',
        description: `Transfer from admin (${currency})`,
      });
    } catch (txErr) {
      console.warn('[WalletService] Failed to record transaction:', txErr);
    }

    // Audit log
    await auditService.logAudit(
      adminId,
      'wallet_transfer',
      'User',
      String(target._id),
      {
        currency,
        amount,
        targetUid: target.uid,
        targetNickname: target.nickname,
        targetRole: target.role,
      },
      ip
    );

    // Notification to recipient
    await notificationService.createNotification(
      String(target._id),
      'recharge',
      'Wallet credited',
      `${amount.toLocaleString()} ${currency} transferred to your wallet by admin`,
      { currency, amount }
    );

    // Real-time socket balance update to recipient
    try {
      const { getIO } = await import('../socket');
      getIO()?.to(`user:${target._id}`).emit('balance:update', {
        diamonds: target.diamonds,
        coins: target.coins,
      });
    } catch {}

    return {
      wallet: wallet ? (typeof wallet.toObject === 'function' ? wallet.toObject() : wallet) : { diamonds: 0, coins: 0 },
      recipient: {
        _id: target._id,
        uid: target.uid,
        nickname: target.nickname,
        avatar: target.avatar,
        role: target.role,
        diamonds: target.diamonds,
        coins: target.coins,
      },
      agentBalance: { diamonds: target.diamonds, coins: target.coins },
    };
  },

  // Alias for backward compatibility
  async transferToAgent(adminId: string, agentId: string, currency: 'diamond' | 'coin', amount: number, ip?: string) {
    return this.transferCurrency(adminId, agentId, currency, amount, ip);
  },

  async getWalletHistory() {
    return Transaction.find({ type: 'transfer' })
      .populate('userId', 'uid nickname role avatar')
      .sort({ createdAt: -1 })
      .limit(100);
  },
};
