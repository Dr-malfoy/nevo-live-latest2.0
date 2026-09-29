import { Schema, model, Document } from 'mongoose';
import { StoreCategory } from './StoreItem';

/**
 * The user's Bag (BACKEND-GUIDE.md §4.0 — #22, #29).
 *
 * One row per owned item. `isNew` drives the red dot; `equipped` is mirrored
 * onto `User.equipped[category]` for cheap profile reads.
 */
export interface IUserInventoryDocument extends Document {
  userId: Schema.Types.ObjectId;
  itemId: Schema.Types.ObjectId;
  category: StoreCategory;
  /** null = permanent. */
  expiresAt?: Date | null;
  equipped: boolean;
  /** Drives the bag's red dot until the user opens the bag (API field: `isNew`). */
  isNewItem: boolean;
  acquiredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userInventorySchema = new Schema<IUserInventoryDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'StoreItem', required: true },
    category: { type: String, required: true },
    expiresAt: { type: Date, default: null },
    equipped: { type: Boolean, default: false },
    // Not `isNew` — that name is reserved by Mongoose's Document.
    isNewItem: { type: Boolean, default: true },
    acquiredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userInventorySchema.index({ userId: 1, category: 1, equipped: 1 });
userInventorySchema.index({ userId: 1, isNewItem: 1 });
// Expiry sweep — permanent rows have no expiresAt, so they are never touched.
userInventorySchema.index({ expiresAt: 1 });

export const UserInventory = model<IUserInventoryDocument>('UserInventory', userInventorySchema);
