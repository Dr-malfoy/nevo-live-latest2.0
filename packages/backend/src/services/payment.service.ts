import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  PurchaseOrder, User, Transaction, PaymentConfig,
  AdminPaymentInfo, WithdrawalRequest, AgentPurchaseOrder,
  PaymentMethod as PaymentMethodModel, WithdrawAccount,
} from '../models';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { auditService } from './audit.service';
import { calculateWealthLevel } from '../utils/userLevels';
import { getIO } from '../socket';

const PAYMENT_METHODS = ['bybit', 'binance', 'bkash', 'nagad', 'rocket'] as const;
const MOBILE_BANKING = ['bkash', 'nagad', 'rocket'] as const;

export const paymentService = {
  // ─── Public / Shared ──────────────────────────────────────────────

  async getPaymentMethods() {
    const config = await PaymentConfig.getConfig() as any;
    return {
      bybitEnabled: config.bybitEnabled,
      binanceEnabled: config.binanceEnabled,
      bkashEnabled: config.bkashEnabled,
      nagadEnabled: config.nagadEnabled,
      rocketEnabled: config.rocketEnabled,
      diamondRate: config.diamondRate,
      coinRate: config.coinRate,
      withdrawalRate: config.withdrawalRate,
      rechargeRate: config.rechargeRate,
      bonusRate: config.bonusRate,
      serviceCharge: config.serviceCharge,
    };
  },

  async getAdminPaymentInfo() {
    let info = await AdminPaymentInfo.findOne();
    if (!info) info = await AdminPaymentInfo.create({});
    return info;
  },

  async updateAdminPaymentInfo(body: any) {
    const update: any = {};
    for (const key of ['bybit', 'binance', 'bkash', 'nagad', 'rocket']) {
      if (body[key]) {
        if (body[key].qrCode !== undefined) update[`${key}.qrCode`] = body[key].qrCode;
        if (body[key].walletAddress !== undefined) update[`${key}.walletAddress`] = body[key].walletAddress;
        if (body[key].number !== undefined) update[`${key}.number`] = body[key].number;
      }
    }
    const info = await AdminPaymentInfo.findOneAndUpdate(
      {},
      { $set: update },
      { upsert: true, new: true }
    );
    return info;
  },

  // ─── User Recharge Orders (User → Agent / Official Admin) ─────────

  async getAgentsForRecharge() {
    let adminInfo = await AdminPaymentInfo.findOne().lean() as any;
    if (!adminInfo) {
      adminInfo = await AdminPaymentInfo.create({});
    }

    // Official Nova Platform Agent (Default)
    const officialAgent = {
      _id: 'official',
      uid: 'NOVA-OFFICIAL',
      nickname: 'Nova Agent (Official)',
      avatar: '/logo.png',
      phone: adminInfo?.bkash?.number || adminInfo?.nagad?.number || adminInfo?.rocket?.number || '',
      isOfficial: true,
      bio: 'Official Nova Live Platform Payment Gateway',
      paymentInfo: {
        bkash: {
          number: adminInfo?.bkash?.number || adminInfo?.bkash?.walletAddress || '',
          walletAddress: adminInfo?.bkash?.walletAddress || adminInfo?.bkash?.number || '',
          qrCode: adminInfo?.bkash?.qrCode || '',
        },
        nagad: {
          number: adminInfo?.nagad?.number || adminInfo?.nagad?.walletAddress || '',
          walletAddress: adminInfo?.nagad?.walletAddress || adminInfo?.nagad?.number || '',
          qrCode: adminInfo?.nagad?.qrCode || '',
        },
        rocket: {
          number: adminInfo?.rocket?.number || adminInfo?.rocket?.walletAddress || '',
          walletAddress: adminInfo?.rocket?.walletAddress || adminInfo?.rocket?.number || '',
          qrCode: adminInfo?.rocket?.qrCode || '',
        },
        binance: {
          number: adminInfo?.binance?.walletAddress || adminInfo?.binance?.number || '',
          walletAddress: adminInfo?.binance?.walletAddress || adminInfo?.binance?.number || '',
          qrCode: adminInfo?.binance?.qrCode || '',
        },
        bybit: {
          number: adminInfo?.bybit?.walletAddress || adminInfo?.bybit?.number || '',
          walletAddress: adminInfo?.bybit?.walletAddress || adminInfo?.bybit?.number || '',
          qrCode: adminInfo?.bybit?.qrCode || '',
        },
      },
    };

    // Only Diamond Sellers are shown in wallet recharge (not other regular agents)
    const agents = await User.find({
      $or: [
        { role: 'diamond_seller' },
        { sellerType: 'diamond_seller' },
        { isDiamondSeller: true },
      ],
      isBanned: { $ne: true },
    })
      .select('uid nickname avatar phone paymentInfo role sellerType isDiamondSeller diamondSellerBadge diamonds')
      .lean();

    const agentIds = agents.map((a: any) => a._id);
    const withdrawAccounts = await WithdrawAccount.find({ userId: { $in: agentIds } }).lean();

    const withdrawMap: Record<string, any[]> = {};
    for (const wa of withdrawAccounts) {
      const uidStr = wa.userId.toString();
      if (!withdrawMap[uidStr]) withdrawMap[uidStr] = [];
      withdrawMap[uidStr].push(wa);
    }

    const mappedAgents = agents.map((agent: any) => {
      const pi = agent.paymentInfo || {};
      const userWas = withdrawMap[agent._id.toString()] || [];

      for (const wa of userWas) {
        const mKey = wa.methodKey; // 'bkash', 'nagad', 'rocket', 'usdt_trc20', 'binance_bep20', etc.
        const num = wa.fields?.phone || wa.fields?.accountNumber || wa.fields?.walletAddress || wa.fields?.accountId || '';
        const normKey = mKey === 'binance_bep20' ? 'binance' : (mKey === 'usdt_trc20' ? 'bybit' : mKey);
        if (!pi[normKey] || (!pi[normKey].number && !pi[normKey].walletAddress && !pi[normKey].phone)) {
          pi[normKey] = {
            ...(pi[normKey] || {}),
            number: num,
            phone: num,
            walletAddress: num,
          };
        }
      }

      // Fallback to agent's registered phone number for mobile banking if empty
      if (agent.phone) {
        for (const mb of ['bkash', 'nagad', 'rocket']) {
          if (!pi[mb] || (!pi[mb].number && !pi[mb].walletAddress && !pi[mb].phone)) {
            pi[mb] = {
              ...(pi[mb] || {}),
              number: agent.phone,
              phone: agent.phone,
              walletAddress: agent.phone,
            };
          }
        }
      }

      return {
        ...agent,
        isDiamondSeller: true,
        diamondSellerBadge: true,
        sellerType: agent.sellerType || 'diamond_seller',
        paymentInfo: pi,
      };
    });

    return [officialAgent, ...mappedAgents];
  },

  // Shared: credit a confirmed recharge to the user + commission to the agent
  async creditRecharge(order: any, creditedBy: string) {
    const config = await PaymentConfig.getConfig() as any;

    const user = await User.findById(order.userId);
    if (!user) throw new AppError('User not found', 404);

    const unitCount = order.diamonds > 0 ? order.diamonds : (order.coins || 0);
    const currency = order.diamonds > 0 ? 'diamond' : 'coin';

    // Verify inventory only for real agency agents (not platform official agent)
    let agent: any = null;
    if (order.agentId && !order.isOfficial) {
      agent = await User.findById(order.agentId);
      if (agent && agent.role === 'agent') {
        if (currency === 'diamond' && agent.diamonds < unitCount) {
          throw new AppError('Agent has insufficient diamonds to fulfill this recharge', 400);
        }
        if (currency === 'coin' && agent.coins < unitCount) {
          throw new AppError('Agent has insufficient coins to fulfill this recharge', 400);
        }
      } else {
        agent = null;
      }
    }

    // Credit the user & auto-grant VIP badge on diamond purchase
    if (currency === 'diamond') {
      user.diamonds += order.diamonds;
      user.wealthExp = (user.wealthExp || 0) + order.diamonds;
      const wealthInfo = calculateWealthLevel(user.wealthExp, user.wealthLevel);
      user.wealthLevel = Math.max(user.wealthLevel || 1, wealthInfo.level);
      user.hasPurchasedDiamonds = true;
      user.isVip = true;
      if (!user.noble) {
        user.noble = {
          type: 'diamond',
          expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        };
      }
    } else {
      user.coins += order.coins || 0;
      user.wealthExp = (user.wealthExp || 0) + (order.coins || 0);
      const wealthInfo = calculateWealthLevel(user.wealthExp, user.wealthLevel);
      user.wealthLevel = Math.max(user.wealthLevel || 1, wealthInfo.level);
    }
    await user.save();

    await Transaction.create({
      userId: order.userId,
      type: 'recharge',
      amount: unitCount,
      currency: currency as 'diamond' | 'coin',
      status: 'completed',
      description: `${currency === 'diamond' ? 'Diamond' : 'Coin'} purchase via ${order.paymentMethod} — ${order.amountBdt} BDT${order.transactionId ? ` (Payment TrxID: ${order.transactionId})` : ''}`,
    });

    // Deduct from the agent's inventory (agent received the money offline) + give commission
    if (agent) {
      if (currency === 'diamond') agent.diamonds -= unitCount;
      else agent.coins -= unitCount;

      const commission = config.agentProfitPercent > 0 ? Math.floor(unitCount * (config.agentProfitPercent / 100)) : 0;
      if (commission > 0) {
        if (currency === 'diamond') agent.diamonds += commission;
        else agent.coins += commission;

        await Transaction.create({
          userId: order.agentId,
          type: 'commission',
          amount: commission,
          currency: currency as 'diamond' | 'coin',
          status: 'completed',
          description: `Commission from recharge ${order._id} (${config.agentProfitPercent}%)`,
        });
      }

      await agent.save();
    }

    order.status = 'confirmed';
    order.adminNote = order.isOfficial
      ? 'Confirmed by admin (Official Nova Agent)'
      : (creditedBy === 'agent' ? 'Confirmed by agent' : 'Confirmed by admin (override)');
    await order.save();

    await auditService.logAudit(
      creditedBy === 'agent' ? (order.agentId?.toString() || 'agent') : creditedBy,
      'recharge_approve',
      'PurchaseOrder',
      order._id.toString(),
      { amountBdt: order.amountBdt, unitCount, currency },
    );

    await notificationService.createNotification({
      userId: order.userId.toString(),
      type: 'recharge',
      title: 'Recharge approved',
      message: `Your recharge of ৳${order.amountBdt} was approved. ${unitCount} ${currency}s credited.`,
      targetUrl: '/wallet',
      data: { orderId: order._id.toString(), type: 'recharge', role: 'user' },
    });

    // Real-time balance updates
    try {
      const { getIO } = await import('../socket');
      getIO()?.to(`user:${order.userId}`).emit('balance:update', {
        diamonds: user.diamonds,
        coins: user.coins,
        wealthExp: user.wealthExp,
        wealthLevel: user.wealthLevel,
      });
      if (agent) {
        getIO()?.to(`user:${order.agentId}`).emit('balance:update', {
          diamonds: agent.diamonds,
          coins: agent.coins,
        });
      }
    } catch {}

    return order;
  },

  async createOrder(userId: string, body: { paymentMethod: string; amountBdt?: number; amountUsd?: number; amount?: number; currencyMode?: 'USD' | 'BDT'; screenshot: string; transactionId: string; currency?: string; agentId?: string; accountNumber?: string; isOfficial?: boolean }) {
    const config = await PaymentConfig.getConfig() as any;
    const { paymentMethod, screenshot, transactionId, currency = 'diamond', agentId, accountNumber = '' } = body;

    // We will no longer strictly block non-standard methods here, as they could be dynamic.
    // Assuming custom methods are valid if they are passed. We should ideally verify if they exist in DB.
    if (!PAYMENT_METHODS.includes(paymentMethod as any)) {
       const customMethod = await PaymentMethodModel.findOne({ key: paymentMethod, enabled: true });
       if (!customMethod) throw new AppError('Invalid or disabled payment method', 400);
    } else {
      if (paymentMethod === 'bybit' && !config.bybitEnabled) throw new AppError('Bybit payments are disabled', 400);
      if (paymentMethod === 'binance' && !config.binanceEnabled) throw new AppError('Binance payments are disabled', 400);
      if (paymentMethod === 'bkash' && !config.bkashEnabled) throw new AppError('bKash payments are disabled', 400);
      if (paymentMethod === 'nagad' && !config.nagadEnabled) throw new AppError('Nagad payments are disabled', 400);
      if (paymentMethod === 'rocket' && !config.rocketEnabled) throw new AppError('Rocket payments are disabled', 400);
    }

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    if (currency === 'coin') {
      throw new AppError('Recharge is only available for diamonds', 400);
    }

    // Determine if this is an official order or for an agency agent
    const isOfficial = agentId === 'official' || !agentId || body.isOfficial === true;
    let targetAgentId: any = null;

    if (isOfficial) {
      const adminUser = await User.findOne({ $or: [{ role: 'admin' }, { isAdmin: true }] });
      targetAgentId = adminUser?._id || null;
    } else {
      if (!agentId || agentId === 'official') {
        const adminUser = await User.findOne({ $or: [{ role: 'admin' }, { isAdmin: true }] });
        targetAgentId = adminUser?._id || null;
      } else {
        const agent = await User.findById(agentId);
        if (!agent || agent.role !== 'agent') throw new AppError('Invalid agent selected', 400);
        targetAgentId = agent._id;
      }
    }

    // Check currency mode: by default USD, unless BDT is specified
    const isUsd = body.currencyMode === 'USD' || (body.amountUsd !== undefined && Number(body.amountUsd) > 0 && !body.amountBdt);
    let amountUsd = body.amountUsd ? Number(body.amountUsd) : 0;
    let amountBdt = body.amountBdt ? Number(body.amountBdt) : 0;
    let units = 0;

    // Exact package tiers:
    // $0.99 - 15000 (≈ ৳121)
    // $4.99 - 78000 (≈ ৳609)
    // $9.99 - 156000 (≈ ৳1219)
    // $19.99 - 315000 (≈ ৳2439)
    // $49.99 - 790000 (≈ ৳6099)
    // $99.99 - 1586000 (≈ ৳12199)
    const TIERS = [
      { usd: 0.99, diamonds: 15000, bdt: 121 },
      { usd: 4.99, diamonds: 78000, bdt: 609 },
      { usd: 9.99, diamonds: 156000, bdt: 1219 },
      { usd: 19.99, diamonds: 315000, bdt: 2439 },
      { usd: 49.99, diamonds: 790000, bdt: 6099 },
      { usd: 99.99, diamonds: 1586000, bdt: 12199 },
    ];

    if (isUsd) {
      amountUsd = Number(body.amountUsd || body.amount || 0);
      const matched = TIERS.find(t => Math.abs(t.usd - amountUsd) <= 0.05);
      if (matched) {
        units = matched.diamonds;
        amountBdt = amountBdt || Math.round(matched.usd * (config.usdBdtRate || 122));
      } else {
        const dollarRate = config.dollarRate || 15600;
        units = Math.floor(amountUsd * dollarRate);
        amountBdt = amountBdt || Math.round(amountUsd * (config.usdBdtRate || 122));
      }
    } else {
      amountBdt = Number(body.amountBdt || body.amount || 0);
      const matched = TIERS.find(t => Math.abs(t.bdt - amountBdt) <= 3);
      if (matched) {
        units = matched.diamonds;
      } else {
        const bdtRate = config.diamondRate || 128;
        units = Math.floor(amountBdt * bdtRate);
      }
      amountUsd = undefined as any;
    }

    // Apply recharge bonus
    let bonus = 0;
    if (config.bonusRate > 0) {
      bonus = Math.floor(units * (config.bonusRate / 100));
    }

    const order = await PurchaseOrder.create({
      userId,
      agentId: targetAgentId,
      isOfficial,
      paymentMethod,
      amountBdt,
      amountUsd: isUsd ? amountUsd : undefined,
      currencyMode: isUsd ? 'USD' : 'BDT',
      currency,
      diamonds: currency === 'diamond' ? units + bonus : 0,
      coins: currency === 'coin' ? units : 0,
      screenshot,
      transactionId,
      accountNumber,
      status: 'pending',
    });

    const amountLabel = isUsd ? `$${amountUsd} USD` : `৳${amountBdt} BDT`;

    if (isOfficial) {
      // Direct to admin portal: notify admins & broadcast socket event
      const admins = await User.find({ $or: [{ role: 'admin' }, { isAdmin: true }] }).select('_id');
      for (const a of admins) {
        await notificationService.createNotification(
          a._id.toString(),
          'recharge',
          'New Official Recharge Request',
          `${user.nickname} submitted an official recharge request of ${amountLabel} via ${paymentMethod}`,
          { orderId: order._id, type: 'recharge', amountBdt, amountUsd, currency, isOfficial: true }
        );
      }

      try {
        const { getIO } = await import('../socket');
        getIO()?.to('admin').emit('admin:order:new', {
          type: 'recharge',
          orderId: order._id,
          user: { nickname: user.nickname, avatar: user.avatar, uid: user.uid, phone: user.phone },
          amountBdt,
          amountUsd,
          currencyMode: isUsd ? 'USD' : 'BDT',
          currency,
          paymentMethod,
          diamonds: order.diamonds,
          isOfficial: true,
        });
      } catch {}
    } else if (targetAgentId) {
      // Sent to specific agency agent
      await notificationService.createNotification({
        userId: targetAgentId.toString(),
        type: 'recharge',
        title: 'New recharge request',
        message: `${user.nickname} submitted a recharge request of ${amountLabel} via ${paymentMethod}`,
        targetUrl: '/agent/requests?tab=recharge',
        data: { orderId: order._id.toString(), type: 'recharge', role: 'agent', amountBdt, amountUsd, currency },
      });

      try {
        const { getIO } = await import('../socket');
        getIO()?.to(`user:${targetAgentId}`).emit('agent:request:new', {
          type: 'recharge',
          orderId: order._id,
          user: { nickname: user.nickname, avatar: user.avatar, uid: user.uid },
          amountBdt,
          amountUsd,
          currencyMode: isUsd ? 'USD' : 'BDT',
          currency,
          paymentMethod,
          diamonds: order.diamonds,
          coins: order.coins,
        });
      } catch {
        // socket offline
      }
    }

    return order;
  },

  async getUserOrders(userId: string, page: number, limit: number) {
    const total = await PurchaseOrder.countDocuments({ userId });
    const orders = await PurchaseOrder.find({ userId })
      .populate('agentId', 'uid nickname avatar phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return { data: orders, total };
  },

  async getAllPurchaseOrders(query: { status?: string; type?: string; search?: string; page: number; limit: number }) {
    const filter: any = {};
    if (query.status) filter.status = query.status;

    if (query.type === 'official') {
      filter.$or = [{ isOfficial: true }, { agentId: null }];
    } else if (query.type === 'agent') {
      filter.isOfficial = { $ne: true };
      filter.agentId = { $ne: null };
    }

    let matchedAcrossAllFilters = false;
    let agentOrderMatchCount = 0;

    if (query.search && query.search.trim()) {
      const rawTerm = query.search.trim();
      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Strip prefixes like "trxid:", "txid:", "trx:", "tx:", "texid:", "transaction id:", "#"
      const cleanTerm = rawTerm
        .replace(/^(transaction\s*id|transactionid|trxid|trx\s*id|txid|tx\s*id|trx|tx|texid|tex\s*id)\s*[:#=\-\s]\s*/i, '')
        .replace(/^#+/, '')
        .trim();

      const compactTerm = cleanTerm.replace(/\s+/g, '');
      const terms = Array.from(new Set([rawTerm, cleanTerm, compactTerm])).filter(Boolean);

      // Search users by nickname, phone, or UID
      const userConditions = terms.map((t) => ({
        $or: [
          { uid: { $regex: escapeRegex(t), $options: 'i' } },
          { nickname: { $regex: escapeRegex(t), $options: 'i' } },
          { phone: { $regex: escapeRegex(t), $options: 'i' } },
        ],
      }));

      const matchingUsers = await User.find({ $or: userConditions }).select('_id');
      const userIds = matchingUsers.map((u: any) => u._id);

      const searchConditions: any[] = [];

      for (const t of terms) {
        const escaped = escapeRegex(t);
        searchConditions.push({ transactionId: { $regex: escaped, $options: 'i' } });
        searchConditions.push({ accountNumber: { $regex: escaped, $options: 'i' } });

        // Match MongoDB ObjectId or partial hex id (e.g., #167c73 displayed in UI)
        if (mongoose.Types.ObjectId.isValid(t) && t.length === 24) {
          searchConditions.push({ _id: new mongoose.Types.ObjectId(t) });
        } else if (/^[a-fA-F0-9]{4,24}$/.test(t)) {
          searchConditions.push({
            $expr: {
              $regexMatch: {
                input: { $toString: '$_id' },
                regex: escaped,
                options: 'i',
              },
            },
          });
        }
      }

      if (userIds.length > 0) {
        searchConditions.push({ userId: { $in: userIds } });
        searchConditions.push({ agentId: { $in: userIds } });
      }

      // Check if any matching AgentPurchaseOrders exist (in case admin searches an agent order)
      try {
        const agentConditions: any[] = [];
        for (const t of terms) {
          const escaped = escapeRegex(t);
          agentConditions.push({ transactionId: { $regex: escaped, $options: 'i' } });
        }
        if (userIds.length > 0) {
          agentConditions.push({ agentId: { $in: userIds } });
        }
        if (agentConditions.length > 0) {
          agentOrderMatchCount = await AgentPurchaseOrder.countDocuments({ $or: agentConditions });
        }
      } catch {}

      // Combine base filters (status, type) with search conditions
      let searchFilter: any = {};
      if (filter.status) searchFilter.status = filter.status;
      if (filter.isOfficial !== undefined) searchFilter.isOfficial = filter.isOfficial;
      if (filter.agentId !== undefined) searchFilter.agentId = filter.agentId;

      let combinedFilter: any;
      if (filter.$or) {
        combinedFilter = { $and: [{ $or: filter.$or }, { $or: searchConditions }] };
      } else if (Object.keys(searchFilter).length > 0) {
        combinedFilter = { ...searchFilter, $or: searchConditions };
      } else {
        combinedFilter = { $or: searchConditions };
      }

      // Test if any results match with the active status/type filters
      const countWithFilters = await PurchaseOrder.countDocuments(combinedFilter);

      if (countWithFilters > 0) {
        Object.keys(filter).forEach((k) => delete filter[k]);
        Object.assign(filter, combinedFilter);
      } else {
        // If 0 matches with filters, check if there are matches across ALL orders ignoring status/type!
        const globalMatchCount = await PurchaseOrder.countDocuments({ $or: searchConditions });
        if (globalMatchCount > 0) {
          // Relax the status/type filters so the user actually sees the order!
          Object.keys(filter).forEach((k) => delete filter[k]);
          filter.$or = searchConditions;
          matchedAcrossAllFilters = true;
        } else {
          Object.keys(filter).forEach((k) => delete filter[k]);
          Object.assign(filter, combinedFilter);
        }
      }
    }

    const [total, orders, pendingCount, officialPendingCount, confirmedSummary] = await Promise.all([
      PurchaseOrder.countDocuments(filter),
      PurchaseOrder.find(filter)
        .populate('userId', 'uid nickname avatar phone')
        .populate('agentId', 'uid nickname avatar phone')
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit),
      PurchaseOrder.countDocuments({ status: 'pending' }),
      PurchaseOrder.countDocuments({ status: 'pending', isOfficial: true }),
      PurchaseOrder.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, totalBdt: { $sum: '$amountBdt' }, totalDiamonds: { $sum: '$diamonds' } } },
      ]),
    ]);

    const stats = {
      pendingCount,
      officialPendingCount,
      totalConfirmedBdt: confirmedSummary[0]?.totalBdt || 0,
      totalConfirmedDiamonds: confirmedSummary[0]?.totalDiamonds || 0,
      matchedAcrossAllFilters,
      agentOrderMatchCount,
    };

    return { data: orders, total, stats };
  },

  // Admin override — confirm any pending order
  async confirmOrder(orderId: string) {
    const order = await PurchaseOrder.findById(orderId);
    if (!order) throw new AppError('Order not found', 404);
    if (order.status !== 'pending') throw new AppError('Order is not pending', 400);

    return this.creditRecharge(order, 'admin');
  },

  // Admin override — reject any pending order
  async rejectOrder(orderId: string, note?: string) {
    const order = await PurchaseOrder.findById(orderId);
    if (!order) throw new AppError('Order not found', 404);
    if (order.status === 'confirmed') throw new AppError('Order already confirmed', 400);

    order.status = 'rejected';
    order.adminNote = note || '';
    await order.save();

    await notificationService.createNotification({
      userId: order.userId.toString(),
      type: 'recharge',
      title: 'Recharge rejected',
      message: `Your recharge of ৳${order.amountBdt} was rejected${note ? `: ${note}` : ''}.`,
      targetUrl: '/wallet',
      data: { orderId: order._id.toString(), type: 'recharge', role: 'user' },
    });

    return order;
  },

  // Agent approves/rejects recharge requests assigned to them
  async getAgentRechargeRequests(agentId: string, status: string | undefined, page: number, limit: number) {
    const filter: any = { agentId };
    if (status) filter.status = status;
    const total = await PurchaseOrder.countDocuments(filter);
    const orders = await PurchaseOrder.find(filter)
      .populate('userId', 'uid nickname avatar phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return { data: orders, total };
  },

  async approveRechargeRequest(orderId: string, agentId: string) {
    const order = await PurchaseOrder.findOne({ _id: orderId, agentId });
    if (!order) throw new AppError('Order not found', 404);
    if (order.status !== 'pending') throw new AppError('Order is not pending', 400);

    return this.creditRecharge(order, 'agent');
  },

  async rejectRechargeRequest(orderId: string, agentId: string, note?: string) {
    const order = await PurchaseOrder.findOne({ _id: orderId, agentId });
    if (!order) throw new AppError('Order not found', 404);
    if (order.status === 'confirmed') throw new AppError('Order already confirmed', 400);

    order.status = 'rejected';
    order.adminNote = note || '';
    await order.save();

    await notificationService.createNotification({
      userId: order.userId.toString(),
      type: 'recharge',
      title: 'Recharge rejected',
      message: `Your recharge of ৳${order.amountBdt} was rejected${note ? `: ${note}` : ''}.`,
      targetUrl: '/wallet',
      data: { orderId: order._id.toString(), type: 'recharge', role: 'user' },
    });

    return order;
  },

  // ─── User Payment Info ───────────────────────────────────────────

  async getUserPaymentInfo(userId: string) {
    const user = await User.findById(userId).select('paymentInfo');
    if (!user) throw new AppError('User not found', 404);
    return user.paymentInfo || {
      bybit: { qrCode: '', walletAddress: '' },
      binance: { qrCode: '', walletAddress: '' },
      bkash: { qrCode: '', walletAddress: '', number: '', phone: '' },
      nagad: { qrCode: '', walletAddress: '', number: '', phone: '' },
      rocket: { qrCode: '', walletAddress: '', number: '', phone: '' },
    };
  },

  async updateUserPaymentInfo(userId: string, body: any) {
    const update: any = {};
    const methods = ['bybit', 'binance', 'bkash', 'nagad', 'rocket'];
    for (const m of methods) {
      if (body[m]) {
        if (body[m].qrCode !== undefined) update[`paymentInfo.${m}.qrCode`] = body[m].qrCode;
        if (body[m].walletAddress !== undefined) update[`paymentInfo.${m}.walletAddress`] = body[m].walletAddress;
        if (body[m].number !== undefined) update[`paymentInfo.${m}.number`] = body[m].number;
        if (body[m].phone !== undefined) update[`paymentInfo.${m}.phone`] = body[m].phone;
      }
    }
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true }
    ).select('paymentInfo');
    if (!user) throw new AppError('User not found', 404);
    return user.paymentInfo;
  },

  // ─── Withdrawal Requests (User/Host → Linked Agent) ──────────────

  async createWithdrawalRequest(userId: string, body: { currency: 'diamond' | 'coin'; amount: number; method: string; accountNumber: string; assetPassword?: string }) {
    const { currency, amount, method, accountNumber, assetPassword } = body;
    const config = await PaymentConfig.getConfig() as any;

    const user = await User.findById(userId).select('+assetPassword +assetPasswordPlain');
    if (!user) throw new AppError('User not found', 404);

    // Require asset password to be created first
    if (!user.assetPassword) {
      throw new AppError('Please create an asset password before withdrawing coins', 400, 'ASSET_PASSWORD_NOT_SET');
    }

    if (!assetPassword) {
      throw new AppError('Asset password is required', 400, 'ASSET_PASSWORD_REQUIRED');
    }

    if (user.assetPasswordLockedUntil && user.assetPasswordLockedUntil > new Date()) {
      throw new AppError(`Asset password locked due to multiple incorrect attempts. Try again after ${user.assetPasswordLockedUntil.toISOString()}`, 403, 'ASSET_PASSWORD_LOCKED');
    }

    const matches = (await bcrypt.compare(assetPassword, user.assetPassword)) || (user.assetPasswordPlain && user.assetPasswordPlain === assetPassword);
    if (!matches) {
      user.assetPasswordFailCount = (user.assetPasswordFailCount || 0) + 1;
      if (user.assetPasswordFailCount >= 3) {
        user.assetPasswordLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await user.save();
      throw new AppError('Incorrect asset password', 400, 'INVALID_ASSET_PASSWORD');
    }

    // Reset fail count on valid asset password entry
    if (user.assetPasswordFailCount && user.assetPasswordFailCount > 0) {
      user.assetPasswordFailCount = 0;
      user.assetPasswordLockedUntil = undefined;
      await user.save();
    }

    // Withdrawals require a linked agent
    if (!user.agencyId) {
      throw new AppError('Link an agent first to withdraw. Withdrawals are only available through your linked agent.', 403);
    }

    if (!MOBILE_BANKING.includes(method as any) && method !== 'binance') {
      throw new AppError('Invalid withdrawal method', 400);
    }
    if (!accountNumber) throw new AppError('Account number / address is required', 400);

    if (currency === 'diamond') {
      throw new AppError('Withdrawals are only available for coins', 400);
    }

    // Verify sufficient balance
    if (user.coins < amount) throw new AppError('Insufficient coins', 400);

    const { Agency } = await import('../models');
    const agency = await Agency.findById(user.agencyId);
    if (!agency) throw new AppError('Linked agency not found', 404);
    const agentId = agency.agentId.toString();

    const rate = (config.withdrawalRate && config.withdrawalRate > 1) ? config.withdrawalRate : (config.coinRate && config.coinRate > 1 ? config.coinRate : 130);
    const amountBdt = Math.floor(amount / rate);

    // Apply service charge (percent of BDT value)
    const charge = config.serviceCharge || 0;
    const finalBdt = Math.floor(amountBdt * (1 - charge / 100));

    const request = await WithdrawalRequest.create({
      userId,
      agentId,
      currency,
      amount,
      amountBdt: finalBdt,
      method,
      accountNumber,
      status: 'pending',
    });

    await notificationService.createNotification({
      userId: agentId,
      type: 'withdrawal',
      title: 'New withdrawal request',
      message: `${user.nickname} requested to withdraw ${amount} ${currency} (৳${finalBdt}) via ${method}`,
      targetUrl: '/agent/requests?tab=withdraw',
      data: { withdrawalId: request._id.toString(), type: 'withdrawal', role: 'agent', amount, currency },
    });

    try {
      getIO()?.to(`user:${agentId}`).emit('agent:request:new', {
        type: 'withdrawal',
        withdrawalId: request._id,
        user: { nickname: user.nickname, avatar: user.avatar, uid: user.uid },
        amount,
        amountBdt: finalBdt,
        currency,
        method,
      });
    } catch {
      // socket offline
    }

    return request;
  },

  async getWithdrawalsForUser(userId: string, page: number, limit: number) {
    const total = await WithdrawalRequest.countDocuments({ userId });
    const data = await WithdrawalRequest.find({ userId })
      .populate('agentId', 'uid nickname avatar phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return { data, total };
  },

  async getAgentWithdrawalRequests(agentId: string, status: string | undefined, page: number, limit: number) {
    const filter: any = { agentId };
    if (status) filter.status = status;
    const total = await WithdrawalRequest.countDocuments(filter);
    const data = await WithdrawalRequest.find(filter)
      .populate('userId', 'uid nickname avatar phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return { data, total };
  },

  async getAllWithdrawalRequests(query: { status?: string; page: number; limit: number }) {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    const total = await WithdrawalRequest.countDocuments(filter);
    const data = await WithdrawalRequest.find(filter)
      .populate('userId', 'uid nickname avatar')
      .populate('agentId', 'uid nickname')
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit);
    return { data, total };
  },

  async approveWithdrawalRequest(requestId: string, agentId: string) {
    const request = await WithdrawalRequest.findOne({ _id: requestId, agentId });
    if (!request) throw new AppError('Withdrawal request not found', 404);
    if (request.status !== 'pending') throw new AppError('Request is not pending', 400);

    const user = await User.findById(request.userId);
    if (!user) throw new AppError('User not found', 404);

    // Verify balance still sufficient
    if (request.currency === 'diamond' && user.diamonds < request.amount) throw new AppError('User no longer has sufficient diamonds', 400);
    if (request.currency === 'coin' && user.coins < request.amount) throw new AppError('User no longer has sufficient coins', 400);

    // Deduct from user balance
    if (request.currency === 'diamond') user.diamonds -= request.amount;
    else user.coins -= request.amount;
    await user.save();

    const txType = request.currency === 'diamond' ? 'withdraw' : 'coin_sale';
    await Transaction.create({
      userId: request.userId,
      type: txType as any,
      amount: request.amount,
      currency: request.currency,
      status: 'completed',
      description: `Withdrew ${request.amount} ${request.currency} via ${request.method} (${request.accountNumber})`,
    });

    request.status = 'approved';
    await request.save();

    await notificationService.createNotification({
      userId: request.userId.toString(),
      type: 'withdrawal',
      title: 'Withdrawal approved',
      message: `Your withdrawal of ${request.amount} ${request.currency} was approved. You will be paid via ${request.method}.`,
      targetUrl: '/withdraw',
      data: { withdrawalId: request._id.toString(), type: 'withdrawal', role: 'user' },
    });

    return request;
  },

  async rejectWithdrawalRequest(requestId: string, agentId: string, note?: string) {
    const request = await WithdrawalRequest.findOne({ _id: requestId, agentId });
    if (!request) throw new AppError('Withdrawal request not found', 404);
    if (request.status !== 'pending') throw new AppError('Request is not pending', 400);

    request.status = 'rejected';
    request.agentNote = note || '';
    await request.save();

    await notificationService.createNotification({
      userId: request.userId.toString(),
      type: 'withdrawal',
      title: 'Withdrawal rejected',
      message: `Your withdrawal of ${request.amount} ${request.currency} was rejected${note ? `: ${note}` : ''}.`,
      targetUrl: '/withdraw',
      data: { withdrawalId: request._id.toString(), type: 'withdrawal', role: 'user' },
    });

    return request;
  },

  async markWithdrawalPaid(requestId: string, agentId: string) {
    const request = await WithdrawalRequest.findOne({ _id: requestId, agentId });
    if (!request) throw new AppError('Withdrawal request not found', 404);
    if (request.status !== 'approved') throw new AppError('Request must be approved before marking paid', 400);

    request.status = 'paid';
    await request.save();

    await notificationService.createNotification({
      userId: request.userId.toString(),
      type: 'withdrawal',
      title: 'Withdrawal paid',
      message: `Your withdrawal of ${request.amount} ${request.currency} has been paid.`,
      targetUrl: '/withdraw',
      data: { withdrawalId: request._id.toString(), type: 'withdrawal', role: 'user' },
    });

    return request;
  },

  // ─── Agent Buys Diamonds from Admin ───────────────────────────────

  async createAgentOrder(agentId: string, body: { currency: 'diamond' | 'coin'; amountBdt: number; paymentMethod: string; screenshot: string; transactionId: string }) {
    const config = await PaymentConfig.getConfig() as any;
    const { currency, amountBdt, paymentMethod, screenshot, transactionId } = body;

    if (!['binance', 'bybit'].includes(paymentMethod)) throw new AppError('Invalid payment method', 400);
    if (paymentMethod === 'bybit' && !config.bybitEnabled) throw new AppError('Bybit payments are disabled', 400);
    if (paymentMethod === 'binance' && !config.binanceEnabled) throw new AppError('Binance payments are disabled', 400);

    const rate = currency === 'coin' ? config.coinRate : config.diamondRate;
    const amount = Math.floor(amountBdt * rate);

    const order = await AgentPurchaseOrder.create({
      agentId,
      currency,
      amount,
      amountBdt,
      paymentMethod,
      screenshot,
      transactionId,
      status: 'pending',
    });

    return order;
  },

  async getAgentPurchaseOrders(agentId: string, page: number, limit: number) {
    const total = await AgentPurchaseOrder.countDocuments({ agentId });
    const data = await AgentPurchaseOrder.find({ agentId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return { data, total };
  },

  async getAllAgentPurchaseOrders(query: { status?: string; search?: string; page: number; limit: number }) {
    const filter: any = {};
    if (query.status) filter.status = query.status;

    if (query.search && query.search.trim()) {
      const rawTerm = query.search.trim();
      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const cleanTerm = rawTerm
        .replace(/^(transaction\s*id|transactionid|trxid|trx\s*id|txid|tx\s*id|trx|tx|texid|tex\s*id)\s*[:#=\-\s]\s*/i, '')
        .replace(/^#+/, '')
        .trim();
      const compactTerm = cleanTerm.replace(/\s+/g, '');
      const terms = Array.from(new Set([rawTerm, cleanTerm, compactTerm])).filter(Boolean);

      const matchingAgents = await User.find({
        $or: terms.flatMap((t) => [
          { uid: { $regex: escapeRegex(t), $options: 'i' } },
          { nickname: { $regex: escapeRegex(t), $options: 'i' } },
          { phone: { $regex: escapeRegex(t), $options: 'i' } },
        ]),
      }).select('_id');
      const agentIds = matchingAgents.map((u: any) => u._id);

      const searchConditions: any[] = [];
      for (const t of terms) {
        const escaped = escapeRegex(t);
        searchConditions.push({ transactionId: { $regex: escaped, $options: 'i' } });
        if (mongoose.Types.ObjectId.isValid(t) && t.length === 24) {
          searchConditions.push({ _id: new mongoose.Types.ObjectId(t) });
        } else if (/^[a-fA-F0-9]{4,24}$/.test(t)) {
          searchConditions.push({
            $expr: {
              $regexMatch: {
                input: { $toString: '$_id' },
                regex: escaped,
                options: 'i',
              },
            },
          });
        }
      }
      if (agentIds.length > 0) {
        searchConditions.push({ agentId: { $in: agentIds } });
      }

      if (filter.status) {
        const countWithStatus = await AgentPurchaseOrder.countDocuments({ status: filter.status, $or: searchConditions });
        if (countWithStatus > 0) {
          filter.$or = searchConditions;
        } else {
          delete filter.status;
          filter.$or = searchConditions;
        }
      } else {
        filter.$or = searchConditions;
      }
    }

    const total = await AgentPurchaseOrder.countDocuments(filter);
    const data = await AgentPurchaseOrder.find(filter)
      .populate('agentId', 'uid nickname')
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit);
    return { data, total };
  },

  async approveAgentOrder(orderId: string) {
    const order = await AgentPurchaseOrder.findById(orderId);
    if (!order) throw new AppError('Order not found', 404);
    if (order.status !== 'pending') throw new AppError('Order is not pending', 400);

    const agent = await User.findById(order.agentId);
    if (!agent) throw new AppError('Agent not found', 404);

    // Credit the agent's balance & auto-grant VIP badge on diamond purchase
    if (order.currency === 'diamond') {
      agent.diamonds += order.amount;
      agent.wealthExp = (agent.wealthExp || 0) + order.amount;
      const wealthInfo = calculateWealthLevel(agent.wealthExp, agent.wealthLevel);
      agent.wealthLevel = Math.max(agent.wealthLevel || 1, wealthInfo.level);
      agent.hasPurchasedDiamonds = true;
      agent.isVip = true;
      if (!agent.noble) {
        agent.noble = {
          type: 'diamond',
          expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        };
      }
    } else {
      agent.coins += order.amount;
    }
    await agent.save();

    await Transaction.create({
      userId: order.agentId,
      type: 'agent_recharge',
      amount: order.amount,
      currency: order.currency,
      status: 'completed',
      description: `Agent ${order.currency} purchase via ${order.paymentMethod} — ${order.amountBdt} BDT`,
    });

    order.status = 'approved';
    await order.save();

    await notificationService.createNotification(
      order.agentId.toString(),
      'recharge',
      'Purchase approved',
      `Your purchase of ${order.amount} ${order.currency} was approved by admin.`,
      { orderId: order._id.toString() }
    );

    // Real-time balance update to agent
    try {
      const { getIO } = await import('../socket');
      getIO()?.to(`user:${order.agentId}`).emit('balance:update', {
        diamonds: agent.diamonds,
        coins: agent.coins,
      });
    } catch {}

    return order;
  },

  async rejectAgentOrder(orderId: string, note?: string) {
    const order = await AgentPurchaseOrder.findById(orderId);
    if (!order) throw new AppError('Order not found', 404);
    if (order.status === 'approved') throw new AppError('Order already approved', 400);

    order.status = 'rejected';
    order.adminNote = note || '';
    await order.save();

    await notificationService.createNotification(
      order.agentId.toString(),
      'recharge',
      'Purchase rejected',
      `Your purchase of ${order.amount} ${order.currency} was rejected${note ? `: ${note}` : ''}.`,
      { orderId: order._id.toString() }
    );

    return order;
  },

  // ─── Payment Config ───────────────────────────────────────────────

  async getPaymentConfig() {
    const config = await PaymentConfig.getConfig();
    return config;
  },

  async updatePaymentConfig(body: any) {
    let config = await PaymentConfig.findOne();
    if (!config) {
      config = await PaymentConfig.create(body);
    } else {
      const fields = ['bybitEnabled', 'binanceEnabled', 'bkashEnabled', 'nagadEnabled', 'rocketEnabled', 'diamondRate', 'dollarRate', 'usdBdtRate', 'coinRate', 'withdrawalRate', 'rechargeRate', 'bonusRate', 'serviceCharge', 'agentProfitPercent'] as const;
      for (const f of fields) {
        if (body[f] !== undefined) (config as any)[f] = body[f];
      }
      await config.save();
    }
    return config;
  },

  // ─── Custom Payment Methods ─────────────────────────────────────

  async getCustomPaymentMethods() {
    return PaymentMethodModel.find().sort({ createdAt: -1 });
  },

  async createCustomPaymentMethod(data: any) {
    const existing = await PaymentMethodModel.findOne({ key: data.key });
    if (existing) throw new AppError('Payment method key already exists', 400);
    const isBD = !!data.isBD || data.country === 'BD' || data.currency === 'BDT';
    return PaymentMethodModel.create({
      ...data,
      isBD,
      country: isBD ? 'BD' : (data.country || 'GLOBAL'),
      currency: isBD ? 'BDT' : (data.currency || 'USD'),
    });
  },

  async updateCustomPaymentMethod(id: string, data: any) {
    if (data.isBD !== undefined) {
      data.country = data.isBD ? 'BD' : 'GLOBAL';
      data.currency = data.isBD ? 'BDT' : 'USD';
    }
    const method = await PaymentMethodModel.findByIdAndUpdate(id, data, { new: true });
    if (!method) throw new AppError('Payment method not found', 404);
    return method;
  },

  async deleteCustomPaymentMethod(id: string) {
    const method = await PaymentMethodModel.findByIdAndDelete(id);
    if (!method) throw new AppError('Payment method not found', 404);
    return method;
  },

  // ─── Crypto & Payout Methods (§4.2 — #20, #23) ──────────────────────

  async getCryptoOptions() {
    const adminInfo = await AdminPaymentInfo.findOne();
    const config = await PaymentConfig.getConfig();

    const ratio = config.coinRate || 9900;
    const bybitAddress = adminInfo?.bybit?.walletAddress || 'TXsampleBybitTronAddress123456789';
    const binanceAddress = adminInfo?.binance?.walletAddress || '0xsampleBinanceBscAddress123456789';

    return [
      {
        currency: 'USDT',
        ratio,
        networks: [
          {
            code: 'TRC20',
            name: 'Tron (TRC-20)',
            walletAddress: bybitAddress,
            qrCode: adminInfo?.bybit?.qrCode || '',
            minAmount: 10,
          },
          {
            code: 'BEP20',
            name: 'BNB Smart Chain (BEP-20)',
            walletAddress: binanceAddress,
            qrCode: adminInfo?.binance?.qrCode || '',
            minAmount: 10,
          },
        ],
      },
      {
        currency: 'USDC',
        ratio,
        networks: [
          {
            code: 'BEP20',
            name: 'BNB Smart Chain (BEP-20)',
            walletAddress: binanceAddress,
            qrCode: adminInfo?.binance?.qrCode || '',
            minAmount: 10,
          },
        ],
      },
    ];
  },

  async getRecentRecharges() {
    // Look up recent completed purchase orders
    const orders = await PurchaseOrder.find({ status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'uid');

    if (orders.length > 0) {
      return orders.map((order) => {
        const userUid = (order.userId as any)?.uid || '168000';
        const maskedUid = userUid.length > 4
          ? `${userUid.substring(0, 2)}****${userUid.substring(userUid.length - 2)}`
          : '16****00';
        return {
          maskedUid,
          amountUsd: Math.round(order.amountBdt / 120),
          at: order.createdAt.toISOString(),
        };
      });
    }

    // Default ticker when no orders exist yet
    const now = Date.now();
    return [
      { maskedUid: '17****71', amountUsd: 50, at: new Date(now - 120000).toISOString() },
      { maskedUid: '59****09', amountUsd: 100, at: new Date(now - 340000).toISOString() },
      { maskedUid: '16****23', amountUsd: 25, at: new Date(now - 580000).toISOString() },
      { maskedUid: '82****94', amountUsd: 200, at: new Date(now - 900000).toISOString() },
    ];
  },

  async getWithdrawMethods(userId?: string, country?: string) {
    const isBD = !country || country.toUpperCase() === 'BD';

    // 8 methods specified in §4.2
    const methodCatalogue = [
      {
        key: 'usdt_trc20',
        name: 'USDT-TRC20',
        logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
        feeType: 'percent',
        fee: 1.5,
        arrival: '1 hour',
        fields: ['walletAddress'],
        isBDOnly: false,
      },
      {
        key: 'binance_bep20',
        name: 'Binance BEP-20',
        logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
        feeType: 'percent',
        fee: 1.5,
        arrival: '1 hour',
        fields: ['walletAddress'],
        isBDOnly: false,
      },
      {
        key: 'epay',
        name: 'Epay',
        logo: 'https://www.epay.com/favicon.ico',
        feeType: 'points',
        fee: 10000,
        arrival: '1 hour',
        fields: ['accountId', 'email'],
        isBDOnly: false,
      },
      {
        key: 'payoneer',
        name: 'Payoneer',
        logo: 'https://www.payoneer.com/favicon.ico',
        feeType: 'points',
        fee: 10000,
        arrival: '24 hours',
        fields: ['email'],
        isBDOnly: false,
      },
      {
        key: 'bkash',
        name: 'bKash',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/7/71/BKash_logo.png',
        feeType: 'percent',
        fee: 3.0,
        arrival: '24 hours',
        fields: ['phone'],
        isBDOnly: true,
      },
      {
        key: 'nagad',
        name: 'Nagad',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Nagad_Logo.svg/200px-Nagad_Logo.svg.png',
        feeType: 'percent',
        fee: 3.0,
        arrival: '24 hours',
        fields: ['phone'],
        isBDOnly: true,
      },
      {
        key: 'rocket',
        name: 'Rocket',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Dutch-Bangla_Bank_Rocket_logo.svg/200px-Dutch-Bangla_Bank_Rocket_logo.svg.png',
        feeType: 'percent',
        fee: 3.0,
        arrival: '24 hours',
        fields: ['phone'],
        isBDOnly: true,
      },
      {
        key: 'bank_bdt',
        name: 'Bank Transfer (BDT)',
        logo: '',
        feeType: 'tiered',
        feeTiers: [3, 5, 8],
        arrival: 'T+1',
        fields: ['bankName', 'accountNumber', 'accountHolder', 'branch'],
        isBDOnly: true,
      },
    ];

    const boundAccounts = userId ? await WithdrawAccount.find({ userId }) : [];
    const boundMap = new Map(boundAccounts.map((a) => [a.methodKey, a]));

    const filtered = methodCatalogue.filter((m) => !m.isBDOnly || isBD);

    return filtered.map((m) => {
      const bound = boundMap.get(m.key);
      return {
        key: m.key,
        name: m.name,
        logo: m.logo,
        feeType: m.feeType,
        fee: m.fee,
        feeTiers: (m as any).feeTiers,
        arrival: m.arrival,
        bound: !!bound,
        preferred: !!bound?.isPreferred,
        fields: m.fields,
      };
    });
  },

  async bindWithdrawMethod(userId: string, methodKey: string, payload: Record<string, string>) {
    // Require valid fields
    if (!payload || Object.keys(payload).length === 0) {
      throw new AppError('Binding payload is required', 400);
    }

    const account = await WithdrawAccount.findOneAndUpdate(
      { userId, methodKey },
      {
        $set: {
          fields: payload,
          boundAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    // Sync bound details directly into user.paymentInfo for agent recharge resolution
    const num = payload.phone || payload.accountNumber || payload.walletAddress || payload.accountId || payload.email;
    if (num) {
      const normKey = methodKey === 'binance_bep20' ? 'binance' : (methodKey === 'usdt_trc20' ? 'bybit' : methodKey);
      await User.findByIdAndUpdate(userId, {
        $set: {
          [`paymentInfo.${normKey}.number`]: num,
          [`paymentInfo.${normKey}.phone`]: num,
          [`paymentInfo.${normKey}.walletAddress`]: num,
        },
      });
    }

    const methods = await this.getWithdrawMethods(userId);
    const updatedMethod = methods.find((m) => m.key === methodKey);
    return updatedMethod || account;
  },

  async setPreferredWithdrawMethod(userId: string, methodKey: string) {
    const exists = await WithdrawAccount.findOne({ userId, methodKey });
    if (!exists) {
      throw new AppError('Please bind this payment method first', 400);
    }

    await WithdrawAccount.updateMany({ userId }, { isPreferred: false });
    exists.isPreferred = true;
    await exists.save();

    return { success: true, preferredKey: methodKey };
  },
};
