import { Report, User, Notification, PurchaseOrder, WithdrawalRequest, AgentPurchaseOrder } from '../models';
import { AppError } from '../middleware/errorHandler';
import { auditService } from './audit.service';
import { getIO } from '../socket';

export const reportService = {
  async createReport(reporterId: string, body: { targetType: 'user' | 'stream' | 'moment' | 'transaction'; targetId: string; reason: string; details?: string }) {
    const { targetType, targetId, reason, details } = body;

    if (!targetType || !targetId || !reason) {
      throw new AppError('targetType, targetId, and reason are required', 400);
    }
    if (!['user', 'stream', 'moment', 'transaction'].includes(targetType)) {
      throw new AppError('Invalid target type', 400);
    }

    // Validate target exists
    if (targetType === 'user') {
      const target = await User.findById(targetId);
      if (!target) throw new AppError('Target user not found', 404);
    }

    // Transaction reports: must be a pending order the reporter owns (or their agent order)
    if (targetType === 'transaction') {
      const [order, withdrawal, agentOrder] = await Promise.all([
        PurchaseOrder.findById(targetId),
        WithdrawalRequest.findById(targetId),
        AgentPurchaseOrder.findById(targetId),
      ]);

      const found = order || withdrawal || agentOrder;
      if (!found) throw new AppError('Transaction not found', 404);

      const isPending =
        (order && order.status === 'pending') ||
        (withdrawal && withdrawal.status === 'pending') ||
        (agentOrder && agentOrder.status === 'pending');
      if (!isPending) {
        throw new AppError('Only pending transactions can be reported', 400);
      }

      // Ownership: reporter must be the user, the assigned agent, or an admin
      const f: any = found;
      const involvedIds = [f.userId?.toString(), f.agentId?.toString()].filter(Boolean);
      const reporter = await User.findById(reporterId);
      if (!involvedIds.includes(reporterId) && reporter?.role !== 'admin') {
        throw new AppError('You can only report your own transactions', 403);
      }
    }

    // Dedupe: one open report per reporter + target
    const existing = await Report.findOne({
      reporterId,
      targetType,
      targetId,
      status: 'pending',
    });
    if (existing) {
      throw new AppError('You have already reported this. It is under review.', 400);
    }

    const report = await Report.create({ reporterId, targetType, targetId, reason, details });

    // Notify admins via broadcast + create notifications for each admin
    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        type: 'system',
        title: 'New report',
        message: `${targetType} reported: ${reason}`,
        data: { reportId: report._id },
      });
    }
    try {
      getIO().emit('report:new', { reportId: report._id });
    } catch {
      // socket not initialized
    }

    await auditService.logAudit(reporterId, 'report_create', targetType, targetId, { reason });

    return report;
  },

  async getAllReports(query: { status?: string; targetType?: string; page: number; limit: number }) {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.targetType) filter.targetType = query.targetType;

    const total = await Report.countDocuments(filter);
    const data = await Report.find(filter)
      .populate('reporterId', 'uid nickname avatar')
      .populate('reviewedBy', 'uid nickname')
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit);
    return { data, total };
  },

  async updateReportStatus(reportId: string, adminId: string, status: string, adminNote?: string) {
    if (!['reviewed', 'dismissed', 'actioned'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const report = await Report.findById(reportId);
    if (!report) throw new AppError('Report not found', 404);

    report.status = status as any;
    if (adminNote !== undefined) report.adminNote = adminNote;
    report.reviewedBy = adminId as any;
    await report.save();

    await auditService.logAudit(adminId, 'report_review', 'Report', reportId, { status, adminNote });

    // Notify reporter of the outcome
    await Notification.create({
      userId: report.reporterId,
      type: 'system',
      title: 'Report update',
      message: `Your report has been ${status}${adminNote ? `: ${adminNote}` : ''}`,
      data: { reportId: report._id },
    });

    return report;
  },
};
