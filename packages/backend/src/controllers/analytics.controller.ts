import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { sendSuccess } from '../utils/response';

export const analyticsController = {
  async getReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to } = req.query as any;
      const [summary, daily] = await Promise.all([
        analyticsService.getSummary(from, to),
        analyticsService.getDailySeries(from, to),
      ]);
      sendSuccess(res, { summary, daily });
    } catch (error) {
      next(error);
    }
  },

  async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to } = req.query as any;
      const daily = await analyticsService.getDailySeries(from, to);

      const rows = [
        ['date', 'total', 'recharge', 'withdraw', 'coin_sale'],
        ...daily.map((r) => [r.date, r.total, r.recharge, r.withdraw, r.coinSale]),
      ];
      const csv = rows.map((r) => r.join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');
      res.send(csv);
    } catch (error) {
      next(error);
    }
  },
};
