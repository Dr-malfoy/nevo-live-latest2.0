import { Types } from 'mongoose';
import { StoreItem, UserInventory, User, AuditLog, StoreCategory } from '../models';
import { AppError } from '../middleware/errorHandler';

export interface BuyItemParams {
  userId: string;
  itemId: string;
  payWith: 'coins' | 'diamonds' | 'tickets';
  giftToUserId?: string;
  assetPasswordToken?: string;
}

export const storeService = {
  async getItems(params: { category?: string; sort?: 'hot' | 'latest' | 'level'; page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const filter: any = { isActive: true };

    if (params.category && params.category !== 'popular') {
      filter.category = params.category;
    }

    let sortOption: any = { order: 1, createdAt: -1 };
    if (params.sort === 'hot') {
      sortOption = { soldToday: -1, order: 1 };
    } else if (params.sort === 'latest') {
      sortOption = { createdAt: -1 };
    } else if (params.sort === 'level') {
      sortOption = { requiredHonorLevel: -1, order: 1 };
    }

    const total = await StoreItem.countDocuments(filter);
    const items = await StoreItem.find(filter)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getHonorItems(userId: string) {
    const user = await User.findById(userId).select('honorLevel');
    const honorLevel = user?.honorLevel || 0;

    const items = await StoreItem.find({
      category: 'honor',
      isActive: true,
    }).sort({ requiredHonorLevel: 1, order: 1 });

    return {
      honorLevel,
      items,
    };
  },

  async buyItem({ userId, itemId, payWith, giftToUserId }: BuyItemParams) {
    const buyer = await User.findById(userId);
    if (!buyer) throw new AppError('User not found', 404);

    const targetUserId = giftToUserId || userId;
    const recipient = giftToUserId ? await User.findById(giftToUserId) : buyer;
    if (!recipient) throw new AppError('Recipient not found', 404);

    const item = await StoreItem.findById(itemId);
    if (!item || !item.isActive) throw new AppError('Item not found or unavailable', 404);

    if (giftToUserId && !item.giftable) {
      throw new AppError('This item cannot be gifted', 400);
    }

    // 1. Check Honor level requirement
    if (item.requiredHonorLevel > 0 && (buyer.honorLevel || 0) < item.requiredHonorLevel) {
      throw new AppError(`Honor Level ${item.requiredHonorLevel} or above required`, 403);
    }

    // 2. Check Daily & Monthly limits
    if (item.dailyLimit != null && item.soldToday >= item.dailyLimit) {
      throw new AppError('Sold out for today', 409);
    }
    if (item.monthlyLimit != null && item.soldThisMonth >= item.monthlyLimit) {
      throw new AppError('Sold out for this month', 409);
    }

    // 3. Currency and Atomic Price deduction
    const isTickets = payWith === 'tickets';
    const isDiamonds = payWith === 'diamonds';
    let price = 0;
    if (isTickets) {
      price = item.priceTickets || 0;
    } else if (isDiamonds) {
      price = item.priceDiamonds || 0;
    } else {
      price = item.priceCoins || 0;
    }

    if (price <= 0) {
      throw new AppError(`This item cannot be purchased with ${payWith}`, 400);
    }

    const updateFilter: any = { _id: buyer._id };
    const updateAction: any = { $inc: {} };

    if (isTickets) {
      updateFilter.tickets = { $gte: price };
      updateAction.$inc.tickets = -price;
    } else if (isDiamonds) {
      updateFilter.diamonds = { $gte: price };
      updateAction.$inc.diamonds = -price;
    } else {
      updateFilter.coins = { $gte: price };
      updateAction.$inc.coins = -price;
    }

    const updatedBuyer = await User.findOneAndUpdate(updateFilter, updateAction, { new: true });
    if (!updatedBuyer) {
      throw new AppError(`Insufficient ${payWith} balance`, 400);
    }

    // 4. Handle Rare ID replacement
    if (item.category === 'rare_id') {
      if (!item.displayId) {
        throw new AppError('Rare ID configuration missing', 500);
      }

      // Check if displayId is already taken by another user
      const existingUserWithUid = await User.findOne({ uid: item.displayId });
      if (existingUserWithUid) {
        // Refund buyer balance
        const refundAction: any = { $inc: {} };
        if (isTickets) refundAction.$inc.tickets = price;
        else refundAction.$inc.coins = price;
        await User.updateOne({ _id: buyer._id }, refundAction);
        throw new AppError('This ID is no longer available', 409);
      }

      const oldUid = recipient.uid;
      const newUid = item.displayId;

      recipient.uid = newUid;
      await recipient.save();

      // Deactivate the store item so it cannot be purchased again
      item.isActive = false;
      await item.save();

      // Write AuditLog
      await AuditLog.create({
        adminId: buyer._id,
        action: 'rare_id_purchase',
        targetType: 'User',
        targetId: recipient._id,
        details: {
          oldUid,
          newUid,
          itemId: item._id,
          price,
          currency: payWith,
        },
      });
    }

    // 5. Update item sales counter
    await StoreItem.updateOne(
      { _id: item._id },
      { $inc: { soldToday: 1, soldThisMonth: 1 } }
    );

    // 6. Calculate expiration date
    let expiresAt: Date | null = null;
    if (item.durationDays && item.durationDays > 0) {
      expiresAt = new Date(Date.now() + item.durationDays * 24 * 60 * 60 * 1000);
    }

    // 7. Add to recipient inventory
    const autoEquip = item.category === 'badge';
    if (autoEquip) {
      await UserInventory.updateMany(
        { userId: recipient._id, category: 'badge' },
        { equipped: false }
      );
    }

    const inventory = await UserInventory.create({
      userId: recipient._id,
      itemId: item._id,
      category: item.category,
      expiresAt,
      equipped: autoEquip,
      isNewItem: true,
      source: giftToUserId ? 'gift' : 'purchased',
      acquiredAt: new Date(),
    });

    if (autoEquip) {
      if (!recipient.equipped) recipient.equipped = {};
      recipient.equipped.badge = item._id as any;
      recipient.equippedBadge = {
        _id: item._id as any,
        name: item.name,
        image: item.image,
        preview: item.preview || item.image,
        rarity: item.rarity || undefined,
      };
      recipient.markModified('equipped');
      recipient.markModified('equippedBadge');
      await recipient.save();
    }

    return {
      success: true,
      inventoryId: inventory._id,
      item,
      balances: {
        coins: updatedBuyer.coins,
        diamonds: updatedBuyer.diamonds,
        tickets: updatedBuyer.tickets,
      },
    };
  },

  async getUserBag(userId: string) {
    const inventories = await UserInventory.find({
      userId,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    })
      .populate('itemId')
      .sort({ createdAt: -1 });

    const hasNew = inventories.some((inv) => inv.isNewItem);

    // Clear isNewItem flag now that the user accessed their bag
    if (hasNew) {
      await UserInventory.updateMany({ userId, isNewItem: true }, { isNewItem: false });
    }

    const items = inventories.map((inv) => {
      const storeItem = inv.itemId as any;
      return {
        _id: inv._id,
        itemId: storeItem?._id || inv.itemId,
        category: (inv.category || storeItem?.category || 'badge') as StoreCategory,
        name: storeItem?.name || 'Item',
        description: storeItem?.description || '',
        icon: storeItem?.preview || storeItem?.image || '',
        image: storeItem?.image || '',
        preview: storeItem?.preview || storeItem?.image || '',
        rarity: storeItem?.rarity || null,
        displayId: storeItem?.displayId || null,
        source: inv.source || (storeItem?.priceCoins || storeItem?.priceDiamonds || storeItem?.priceTickets ? 'purchased' : 'earned'),
        expiresAt: inv.expiresAt ? inv.expiresAt.toISOString() : null,
        acquiredAt: inv.acquiredAt ? inv.acquiredAt.toISOString() : null,
        equipped: Boolean(inv.equipped),
        isNew: Boolean(inv.isNewItem),
      };
    });

    return {
      items,
      hasNew,
    };
  },

  async equipItem(userId: string, inventoryId: string, equipped: boolean = true) {
    const inventory = await UserInventory.findOne({ _id: inventoryId, userId });
    if (!inventory) throw new AppError('Item not found in your bag', 404);

    if (inventory.expiresAt && inventory.expiresAt < new Date()) {
      throw new AppError('This item has expired', 400);
    }

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    if (!user.equipped) {
      user.equipped = {};
    }

    if (equipped) {
      // Unequip all items of the same category for this user
      await UserInventory.updateMany(
        { userId, category: inventory.category },
        { equipped: false }
      );
      inventory.equipped = true;
      await inventory.save();

      // Mirror onto user document
      user.equipped[inventory.category] = inventory.itemId as any;

      if (inventory.category === 'badge') {
        const storeItem = await StoreItem.findById(inventory.itemId);
        if (storeItem) {
          user.equippedBadge = {
            _id: storeItem._id as any,
            name: storeItem.name,
            image: storeItem.image,
            preview: storeItem.preview || storeItem.image,
            rarity: storeItem.rarity || undefined,
          };
        }
      }

      user.markModified('equipped');
      user.markModified('equippedBadge');
      await user.save();
    } else {
      inventory.equipped = false;
      await inventory.save();

      if (user.equipped && user.equipped[inventory.category]?.toString() === inventory.itemId.toString()) {
        delete user.equipped[inventory.category];
        if (inventory.category === 'badge') {
          user.equippedBadge = undefined;
        }
        user.markModified('equipped');
        user.markModified('equippedBadge');
        await user.save();
      }
    }

    return {
      inventoryId: inventory._id,
      category: inventory.category,
      equipped: inventory.equipped,
      equippedBadge: user.equippedBadge,
      equippedMap: user.equipped,
    };
  },
};
