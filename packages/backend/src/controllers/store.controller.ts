import { Request, Response, NextFunction } from 'express';
import { storeService } from '../services/store.service';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';

export const storeController = {
  /** GET /api/store/items?category=&sort=hot|latest|level&page=&limit= */
  async getItems(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, sort, page, limit } = req.query as any;
      const result = await storeService.getItems({
        category,
        sort,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      sendPaginated(res, result.items, result.total, result.page, result.limit);
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/store/honor */
  async getHonor(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const result = await storeService.getHonorItems(userId || '');
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/store/buy */
  async buy(req: Request, res: Response, next: NextFunction) {
    try {
      const { itemId, payWith = 'coins', giftToUserId } = req.body;
      if (!itemId) {
        sendError(res, 'Item ID is required', 400);
        return;
      }

      const result = await storeService.buyItem({
        userId: req.user!.userId,
        itemId,
        payWith,
        giftToUserId,
      });

      sendSuccess(res, result, 'Item purchased successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/users/me/bag */
  async getBag(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await storeService.getUserBag(req.user!.userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/users/me/bag/:inventoryId/equip */
  async equip(req: Request, res: Response, next: NextFunction) {
    try {
      const { inventoryId } = req.params;
      const { equipped = true } = req.body;

      const result = await storeService.equipItem(req.user!.userId, inventoryId, equipped);
      sendSuccess(res, result, equipped ? 'Item equipped' : 'Item unequipped');
    } catch (error) {
      next(error);
    }
  },
};
