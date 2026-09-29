import { Request, Response, NextFunction } from 'express';
import { giftService } from '../services/gift.service';
import { sendSuccess } from '../utils/response';

export const giftController = {
  async listGifts(req: Request, res: Response, next: NextFunction) {
    try {
      const gifts = await giftService.listActiveGifts();
      sendSuccess(res, gifts);
    } catch (error) {
      next(error);
    }
  },

  async sendGift(req: Request, res: Response, next: NextFunction) {
    try {
      const { receiverId, giftId, quantity, sourceType } = req.body;
      const result = await giftService.sendGift(
        req.user!.userId,
        receiverId,
        giftId,
        quantity || 1,
        sourceType || 'other'
      );
      sendSuccess(res, result, 'Gift sent successfully');
    } catch (error) {
      next(error);
    }
  },
};
