import { Types } from 'mongoose';
import { StoreItem, UserInventory, User, AuditLog, StoreCategory } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getIO } from '../socket';

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

    // Ensure 1:1 Subscription Card exists in catalogue with 50,000 coins price (Coins only, no diamonds)
    try {
      const existingSub = await StoreItem.findOne({ category: 'subscription' });
      if (!existingSub) {
        await StoreItem.create({
          category: 'subscription',
          name: '1:1 Subscription Card',
          description: '1 Week Validity • 100 Filter Matches • 5 Free 1-Min Calls',
          image: '🎴',
          preview: '',
          priceCoins: 50000,
          priceDiamonds: 0,
          durationDays: 7,
          badge: 'VIP',
          isActive: true,
          order: 1,
        });
      } else {
        let changed = false;
        if (existingSub.priceCoins !== 50000) {
          existingSub.priceCoins = 50000;
          changed = true;
        }
        if (existingSub.priceDiamonds !== 0) {
          existingSub.priceDiamonds = 0;
          changed = true;
        }
        if (changed) {
          await existingSub.save();
        }
      }
    } catch {}

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

    // 6. Calculate expiration date & activate subscription if applicable
    let expiresAt: Date | null = null;
    const durationDays = item.durationDays && item.durationDays > 0 ? item.durationDays : 7;

    if (item.category === 'subscription') {
      const now = new Date();
      const currentExpiry = recipient.matchSubscription?.expiresAt ? new Date(recipient.matchSubscription.expiresAt) : null;
      const isStillActive = Boolean(recipient.matchSubscription?.active && currentExpiry && currentExpiry > now);

      expiresAt = isStillActive && currentExpiry
        ? new Date(currentExpiry.getTime() + durationDays * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      const newFilterMatches = isStillActive
        ? (recipient.matchSubscription?.filterMatchesRemaining || 0) + 100
        : 100;
      const newFreeCalls = isStillActive
        ? (recipient.matchSubscription?.freeCallsRemaining || 0) + 5
        : 5;

      recipient.matchSubscription = {
        active: true,
        startDate: now,
        expiresAt,
        filterMatchesRemaining: newFilterMatches,
        totalFilterMatches: newFilterMatches,
        freeCallsRemaining: newFreeCalls,
        totalFreeCalls: newFreeCalls,
      };
      recipient.markModified('matchSubscription');
      await recipient.save();

      try {
        getIO().to(`user:${recipient._id}`).emit('user:update', {
          matchSubscription: recipient.matchSubscription,
        });
      } catch {}
    } else if (item.durationDays && item.durationDays > 0) {
      expiresAt = new Date(Date.now() + item.durationDays * 24 * 60 * 60 * 1000);
    }

    // 7. Add to recipient inventory (Item is added directly to Bag; equipped via Bag)
    const inventory = await UserInventory.create({
      userId: recipient._id,
      itemId: item._id,
      category: item.category,
      expiresAt,
      equipped: false,
      isNewItem: true,
      source: giftToUserId ? 'gift' : 'purchased',
      acquiredAt: new Date(),
    });

    // Push real-time balance update to buyer socket room
    try {
      getIO().to(`user:${userId}`).emit('balance:update', {
        coins: updatedBuyer.coins,
        diamonds: updatedBuyer.diamonds,
        tickets: updatedBuyer.tickets,
        wealthExp: updatedBuyer.wealthExp,
        wealthLevel: updatedBuyer.wealthLevel,
      });
    } catch {}

    return {
      success: true,
      inventoryId: inventory._id,
      item,
      balances: {
        coins: updatedBuyer.coins,
        diamonds: updatedBuyer.diamonds,
        tickets: updatedBuyer.tickets,
      },
      matchSubscription: recipient.matchSubscription,
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
