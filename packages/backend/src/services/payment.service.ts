import {
  PurchaseOrder, User, Transaction, PaymentConfig,
  AdminPaymentInfo, WithdrawalRequest, AgentPurchaseOrder,
  PaymentMethod as PaymentMethodModel, WithdrawAccount,
} from '../models';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { auditService } from './audit.service';

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

  async updateAdminPaymentInfo(body: { bybit?: { qrCode?: string; walletAddress?: string }; binance?: { qrCode?: string; walletAddress?: string } }) {
    const update: any = {};
    if (body.bybit) {
      if (body.bybit.qrCode !== undefined) update['bybit.qrCode'] = body.bybit.qrCode;
      if (body.bybit.walletAddress !== undefined) update['bybit.walletAddress'] = body.bybit.walletAddress;
    }
    if (body.binance) {
      if (body.binance.qrCode !== undefined) update['binance.qrCode'] = body.binance.qrCode;
      if (body.binance.walletAddress !== undefined) update['binance.walletAddress'] = body.binance.walletAddress;
    }
    const info = await AdminPaymentInfo.findOneAndUpdate(
      {},
      { $set: update },
      { upsert: true, new: true }
    );
    return info;
  },

  // ─── User Recharge Orders (User → Agent) ─────────────────────────

  async getAgentsForRecharge() {
    // Agents with payment info, for users to pay
    const agents = await User.find({
      role: 'agent',
      $or: [
        { 'paymentInfo.bybit.qrCode': { $ne: '' } },
        { 'paymentInfo.bybit.walletAddress': { $ne: '' } },
        { 'paymentInfo.binance.qrCode': { $ne: '' } },
        { 'paymentInfo.binance.walletAddress': { $ne: '' } },
      ],
    })
      .select('uid nickname avatar phone paymentInfo');
    return agents;
  },

  // Shared: credit a confirmed recharge to the user + commission to the agent
  async creditRecharge(order: any, creditedBy: string) {
    const config = await PaymentConfig.getConfig() as any;

    const user = await User.findById(order.userId);
    if (!user) throw new AppError('User not found', 404);

    const unitCount = order.diamonds > 0 ? order.diamonds : (order.coins || 0);
    const currency = order.diamonds > 0 ? 'diamond' : 'coin';

    // First, verify the payer has enough inventory BEFORE crediting anyone
    let agent: any = null;
    if (order.agentId) {
      agent = await User.findById(order.agentId);
      if (agent) {
        if (currency === 'diamond' && agent.diamonds < unitCount) {
          throw new AppError('Agent has insufficient diamonds to fulfill this recharge', 400);
        }
        if (currency === 'coin' && agent.coins < unitCount) {
          throw new AppError('Agent has insufficient coins to fulfill this recharge', 400);
        }
      }
    }

    // Credit the user & auto-grant VIP badge on diamond purchase
    if (currency === 'diamond') {
      user.diamonds += order.diamonds;
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
    }
    await user.save();

    await Transaction.create({
      userId: order.userId,
      type: 'recharge',
      amount: unitCount,
      currency: currency as 'diamond' | 'coin',
      status: 'completed',
      description: `${currency === 'diamond' ? 'Diamond' : 'Coin'} purchase via ${order.paymentMethod} — ${order.amountBdt} BDT`,
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
    order.adminNote = creditedBy === 'agent' ? 'Confirmed by agent' : 'Confirmed by admin (override)';
    await order.save();

    await auditService.logAudit(
      creditedBy === 'agent' ? order.agentId.toString() : creditedBy,
      'recharge_approve',
      'PurchaseOrder',
      order._id.toString(),
      { amountBdt: order.amountBdt, unitCount, currency },
    );

    await notificationService.createNotification(
      order.userId.toString(),
      'recharge',
      'Recharge approved',
      `Your recharge of ৳${order.amountBdt} was approved. ${unitCount} ${currency}s credited.`,
      { orderId: order._id.toString() }
    );

    // Real-time balance updates
    try {
      const { getIO } = await import('../socket');
      getIO()?.to(`user:${order.userId}`).emit('balance:update', {
        diamonds: user.diamonds,
        coins: user.coins,
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

  async createOrder(userId: string, body: { paymentMethod: string; amountBdt: number; screenshot: string; transactionId: string; currency?: string; agentId?: string; accountNumber?: string }) {
    const config = await PaymentConfig.getConfig() as any;
    const { paymentMethod, amountBdt, screenshot, transactionId, currency = 'diamond', agentId, accountNumber = '' } = body;

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

    // No auto-assignment: an agent must be explicitly chosen to pay.
    if (!agentId) {
      throw new AppError('No agent selected. Choose an agent to pay.', 400);
    }

    const agent = await User.findById(agentId);
    if (!agent || agent.role !== 'agent') throw new AppError('Invalid agent', 400);

    // Use rechargeRate for the units (fundamental: recharge-specific rate)
    const rate = currency === 'coin'
      ? (config.rechargeRate || config.coinRate)
      : (config.rechargeRate || config.diamondRate);
    const units = Math.floor(amountBdt * rate);

    // Apply recharge bonus
    let bonus = 0;
    if (config.bonusRate > 0 && currency === 'diamond') {
      bonus = Math.floor(units * (config.bonusRate / 100));
    }

    const order = await PurchaseOrder.create({
      userId,
      agentId,
      paymentMethod,
      amountBdt,
      diamonds: currency === 'diamond' ? units + bonus : 0,
      coins: currency === 'coin' ? units : 0,
      screenshot,
      transactionId,
      accountNumber,
      status: 'pending',
    });

    await notificationService.createNotification(
      agentId,
      'recharge',
      'New recharge request',
      `${user.nickname} submitted a recharge request of ৳${amountBdt} via ${paymentMethod}`,
      { orderId: order._id }
    );

    return order;
  },

  async getUserOrders(userId: string, page: number, limit: number) {
    const total = await PurchaseOrder.countDocuments({ userId });
    const orders = await PurchaseOrder.find({ userId })
      .populate('agentId', 'uid nickname')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return { data: orders, total };
  },

  async getAllPurchaseOrders(query: { status?: string; page: number; limit: number }) {
    const filter: any = {};
    if (query.status) filter.status = query.status;

    const total = await PurchaseOrder.countDocuments(filter);
    const orders = await PurchaseOrder.find(filter)
      .populate('userId', 'uid nickname avatar')
      .populate('agentId', 'uid nickname')
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit);
    return { data: orders, total };
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

    await notificationService.createNotification(
      order.userId.toString(),
      'recharge',
      'Recharge rejected',
      `Your recharge of ৳${order.amountBdt} was rejected${note ? `: ${note}` : ''}.`,
      { orderId: order._id.toString() }
    );

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

    await notificationService.createNotification(
      order.userId.toString(),
      'recharge',
      'Recharge rejected',
      `Your recharge of ৳${order.amountBdt} was rejected${note ? `: ${note}` : ''}.`,
      { orderId: order._id.toString() }
    );

    return order;
  },

  // ─── User Payment Info ───────────────────────────────────────────

  async getUserPaymentInfo(userId: string) {
    const user = await User.findById(userId).select('paymentInfo');
    if (!user) throw new AppError('User not found', 404);
    return user.paymentInfo || { bybit: { qrCode: '', walletAddress: '' }, binance: { qrCode: '', walletAddress: '' } };
  },

  async updateUserPaymentInfo(userId: string, body: { bybit?: { qrCode?: string; walletAddress?: string }; binance?: { qrCode?: string; walletAddress?: string } }) {
    const update: any = {};
    if (body.bybit) {
      if (body.bybit.qrCode !== undefined) update['paymentInfo.bybit.qrCode'] = body.bybit.qrCode;
      if (body.bybit.walletAddress !== undefined) update['paymentInfo.bybit.walletAddress'] = body.bybit.walletAddress;
    }
    if (body.binance) {
      if (body.binance.qrCode !== undefined) update['paymentInfo.binance.qrCode'] = body.binance.qrCode;
      if (body.binance.walletAddress !== undefined) update['paymentInfo.binance.walletAddress'] = body.binance.walletAddress;
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

  async createWithdrawalRequest(userId: string, body: { currency: 'diamond' | 'coin'; amount: number; method: string; accountNumber: string }) {
    const { currency, amount, method, accountNumber } = body;
    const config = await PaymentConfig.getConfig() as any;

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // Withdrawals require a linked agent
    if (!user.agencyId) {
      throw new AppError('Link an agent first to withdraw. Withdrawals are only available through your linked agent.', 403);
    }

    if (!MOBILE_BANKING.includes(method as any) && method !== 'binance') {
      throw new AppError('Invalid withdrawal method', 400);
    }
    if (!accountNumber) throw new AppError('Account number / address is required', 400);

    // Verify sufficient balance
    if (currency === 'diamond' && user.diamonds < amount) throw new AppError('Insufficient diamonds', 400);
    if (currency === 'coin' && user.coins < amount) throw new AppError('Insufficient coins', 400);

    const { Agency } = await import('../models');
    const agency = await Agency.findById(user.agencyId);
    if (!agency) throw new AppError('Linked agency not found', 404);
    const agentId = agency.agentId.toString();

    const rate = config.withdrawalRate || (currency === 'coin' ? config.coinRate : config.diamondRate);
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

    await notificationService.createNotification(
      agentId,
      'withdrawal',
      'New withdrawal request',
      `${user.nickname} requested to withdraw ${amount} ${currency} (৳${finalBdt}) via ${method}`,
      { withdrawalId: request._id }
    );

    return request;
  },

  async getWithdrawalsForUser(userId: string, page: number, limit: number) {
    const total = await WithdrawalRequest.countDocuments({ userId });
    const data = await WithdrawalRequest.find({ userId })
      .populate('agentId', 'uid nickname')
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

    await notificationService.createNotification(
      request.userId.toString(),
      'withdrawal',
      'Withdrawal approved',
      `Your withdrawal of ${request.amount} ${request.currency} was approved. You will be paid via ${request.method}.`,
      { withdrawalId: request._id.toString() }
    );

    return request;
  },

  async rejectWithdrawalRequest(requestId: string, agentId: string, note?: string) {
    const request = await WithdrawalRequest.findOne({ _id: requestId, agentId });
    if (!request) throw new AppError('Withdrawal request not found', 404);
    if (request.status !== 'pending') throw new AppError('Request is not pending', 400);

    request.status = 'rejected';
    request.agentNote = note || '';
    await request.save();

    await notificationService.createNotification(
      request.userId.toString(),
      'withdrawal',
      'Withdrawal rejected',
      `Your withdrawal of ${request.amount} ${request.currency} was rejected${note ? `: ${note}` : ''}.`,
      { withdrawalId: request._id.toString() }
    );

    return request;
  },

  async markWithdrawalPaid(requestId: string, agentId: string) {
    const request = await WithdrawalRequest.findOne({ _id: requestId, agentId });
    if (!request) throw new AppError('Withdrawal request not found', 404);
    if (request.status !== 'approved') throw new AppError('Request must be approved before marking paid', 400);

    request.status = 'paid';
    await request.save();

    await notificationService.createNotification(
      request.userId.toString(),
      'withdrawal',
      'Withdrawal paid',
      `Your withdrawal of ${request.amount} ${request.currency} has been paid.`,
      { withdrawalId: request._id.toString() }
    );

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

  async getAllAgentPurchaseOrders(query: { status?: string; page: number; limit: number }) {
    const filter: any = {};
    if (query.status) filter.status = query.status;
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
      const fields = ['bybitEnabled', 'binanceEnabled', 'bkashEnabled', 'nagadEnabled', 'rocketEnabled', 'diamondRate', 'coinRate', 'withdrawalRate', 'rechargeRate', 'bonusRate', 'serviceCharge', 'agentProfitPercent'] as const;
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
    return PaymentMethodModel.create(data);
  },

  async updateCustomPaymentMethod(id: string, data: any) {
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
