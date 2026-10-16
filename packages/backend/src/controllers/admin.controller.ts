import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User, LiveStream, Transaction, Gift, Agency, PlatformWallet, WithdrawalRequest, AgentPurchaseOrder, AppConfig, StoreItem, ContactMessage, PurchaseOrder } from '../models';
import { getFormattedTxId } from '../models/Transaction';

import { paymentService } from '../services/payment.service';
import { agencyService } from '../services/agency.service';
import { hostBadgeService } from '../services/hostBadge.service';
import { securityService } from '../services/security.service';
import { hashPassword } from '../utils/hash';
import { sendSuccess, sendPaginated } from '../utils/response';
import { AGENCY_TIERS, resolveAgencyTier, AgencyTier } from '../utils/agencyTiers';

export const adminController = {
  async getDashboard(_req: Request, res: Response, next: NextFunction) {
    try {
      const [
        userCount,
        liveStreams,
        pendingTransactions,
        agentCount,
        hostCount,
        wallet,
        pendingWithdrawals,
        pendingAgentOrders,
        pendingOrders,
        pendingOfficialOrders,
        pendingTickets,
        recentTickets,
      ] = await Promise.all([
        User.countDocuments(),
        LiveStream.countDocuments({ status: 'live' }),
        Transaction.countDocuments({ status: 'pending' }),
        User.countDocuments({ role: 'agent' }),
        User.countDocuments({ role: 'host' }),
        PlatformWallet.getWallet(),
        WithdrawalRequest.countDocuments({ status: 'pending' }),
        AgentPurchaseOrder.countDocuments({ status: 'pending' }),
        PurchaseOrder.countDocuments({ status: 'pending' }),
        PurchaseOrder.countDocuments({ status: 'pending', isOfficial: true }),
        ContactMessage.countDocuments({ status: { $in: ['pending', 'in_progress'] } }),
        ContactMessage.find()
          .populate('userId', 'uid nickname avatar phone')
          .sort({ createdAt: -1 })
          .limit(8)
          .lean(),
      ]);

      sendSuccess(res, {
        totalUsers: userCount,
        totalAgents: agentCount,
        totalHosts: hostCount,
        activeStreams: liveStreams,
        pendingTransactions,
        pendingWithdrawals,
        pendingAgentOrders,
        pendingOrders,
        pendingOfficialOrders,
        pendingTickets,
        recentTickets,
        diamondInventory: wallet?.diamonds || 0,
        coinInventory: wallet?.coins || 0,
      });
    } catch (error) {
      next(error);
    }
  },

  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;

      const filter: any = {};
      if (search) {
        filter.$or = [
          { nickname: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { uid: { $regex: search, $options: 'i' } },
        ];
      }

      const total = await User.countDocuments(filter);
      const users = await User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-password');

      sendPaginated(res, users, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async toggleBanUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      user.isBanned = !user.isBanned;
      await user.save();
      sendSuccess(res, { isBanned: user.isBanned }, `User ${user.isBanned ? 'banned' : 'unbanned'}`);
    } catch (error) {
      next(error);
    }
  },

  /** Admin-only seller badge control — users can never self-assign. */
  async setSellerType(req: Request, res: Response, next: NextFunction) {
    try {
      const { sellerType } = req.body;
      if (!['none', 'official', 'paylor'].includes(sellerType)) {
        res.status(400).json({ success: false, error: 'Invalid seller type' });
        return;
      }
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: { sellerType } },
        { new: true }
      );
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      sendSuccess(res, { sellerType: user.sellerType }, 'Seller type updated');
    } catch (error) {
      next(error);
    }
  },

  async getStreams(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const total = await LiveStream.countDocuments();
      const streams = await LiveStream.find()
        .populate('hostId', 'uid nickname avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      sendPaginated(res, streams, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async endStream(req: Request, res: Response, next: NextFunction) {
    try {
      const stream = await LiveStream.findById(req.params.id);
      if (!stream) {
        res.status(404).json({ success: false, error: 'Stream not found' });
        return;
      }
      if (stream.status === 'ended') {
        res.status(400).json({ success: false, error: 'Stream already ended' });
        return;
      }
      stream.status = 'ended';
      stream.endedAt = new Date();
      await stream.save();

      // Emit socket event to notify the streamer
      const io = req.app.get('io');
      if (io) {
        io.to(`stream:${stream._id}`).emit('stream:admin-ended', { streamId: stream._id });
      }

      sendSuccess(res, stream, 'Stream ended by admin');
    } catch (error) {
      next(error);
    }
  },

  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { search, type, category, currency, status } = req.query as Record<string, string>;

      const filter: any = {};

      if (currency && (currency === 'diamond' || currency === 'coin')) {
        filter.currency = currency;
      }

      if (status && ['completed', 'pending', 'failed'].includes(status)) {
        filter.status = status;
      }

      // Filter by category or type (buy, withdraw, transfer, etc.)
      const cat = (category || type || '').toLowerCase();
      if (cat === 'buy' || cat === 'recharge') {
        filter.type = { $in: ['recharge', 'agent_recharge'] };
      } else if (cat === 'withdraw' || cat === 'withdrawal') {
        filter.type = { $in: ['withdraw', 'coin_sale'] };
      } else if (cat === 'transfer') {
        filter.type = { $in: ['transfer', 'transfer_in'] };
      } else if (cat === 'game') {
        filter.type = { $in: ['game_bet', 'game_win'] };
      } else if (cat === 'reward') {
        filter.type = {
          $in: [
            'daily_reward',
            'task_reward',
            'signin_reward',
            'activity_reward',
            'spin_reward',
            'ranking_prize',
            'creator_reward',
          ],
        };
      } else if (type && type !== 'all') {
        if (type.includes(',')) {
          filter.type = { $in: type.split(',') };
        } else {
          filter.type = type;
        }
      }

      if (search && search.trim()) {
        const q = search.trim();
        const orConditions: any[] = [];

        // 1. txId field match (case-insensitive regex)
        orConditions.push({ txId: new RegExp(q, 'i') });

        // 2. Exact match on _id if valid MongoDB ObjectId
        if (mongoose.Types.ObjectId.isValid(q)) {
          orConditions.push({ _id: new mongoose.Types.ObjectId(q) });
        }

        // 3. Match generated txId format numbers/hex
        const cleanDigits = q.replace(/[^0-9]/g, '');
        if (cleanDigits.length >= 4) {
          orConditions.push({ txId: new RegExp(cleanDigits, 'i') });
        }

        // 4. Find matching users by UID, nickname, phone
        const matchingUsers = await User.find({
          $or: [
            { uid: new RegExp(q, 'i') },
            { nickname: new RegExp(q, 'i') },
            { phone: new RegExp(q, 'i') },
          ],
        }).select('_id').limit(50);

        if (matchingUsers.length > 0) {
          const userIds = matchingUsers.map((u) => u._id);
          orConditions.push({ userId: { $in: userIds } });
          orConditions.push({ targetId: { $in: userIds } });
        }

        // 5. Match gateway transactionId or orderId on PurchaseOrder
        const matchingOrders = await PurchaseOrder.find({
          $or: [
            { transactionId: new RegExp(q, 'i') },
            { orderId: new RegExp(q, 'i') },
          ],
        }).select('userId').limit(50);

        if (matchingOrders.length > 0) {
          const orderUserIds = matchingOrders.map((o) => o.userId);
          orConditions.push({ userId: { $in: orderUserIds } });
        }

        filter.$or = orConditions;
      }

      const total = await Transaction.countDocuments(filter);
      const rawTransactions = await Transaction.find(filter)
        .populate('userId', 'uid nickname phone avatar role')
        .populate('targetId', 'uid nickname phone avatar role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      // Format transactions with normalized txId, BDT valuation (130:1), and category labels
      const RATE_COINS = 130;
      const RATE_DIAMONDS = 130;

      const transactions = rawTransactions.map((tx: any) => {
        const rate = tx.currency === 'coin' ? RATE_COINS : RATE_DIAMONDS;
        const bdtValue = tx.amount ? tx.amount / rate : 0;
        const formattedTxId = tx.txId || getFormattedTxId(tx);

        let category = 'other';
        if (tx.type === 'recharge' || tx.type === 'agent_recharge') category = 'buy';
        else if (tx.type === 'withdraw' || tx.type === 'coin_sale') category = 'withdraw';
        else if (tx.type === 'transfer' || tx.type === 'transfer_in') category = 'transfer';
        else if (tx.type === 'game_bet' || tx.type === 'game_win') category = 'game';
        else if (tx.type?.includes('reward') || tx.type === 'ranking_prize') category = 'reward';

        return {
          ...tx,
          txId: formattedTxId,
          bdtValue,
          category,
        };
      });

      // Compute quick summary stats
      const [totalBuys, totalWithdraws, totalDiamondsVol, totalCoinsVol] = await Promise.all([
        Transaction.countDocuments({ type: { $in: ['recharge', 'agent_recharge'] } }),
        Transaction.countDocuments({ type: { $in: ['withdraw', 'coin_sale'] } }),
        Transaction.aggregate([
          { $match: { currency: 'diamond', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          { $match: { currency: 'coin', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

      const stats = {
        totalTransactions: await Transaction.countDocuments(),
        totalBuys,
        totalWithdraws,
        totalDiamondsVolume: totalDiamondsVol[0]?.total || 0,
        totalCoinsVolume: totalCoinsVol[0]?.total || 0,
        rateCoins: RATE_COINS,
        rateDiamonds: RATE_DIAMONDS,
      };

      res.json({
        success: true,
        data: transactions,
        stats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async getAgents(_req: Request, res: Response, next: NextFunction) {
    try {
      const agents = await User.find({ role: 'agent' }).select('uid nickname phone avatar level diamonds coins createdAt');
      const agencies = await Agency.find()
        .populate('agentId', 'uid nickname')
        .select('agentId name code commission tier hosts isBanned createdAt');
      sendSuccess(res, { agents, agencies, allTiers: AGENCY_TIERS });
    } catch (error) {
      next(error);
    }
  },

  async createAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, password, nickname, name, tier, commission } = req.body;
      if (!phone || !password || !nickname) {
        res.status(400).json({ success: false, error: 'Phone, password, and nickname are required' });
        return;
      }

      const existing = await User.findOne({ phone });
      if (existing) {
        res.status(409).json({ success: false, error: 'Phone already registered' });
        return;
      }

      const count = await User.countDocuments();
      const uid = String(168000 + count + 1);
      const hashed = await hashPassword(password);

      const user = await User.create({
        uid,
        phone,
        password: hashed,
        nickname,
        role: 'agent',
        isAgent: true,
        avatar: '',
      });

      // Create the agency with a unique join code
      let code = agencyService.generateCode();
      for (let i = 0; i < 10; i++) {
        const exists = await Agency.exists({ code });
        if (!exists) break;
        code = agencyService.generateCode();
      }

      const assignedTier: AgencyTier = tier && AGENCY_TIERS[tier as AgencyTier] ? tier : 'starter';
      const assignedCommission = typeof commission === 'number'
        ? commission
        : AGENCY_TIERS[assignedTier].agencyPercent;

      const agency = await Agency.create({
        agentId: user._id,
        name: name || `${nickname}'s Agency`,
        code,
        tier: assignedTier,
        commission: assignedCommission,
      });

      user.agencyId = agency._id as any;
      await user.save();

      sendSuccess(res, { user: { uid: user.uid, phone: user.phone, nickname: user.nickname, _id: user._id }, agency: { _id: agency._id, name: agency.name, code: agency.code, tier: agency.tier, commission: agency.commission } }, 'Agent created', 201);
    } catch (error) {
      next(error);
    }
  },

  async updateAgency(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { tier, commission, isBanned, name } = req.body;
      const agency = await Agency.findById(id);
      if (!agency) {
        res.status(404).json({ success: false, error: 'Agency not found' });
        return;
      }

      if (name && typeof name === 'string') agency.name = name.trim();
      if (typeof isBanned === 'boolean') agency.isBanned = isBanned;
      if (tier && AGENCY_TIERS[tier as AgencyTier]) {
        agency.tier = tier as AgencyTier;
        agency.commission = AGENCY_TIERS[tier as AgencyTier].agencyPercent;
      } else if (typeof commission === 'number' && commission >= 0 && commission <= 100) {
        agency.commission = commission;
        agency.tier = resolveAgencyTier({ commission }).tier;
      }

      await agency.save();
      sendSuccess(res, agency, 'Agency updated successfully');
    } catch (error) {
      next(error);
    }
  },

  async getGifts(_req: Request, res: Response, next: NextFunction) {
    try {
      const gifts = await Gift.find().sort({ order: 1, createdAt: -1 });
      sendSuccess(res, gifts);
    } catch (error) {
      next(error);
    }
  },

  async createGift(req: Request, res: Response, next: NextFunction) {
    try {
      const gift = await Gift.create(req.body);
      sendSuccess(res, gift, 'Gift created', 201);
    } catch (error) {
      next(error);
    }
  },

  async updateGift(req: Request, res: Response, next: NextFunction) {
    try {
      const gift = await Gift.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
      if (!gift) {
        res.status(404).json({ success: false, error: 'Gift not found' });
        return;
      }
      sendSuccess(res, gift, 'Gift updated');
    } catch (error) {
      next(error);
    }
  },

  async deleteGift(req: Request, res: Response, next: NextFunction) {
    try {
      const gift = await Gift.findByIdAndDelete(req.params.id);
      if (!gift) {
        res.status(404).json({ success: false, error: 'Gift not found' });
        return;
      }
      sendSuccess(res, null, 'Gift deleted');
    } catch (error) {
      next(error);
    }
  },

  // ─── Badge Store Management (Admin) ──────────────────────────────
  async getBadges(req: Request, res: Response, next: NextFunction) {
    try {
      const badges = await StoreItem.find({ category: 'badge' }).sort({ order: 1, createdAt: -1 });
      sendSuccess(res, badges);
    } catch (error) {
      next(error);
    }
  },

  async createBadge(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, image, preview, priceCoins = 0, priceDiamonds = 0, durationDays = null, rarity = null, badge = null, isActive = true, order = 0, description = '' } = req.body;
      if (!name || (!image && !preview)) {
        res.status(400).json({ success: false, error: 'Badge name and image are required' });
        return;
      }
      const newBadge = await StoreItem.create({
        category: 'badge',
        name,
        description,
        image: image || preview,
        preview: preview || image,
        priceCoins: Number(priceCoins) || 0,
        priceDiamonds: Number(priceDiamonds) || 0,
        durationDays: durationDays ? Number(durationDays) : null,
        rarity: rarity || null,
        badge: badge || null,
        isActive: isActive !== false,
        order: Number(order) || 0,
      });
      sendSuccess(res, newBadge, 'Badge created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  async updateBadge(req: Request, res: Response, next: NextFunction) {
    try {
      const badge = await StoreItem.findOneAndUpdate(
        { _id: req.params.id, category: 'badge' },
        { $set: req.body },
        { new: true }
      );
      if (!badge) {
        res.status(404).json({ success: false, error: 'Badge not found' });
        return;
      }
      sendSuccess(res, badge, 'Badge updated successfully');
    } catch (error) {
      next(error);
    }
  },

  async deleteBadge(req: Request, res: Response, next: NextFunction) {
    try {
      const badge = await StoreItem.findOneAndDelete({ _id: req.params.id, category: 'badge' });
      if (!badge) {
        res.status(404).json({ success: false, error: 'Badge not found' });
        return;
      }
      sendSuccess(res, null, 'Badge deleted successfully');
    } catch (error) {
      next(error);
    }
  },

  async getPurchaseOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const type = req.query.type as string;
      const search = req.query.search as string;
      const { data, total, stats } = await paymentService.getAllPurchaseOrders({ status, type, search, page, limit });
      sendPaginated(res, data, total, page, limit, { stats });
    } catch (error) {
      next(error);
    }
  },

  async confirmOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await paymentService.confirmOrder(req.params.id);
      sendSuccess(res, order, 'Order confirmed — currency credited');
    } catch (error) {
      next(error);
    }
  },

  async rejectOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { note } = req.body;
      const order = await paymentService.rejectOrder(req.params.id, note);
      sendSuccess(res, order, 'Order rejected');
    } catch (error) {
      next(error);
    }
  },

  // ─── Agent Purchase Orders (Agent → Admin) ────────────────────────

  async getAgentPurchaseOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const search = req.query.search as string;
      const { data, total } = await paymentService.getAllAgentPurchaseOrders({ status, search, page, limit });
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async approveAgentOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await paymentService.approveAgentOrder(req.params.id);
      sendSuccess(res, order, 'Agent order approved — currency credited');
    } catch (error) {
      next(error);
    }
  },

  async rejectAgentOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { note } = req.body;
      const order = await paymentService.rejectAgentOrder(req.params.id, note);
      sendSuccess(res, order, 'Agent order rejected');
    } catch (error) {
      next(error);
    }
  },

  async getPaymentConfig(_req: Request, res: Response, next: NextFunction) {
    try {
      const config = await paymentService.getPaymentConfig();
      sendSuccess(res, config);
    } catch (error) {
      next(error);
    }
  },

  async updatePaymentConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await paymentService.updatePaymentConfig(req.body);
      sendSuccess(res, config, 'Payment config updated');
    } catch (error) {
      next(error);
    }
  },

  // ─── Admin Payment Info ────────────────────────────────────────────

  async getAdminPaymentInfo(_req: Request, res: Response, next: NextFunction) {
    try {
      const info = await paymentService.getAdminPaymentInfo();
      sendSuccess(res, info);
    } catch (error) {
      next(error);
    }
  },

  async updateAdminPaymentInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const info = await paymentService.updateAdminPaymentInfo(req.body);
      sendSuccess(res, info, 'Admin payment info updated');
    } catch (error) {
      next(error);
    }
  },

  // ─── Withdrawal Requests Management (Admin supervision) ───────────

  async getWithdrawalRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const { data, total } = await paymentService.getAllWithdrawalRequests({ status, page, limit });
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  // ─── Custom Payment Methods ────────────────────────────────────────

  async createCustomMethod(req: Request, res: Response, next: NextFunction) {
    try {
      const method = await paymentService.createCustomPaymentMethod(req.body);
      sendSuccess(res, method, 'Payment method created', 201);
    } catch (error) {
      next(error);
    }
  },

  async updateCustomMethod(req: Request, res: Response, next: NextFunction) {
    try {
      const method = await paymentService.updateCustomPaymentMethod(req.params.id, req.body);
      sendSuccess(res, method, 'Payment method updated');
    } catch (error) {
      next(error);
    }
  },

  async deleteCustomMethod(req: Request, res: Response, next: NextFunction) {
    try {
      await paymentService.deleteCustomPaymentMethod(req.params.id);
      sendSuccess(res, null, 'Payment method deleted');
    } catch (error) {
      next(error);
    }
  },

  // ─── Telegram Dynamic Config ───────────────────────────────────────

  async getTelegramConfig(_req: Request, res: Response, next: NextFunction) {
    try {
      let config = await AppConfig.findOne({ key: 'telegram' });
      if (!config) {
        config = await AppConfig.create({
          key: 'telegram',
          value: {
            channelUrl: 'https://t.me/nevolive_official',
            supportUrl: 'https://t.me/nevolive_support',
            groupUrl: 'https://t.me/nevolive_group',
          },
        });
      }
      sendSuccess(res, config.value, 'Telegram configuration');
    } catch (error) {
      next(error);
    }
  },

  async updateTelegramConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { channelUrl, supportUrl, groupUrl } = req.body;
      const value = {
        channelUrl: channelUrl?.trim() || 'https://t.me/nevolive_official',
        supportUrl: supportUrl?.trim() || 'https://t.me/nevolive_support',
        groupUrl: groupUrl?.trim() || 'https://t.me/nevolive_group',
      };

      const config = await AppConfig.findOneAndUpdate(
        { key: 'telegram' },
        { $set: { value } },
        { new: true, upsert: true }
      );
      sendSuccess(res, config.value, 'Telegram configuration updated');
    } catch (error) {
      next(error);
    }
  },

  /**
   * Host Management — list hosts with weekly metrics, qualifications, and badges
   */
  async getHosts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const badge = req.query.badge as string;
      const gender = req.query.gender as string;

      const result = await hostBadgeService.getHostsWithStats({
        page,
        limit,
        search,
        badge,
        gender,
      });

      sendPaginated(res, result.data, result.total, result.page, result.limit, {
        weeklyBounds: result.weeklyBounds,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Host Management — manual badge assignment/removal (Alpha Host / Aurora Host / None)
   */
  async setHostBadge(req: Request, res: Response, next: NextFunction) {
    try {
      const { hostBadge } = req.body;
      if (!['alpha', 'aurora', 'none'].includes(hostBadge)) {
        res.status(400).json({ success: false, error: 'Invalid badge. Must be alpha, aurora, or none' });
        return;
      }

      const result = await hostBadgeService.setManualBadge(req.params.id, hostBadge);
      sendSuccess(
        res,
        {
          hostBadge: result.user.hostBadge,
          hostBadgeType: result.user.hostBadgeType,
          hostBadgeAssignedAt: result.user.hostBadgeAssignedAt,
        },
        `Host badge updated to ${hostBadge.toUpperCase()}`
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Host Management — trigger automatic badge recalculation across all hosts
   */
  async recalculateHostBadges(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await hostBadgeService.recalculateAllHostBadges();
      sendSuccess(res, result, 'Host badges recalculated successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * Asset Password Admin Management
   */
  async lookupAssetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const uid = (req.query.uid || req.body?.uid) as string;
      const contact = (req.query.contact || req.query.phoneOrEmail || req.query.phone || req.query.email || req.body?.contact) as string;
      const query = (req.query.q || req.query.query || req.query.search) as string;
      const result = await securityService.adminLookupAssetPassword({ uid, contact, query });
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async resetUserAssetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, newPassword } = req.body;
      const result = await securityService.adminSetOrResetAssetPassword(userId, newPassword);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  async unlockUserAssetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.body;
      const result = await securityService.adminUnlockAssetPassword(userId);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },
};


