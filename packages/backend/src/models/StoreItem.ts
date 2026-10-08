import { Schema, model, Document } from 'mongoose';

/**
 * Store catalogue (BACKEND-GUIDE.md §4.0 — #45–#49, #51).
 *
 * Frames, rides, bubbles and themes are referenced by the party room, chat,
 * profile, level rewards and the bag, so this is built first.
 */
export type StoreCategory =
  | 'avatar_frame'
  | 'ride'
  | 'chat_bubble'
  | 'party_theme'
  | 'profile_card'
  | 'rare_id'
  | 'honor'
  | 'badge';

export interface IStoreItemDocument extends Document {
  category: StoreCategory;
  name: string;
  description?: string;
  /** Card art. */
  image: string;
  /** Animated preview. */
  preview: string;
  /** rare_id only — the id being sold, e.g. "40004". */
  displayId?: string;
  rarity?: 'SSR' | 'SR' | null;
  priceCoins: number;
  /** Price in diamonds */
  priceDiamonds: number;
  /** The second currency (12 / 30 / 140). */
  priceTickets: number;
  /** null = permanent. */
  durationDays?: number | null;
  badge?: 'NEW' | 'HOT' | null;
  giftable: boolean;
  /** #51 — honor-tab items are gated by the user's honor level. */
  requiredHonorLevel: number;
  /** #51 — "Limit: 688/5000". */
  dailyLimit?: number | null;
  /** #51 — Custom Ride "2/3". */
  monthlyLimit?: number | null;
  soldToday: number;
  soldThisMonth: number;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const storeItemSchema = new Schema<IStoreItemDocument>(
  {
    category: {
      type: String,
      enum: ['avatar_frame', 'ride', 'chat_bubble', 'party_theme', 'profile_card', 'rare_id', 'honor', 'badge'],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    preview: { type: String, default: '' },
    displayId: { type: String },
    rarity: { type: String, default: null },
    priceCoins: { type: Number, default: 0, min: 0 },
    priceDiamonds: { type: Number, default: 0, min: 0 },
    priceTickets: { type: Number, default: 0, min: 0 },
    durationDays: { type: Number, default: null },
    badge: { type: String, default: null },
    giftable: { type: Boolean, default: false },
    requiredHonorLevel: { type: Number, default: 0, min: 0 },
    dailyLimit: { type: Number, default: null },
    monthlyLimit: { type: Number, default: null },
    soldToday: { type: Number, default: 0 },
    soldThisMonth: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

storeItemSchema.index({ category: 1, isActive: 1, order: 1 });
// Rare IDs must be unique among the ids actually being sold.
storeItemSchema.index({ displayId: 1 }, { unique: true, sparse: true });

export const StoreItem = model<IStoreItemDocument>('StoreItem', storeItemSchema);
