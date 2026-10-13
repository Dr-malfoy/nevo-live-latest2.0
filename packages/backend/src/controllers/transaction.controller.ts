import { Request, Response, NextFunction } from 'express';
import { transactionService } from '../services/transaction.service';
import { sendPaginated, sendSuccess } from '../utils/response';

export const transactionController = {
  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      let types: string[] | undefined;
      if (req.query.types) {
        types = String(req.query.types)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (req.query.type) {
        types = [String(req.query.type).trim()];
      }
      const { data, total } = await transactionService.getUserTransactions(req.user!.userId, page, limit, types);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async getTransactionDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const transaction = await transactionService.getTransactionById(id, req.user!.userId);
      sendSuccess(res, transaction);
    } catch (error) {
      next(error);
    }
  },
};
