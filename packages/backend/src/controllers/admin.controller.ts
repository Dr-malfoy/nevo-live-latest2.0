import { Request, Response, NextFunction } from 'express';
import { User, LiveStream, Transaction, Gift, Agency, PlatformWallet, WithdrawalRequest, AgentPurchaseOrder, AppConfig, StoreItem } from '../models';

import { paymentService } from '../services/payment.service';
import { agencyService } from '../services/agency.service';
import { hostBadgeService } from '../services/hostBadge.service';
import { hashPassword } from '../utils/hash';
import { sendSuccess, sendPaginated } from '../utils/response';

export const adminController = {
  async getDashboard(_req: Request, res: Response, next: NextFunction) {
    try {
      const [userCount, liveStreams, pendingTransactions, agentCount, hostCount, wallet, pendingWithdrawals, pendingAgentOrders] = await Promise.all([
        User.countDocuments(),
        LiveStream.countDocuments({ status: 'live' }),
        Transaction.countDocuments({ status: 'pending' }),
        User.countDocuments({ role: 'agent' }),
        User.countDocuments({ role: 'host' }),
        PlatformWallet.getWallet(),
        WithdrawalRequest.countDocuments({ status: 'pending' }),
        AgentPurchaseOrder.countDocuments({ status: 'pending' }),
      ]);

      sendSuccess(res, {
        totalUsers: userCount,
        totalAgents: agentCount,
        totalHosts: hostCount,
        activeStreams: liveStreams,
        pendingTransactions,
        pendingWithdrawals,
        pendingAgentOrders,
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

      const total = await Transaction.countDocuments();
      const transactions = await Transaction.find()
        .populate('userId', 'uid nickname')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      sendPaginated(res, transactions, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async getAgents(_req: Request, res: Response, next: NextFunction) {
    try {
      const agents = await User.find({ role: 'agent' }).select('uid nickname phone avatar level diamonds coins createdAt');
      const agencies = await Agency.find()
        .populate('agentId', 'uid nickname')
        .select('agentId name code commission hosts isBanned');
      sendSuccess(res, { agents, agencies });
    } catch (error) {
      next(error);
    }
  },

  async createAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, password, nickname, name } = req.body;
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
        avatar: '',
      });

      // Create the agency with a unique join code
      let code = agencyService.generateCode();
      // Ensure uniqueness
      for (let i = 0; i < 10; i++) {
        const exists = await Agency.exists({ code });
        if (!exists) break;
        code = agencyService.generateCode();
      }
      const agency = await Agency.create({
        agentId: user._id,
        name: name || `${nickname}'s Agency`,
        code,
        commission: 10,
      });

      sendSuccess(res, { user: { uid: user.uid, phone: user.phone, nickname: user.nickname, _id: user._id }, agency: { _id: agency._id, name: agency.name, code: agency.code } }, 'Agent created', 201);
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
      const { data, total } = await paymentService.getAllPurchaseOrders({ status, page, limit });
      sendPaginated(res, data, total, page, limit);
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
      const { data, total } = await paymentService.getAllAgentPurchaseOrders({ status, page, limit });
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
      const { bybit, binance } = req.body;
      const info = await paymentService.updateAdminPaymentInfo({ bybit, binance });
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
};

