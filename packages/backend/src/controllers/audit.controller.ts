import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';
import { sendPaginated } from '../utils/response';

export const auditController = {
  async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { actorId, targetType, action, from, to } = req.query as any;
      const { data, total } = await auditService.getAuditLogs({ actorId, targetType, action, from, to, page, limit });
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },
};
