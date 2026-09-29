import { Transaction, User, PurchaseOrder, WithdrawalRequest, AgentPurchaseOrder } from '../models';
import { AppError } from '../middleware/errorHandler';

export const analyticsService = {
  async getSummary(from?: string, to?: string) {
    const filter: any = {};
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const [totalAgents, totalHosts, totalUsers, revenueAgg, rechargeAgg, withdrawalAgg, agentPurchaseAgg] = await Promise.all([
      User.countDocuments({ role: 'agent' }),
      User.countDocuments({ role: 'host' }),
      User.countDocuments({ role: 'user' }),
      Transaction.aggregate([
        { $match: { ...filter, type: 'recharge', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      PurchaseOrder.aggregate([
        { $match: { ...filter, status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$amountBdt' } } },
      ]),
      WithdrawalRequest.aggregate([
        { $match: { ...filter, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amountBdt' } } },
      ]),
      AgentPurchaseOrder.aggregate([
        { $match: { ...filter, status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amountBdt' } } },
      ]),
    ]);

    return {
      totalAgents,
      totalHosts,
      totalUsers,
      revenue: revenueAgg[0]?.total || 0,
      rechargeVolume: rechargeAgg[0]?.total || 0,
      withdrawalVolume: withdrawalAgg[0]?.total || 0,
      agentPurchaseVolume: agentPurchaseAgg[0]?.total || 0,
    };
  },

  // Daily series for charts
  async getDailySeries(from: string, to: string) {
    const match: any = { status: 'completed' };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const rows = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          recharge: { $sum: { $cond: [{ $eq: ['$type', 'recharge'] }, '$amount', 0] } },
          withdraw: { $sum: { $cond: [{ $eq: ['$type', 'withdraw'] }, '$amount', 0] } },
          coinSale: { $sum: { $cond: [{ $eq: ['$type', 'coin_sale'] }, '$amount', 0] } },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return rows.map((r) => ({ date: r._id, ...r }));
  },
};
