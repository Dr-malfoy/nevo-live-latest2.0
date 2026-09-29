import { Schema, model, Document } from 'mongoose';

export interface ISeat {
  index: number;
  userId?: Schema.Types.ObjectId;
  isLocked: boolean;
  /** §4.9 — a muted member cannot speak until the host/admin unmutes them. */
  isMuted: boolean;
  /** §4.9 — gift value received on this seat; drives the crown / winner bar. */
  giftValue: number;
  /** §4.9 — the crown sits on the seat that has received the most gifts. */
  crown: boolean;
}

export interface IRoomDocument extends Document {
  ownerId: Schema.Types.ObjectId;
  name: string;
  description: string;
  /** §4.9 — StoreItem id (party_theme) decorating the room. */
  theme?: Schema.Types.ObjectId | string;
  /** §4.9 — the scrolling "Make A Wish" banner. */
  announcement: string;
  /** §4.9 — party rooms default to 16 seats. */
  seatCount: number;
  /** §4.9 — members with host powers (seat lock / mute / kick). */
  admins: Schema.Types.ObjectId[];
  seats: ISeat[];
  isPrivate: boolean;
  password?: string;
  status: 'active' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoomDocument>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    theme: { type: Schema.Types.Mixed, default: null },
    announcement: { type: String, default: '' },
    seatCount: { type: Number, default: 16, min: 1, max: 16 },
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    seats: [
      {
        index: { type: Number, required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        isLocked: { type: Boolean, default: false },
        isMuted: { type: Boolean, default: false },
        giftValue: { type: Number, default: 0 },
        crown: { type: Boolean, default: false },
      },
    ],
    isPrivate: { type: Boolean, default: false },
    password: { type: String, select: false },
    status: { type: String, enum: ['active', 'closed'], default: 'active', index: true },
  },
  { timestamps: true }
);

roomSchema.index({ isPrivate: 1 });

export const Room = model<IRoomDocument>('Room', roomSchema);
