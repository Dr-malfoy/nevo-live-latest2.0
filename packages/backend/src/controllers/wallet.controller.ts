import { Request, Response, NextFunction } from 'express';
import { walletService } from '../services/wallet.service';
import { sendSuccess } from '../utils/response';

export const walletController = {
  async getWallet(_req: Request, res: Response, next: NextFunction) {
    try {
      const wallet = await walletService.getWallet();
      const history = await walletService.getWalletHistory();
      sendSuccess(res, { wallet, history });
    } catch (error) {
      next(error);
    }
  },

  async lookupUser(req: Request, res: Response, next: NextFunction) {
    try {
      const query = (req.query.query || req.query.identifier || req.params.identifier) as string;
      const user = await walletService.lookupRecipient(query);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  },

  async transfer(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId, targetId, identifier, userId, currency, amount } = req.body;
      const target = targetId || identifier || agentId || userId;
      if (!target || !currency || amount === undefined || amount === null) {
        res.status(400).json({ success: false, error: 'Target User ID/Agent ID, currency, and amount are required' });
        return;
      }
      const result = await walletService.transferCurrency(
        req.user!.userId,
        target,
        currency as 'diamond' | 'coin',
        Number(amount),
        req.ip
      );
      sendSuccess(res, result, 'Transfer completed successfully');
    } catch (error) {
      next(error);
    }
  },
};
