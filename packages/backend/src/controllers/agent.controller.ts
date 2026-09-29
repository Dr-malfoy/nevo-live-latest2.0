import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User, PurchaseOrder, WithdrawalRequest, Transaction, HostApplication, HostGroup } from '../models';
import { paymentService } from '../services/payment.service';
import { agencyService } from '../services/agency.service';
import { auditService } from '../services/audit.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

export const agentController = {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const agentId = req.user!.userId;
      const [agent, pendingRecharges, pendingWithdrawals, agency, todayOrders] = await Promise.all([
        User.findById(agentId).select('uid nickname avatar diamonds coins level'),
        PurchaseOrder.countDocuments({ agentId, status: 'pending' }),
        WithdrawalRequest.countDocuments({ agentId, status: 'pending' }),
        agencyService.getByAgent(agentId),
        PurchaseOrder.countDocuments({
          agentId,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
      ]);
      sendSuccess(res, {
        agent,
        pendingRecharges,
        pendingWithdrawals,
        hostCount: agency?.hosts?.length || 0,
        todayOrders,
      });
    } catch (error) {
      next(error);
    }
  },

  // ─── Recharge requests (Host/User → Agent) ────────────────────────

  async getRechargeRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const { data, total } = await paymentService.getAgentRechargeRequests(req.user!.userId, status, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async approveRecharge(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await paymentService.approveRechargeRequest(req.params.id, req.user!.userId);
      await auditService.logAudit(req.user!.userId, 'recharge_approve', 'PurchaseOrder', req.params.id, { amountBdt: order.amountBdt }, req.ip);
      sendSuccess(res, order, 'Recharge approved');
    } catch (error) {
      next(error);
    }
  },

  async rejectRecharge(req: Request, res: Response, next: NextFunction) {
    try {
      const { note } = req.body;
      const order = await paymentService.rejectRechargeRequest(req.params.id, req.user!.userId, note);
      await auditService.logAudit(req.user!.userId, 'recharge_reject', 'PurchaseOrder', req.params.id, { note }, req.ip);
      sendSuccess(res, order, 'Recharge rejected');
    } catch (error) {
      next(error);
    }
  },

  // ─── Withdrawal requests ──────────────────────────────────────────

  async getWithdrawalRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const { data, total } = await paymentService.getAgentWithdrawalRequests(req.user!.userId, status, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async approveWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const request = await paymentService.approveWithdrawalRequest(req.params.id, req.user!.userId);
      await auditService.logAudit(req.user!.userId, 'withdrawal_approve', 'WithdrawalRequest', req.params.id, { amount: request.amount, currency: request.currency }, req.ip);
      sendSuccess(res, request, 'Withdrawal approved');
    } catch (error) {
      next(error);
    }
  },

  async rejectWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const { note } = req.body;
      const request = await paymentService.rejectWithdrawalRequest(req.params.id, req.user!.userId, note);
      await auditService.logAudit(req.user!.userId, 'withdrawal_reject', 'WithdrawalRequest', req.params.id, { note }, req.ip);
      sendSuccess(res, request, 'Withdrawal rejected');
    } catch (error) {
      next(error);
    }
  },

  async markWithdrawalPaid(req: Request, res: Response, next: NextFunction) {
    try {
      const request = await paymentService.markWithdrawalPaid(req.params.id, req.user!.userId);
      await auditService.logAudit(req.user!.userId, 'withdrawal_paid', 'WithdrawalRequest', req.params.id, {}, req.ip);
      sendSuccess(res, request, 'Withdrawal marked as paid');
    } catch (error) {
      next(error);
    }
  },

  // ─── Buy from admin ───────────────────────────────────────────────

  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { currency, amountBdt, paymentMethod, screenshot, transactionId } = req.body;
      if (!currency || !amountBdt || !paymentMethod || !screenshot || !transactionId) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }
      const order = await paymentService.createAgentOrder(req.user!.userId, { currency, amountBdt, paymentMethod, screenshot, transactionId });
      sendSuccess(res, order, 'Purchase request created', 201);
    } catch (error) {
      next(error);
    }
  },

  async getMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { data, total } = await paymentService.getAgentPurchaseOrders(req.user!.userId, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  // ─── Customers ────────────────────────────────────────────────────

  async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const agency = await agencyService.getByAgent(req.user!.userId);
      if (!agency) {
        sendSuccess(res, []);
        return;
      }
      const customers = await User.find({ _id: { $in: agency.hosts } })
        .select('uid nickname avatar phone level diamonds coins role')
        .sort({ createdAt: -1 });
      sendSuccess(res, customers);
    } catch (error) {
      next(error);
    }
  },

  // ─── Wallet / earnings ────────────────────────────────────────────

  async getWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const userIdObj = new mongoose.Types.ObjectId(userId);
      const [agent, rechargeTx, withdrawTx, agentPurchaseTx, commissionTx, transactions] = await Promise.all([
        User.findById(userId).select('diamonds coins uid nickname'),
        Transaction.aggregate([
          { $match: { userId: userIdObj, type: 'recharge', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          { $match: { userId: userIdObj, type: { $in: ['withdraw', 'coin_sale'] }, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          { $match: { userId: userIdObj, type: 'agent_recharge', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          { $match: { userId: userIdObj, type: 'commission', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.find({ userId }).sort({ createdAt: -1 }).limit(50),
      ]);

      sendSuccess(res, {
        agent,
        earnings: {
          rechargeVolume: rechargeTx[0]?.total || 0,
          withdrawalVolume: withdrawTx[0]?.total || 0,
          purchaseVolume: agentPurchaseTx[0]?.total || 0,
          commissionEarned: commissionTx[0]?.total || 0,
        },
        transactions,
      });
    } catch (error) {
      next(error);
    }
  },

  // ─── Payment info (where users pay the agent) ─────────────────────

  async getPaymentInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.user!.userId).select('paymentInfo');
      sendSuccess(res, user?.paymentInfo || { bybit: { qrCode: '', walletAddress: '' }, binance: { qrCode: '', walletAddress: '' } });
    } catch (error) {
      next(error);
    }
  },

  async updatePaymentInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { bybit, binance } = req.body;
      const update: any = {};
      if (bybit) {
        if (bybit.qrCode !== undefined) update['paymentInfo.bybit.qrCode'] = bybit.qrCode;
        if (bybit.walletAddress !== undefined) update['paymentInfo.bybit.walletAddress'] = bybit.walletAddress;
      }
      if (binance) {
        if (binance.qrCode !== undefined) update['paymentInfo.binance.qrCode'] = binance.qrCode;
        if (binance.walletAddress !== undefined) update['paymentInfo.binance.walletAddress'] = binance.walletAddress;
      }
      const user = await User.findByIdAndUpdate(req.user!.userId, { $set: update }, { new: true }).select('paymentInfo');
      sendSuccess(res, user?.paymentInfo, 'Payment info updated');
    } catch (error) {
      next(error);
    }
  },

  // ─── §4.7 Agent Analytics ──────────────────────────────────────────────────

  async getEarnings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { period = 'today' } = req.query as { period: string };
      const now = new Date();
      let start: Date;
      if (period === 'week') start = new Date(now.getTime() - 7 * 24 * 3600_000);
      else if (period === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
      else { start = new Date(now); start.setHours(0, 0, 0, 0); }
      const txns = await Transaction.find({
        userId: new mongoose.Types.ObjectId(userId),
        type: 'credit',
        createdAt: { $gte: start },
      }).lean();
      const total = txns.reduce((s: number, t: any) => s + (t.amount || 0), 0);
      sendSuccess(res, { total, transactions: txns, period });
    } catch (error) {
      next(error);
    }
  },

  async getHostData(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const hosts = await User.find({ agencyId: new mongoose.Types.ObjectId(userId) })
        .select('uid nickname avatar level diamonds coins createdAt')
        .lean();
      sendSuccess(res, { hosts, count: hosts.length });
    } catch (error) {
      next(error);
    }
  },

  async getInviteAgentData(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const agents = await User.find({ invitedBy: new mongoose.Types.ObjectId(userId), isAgent: true })
        .select('uid nickname avatar level createdAt')
        .lean();
      sendSuccess(res, { agents, count: agents.length });
    } catch (error) {
      next(error);
    }
  },

  async getMyHosts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filter = { agencyId: new mongoose.Types.ObjectId(userId) };
      const total = await User.countDocuments(filter);
      const hosts = await User.find(filter)
        .select('uid nickname avatar level diamonds coins createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      sendPaginated(res, hosts, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async getApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { status } = req.query as { status?: string };
      const filter: any = { agentId: new mongoose.Types.ObjectId(userId) };
      if (status) filter.status = status;
      const apps = await HostApplication.find(filter)
        .populate('applicantId', 'uid nickname avatar level')
        .sort({ createdAt: -1 })
        .lean();
      sendSuccess(res, apps);
    } catch (error) {
      next(error);
    }
  },

  async approveApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const app = await HostApplication.findOne({ _id: id, agentId: new mongoose.Types.ObjectId(userId) });
      if (!app) throw new AppError('Application not found', 404);
      app.status = 'accepted';
      app.decidedAt = new Date();
      await app.save();
      await User.updateOne({ _id: app.applicantId }, { agencyId: new mongoose.Types.ObjectId(userId) });
      sendSuccess(res, { message: 'Application accepted' });
    } catch (error) {
      next(error);
    }
  },

  async rejectApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const app = await HostApplication.findOne({ _id: id, agentId: new mongoose.Types.ObjectId(userId) });
      if (!app) throw new AppError('Application not found', 404);
      app.status = 'rejected';
      app.decidedAt = new Date();
      await app.save();
      sendSuccess(res, { message: 'Application rejected' });
    } catch (error) {
      next(error);
    }
  },

  async getHostGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const groups = await HostGroup.find({ agentId: new mongoose.Types.ObjectId(userId) })
        .populate('memberIds', 'uid nickname avatar level')
        .lean();
      sendSuccess(res, groups);
    } catch (error) {
      next(error);
    }
  },

  async createHostGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { name, memberIds } = req.body;
      if (!name) throw new AppError('name is required', 400);
      const group = await HostGroup.create({
        agentId: new mongoose.Types.ObjectId(userId),
        name,
        memberIds: memberIds || [],
      });
      sendSuccess(res, group, 'Group created', 201);
    } catch (error) {
      next(error);
    }
  },
};
