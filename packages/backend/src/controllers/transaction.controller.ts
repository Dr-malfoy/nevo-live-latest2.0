import { Request, Response, NextFunction } from 'express';
import { transactionService } from '../services/transaction.service';
import { sendPaginated } from '../utils/response';

export const transactionController = {
  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { data, total } = await transactionService.getUserTransactions(req.user!.userId, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },
};
