import { Request, Response, NextFunction } from 'express';
import { incomeService, IncomeSourceKey } from '../services/income.service';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';

export const incomeController = {
  /** GET /api/income/summary?range=24h|7d|30d */
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const range = (req.query.range as '24h' | '7d' | '30d') || '30d';
      const summary = await incomeService.getIncomeSummary(req.user!.userId, range);
      sendSuccess(res, summary);
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/income/source/:key?range=&page=&limit= */
  async getSource(req: Request, res: Response, next: NextFunction) {
    try {
      const key = req.params.key as IncomeSourceKey;
      const range = (req.query.range as '24h' | '7d' | '30d') || '30d';
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const result = await incomeService.getIncomeSourceDrilldown(req.user!.userId, key, range, page, limit);
      sendPaginated(res, result.data, result.total, result.page, result.limit);
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/income/exchange */
  async exchange(req: Request, res: Response, next: NextFunction) {
    try {
      const { points } = req.body;
      const result = await incomeService.exchangePoints(req.user!.userId, points);
      sendSuccess(res, result, 'Points exchanged successfully');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/transfer/quote?receiverUid= */
  async getTransferQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const { receiverUid } = req.query as { receiverUid: string };
      const quote = await incomeService.getTransferQuote(receiverUid);
      sendSuccess(res, quote);
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/transfer */
  async transfer(req: Request, res: Response, next: NextFunction) {
    try {
      const { receiverUid, points } = req.body;
      if (!receiverUid || !points) {
        sendError(res, 'Receiver UID and points are required', 400);
        return;
      }
      const result = await incomeService.transferPoints(req.user!.userId, receiverUid, Number(points));
      sendSuccess(res, result, 'Points transferred successfully');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/transfer/history */
  async getTransferHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const result = await incomeService.getTransferHistory(req.user!.userId, page, 20);
      sendPaginated(res, result.data, result.total, result.page, result.limit);
    } catch (error) {
      next(error);
    }
  },
};
