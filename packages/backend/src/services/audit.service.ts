import { AuditLog } from '../models';

export const auditService = {
  async logAudit(actorId: string, action: string, targetType: string, targetId?: string, details?: Record<string, any>, ip?: string) {
    return AuditLog.create({ actorId, action, targetType, targetId, details, ip });
  },

  async getAuditLogs(query: { actorId?: string; targetType?: string; action?: string; from?: string; to?: string; page: number; limit: number }) {
    const filter: any = {};
    if (query.actorId) filter.actorId = query.actorId;
    if (query.targetType) filter.targetType = query.targetType;
    if (query.action) filter.action = query.action;
    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = new Date(query.from);
      if (query.to) filter.createdAt.$lte = new Date(query.to);
    }

    const total = await AuditLog.countDocuments(filter);
    const data = await AuditLog.find(filter)
      .populate('actorId', 'uid nickname role')
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit);
    return { data, total };
  },
};
