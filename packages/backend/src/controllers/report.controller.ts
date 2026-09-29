import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const reportController = {
  // Any authenticated user/agent can report
  async createReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetType, targetId, reason, details } = req.body;
      const report = await reportService.createReport(req.user!.userId, { targetType, targetId, reason, details });
      sendSuccess(res, report, 'Report submitted', 201);
    } catch (error) {
      next(error);
    }
  },

  // Admin: list reports
  async getAllReports(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const targetType = req.query.targetType as string;
      const { data, total } = await reportService.getAllReports({ status, targetType, page, limit });
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  // Admin: update report status
  async updateReportStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, adminNote } = req.body;
      const report = await reportService.updateReportStatus(req.params.id, req.user!.userId, status, adminNote);
      sendSuccess(res, report, 'Report updated');
    } catch (error) {
      next(error);
    }
  },
};
