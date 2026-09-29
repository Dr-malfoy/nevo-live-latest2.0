import { Schema, model, Document } from 'mongoose';

export interface IChatDocument extends Document {
  participants: Schema.Types.ObjectId[];
  /** §4.10 — 1:1 chats stay `private`; fan/party group chats reuse the same stack. */
  type: 'private' | 'group';
  /** §4.10 — set when `type` is `group` (fan group or party group). */
  groupId?: Schema.Types.ObjectId;
  lastMessage: string;
  lastMessageAt: Date;
  lastMessageBy?: Schema.Types.ObjectId;
  /** #16C.4 / #21E — consecutive days both sides have exchanged a message. */
  streakDays: number;
  streakLastDate?: Date;
  /** §4.10 — per-caller mute; a muted chat still receives but never badges. */
  mutedBy: Schema.Types.ObjectId[];
  /** §4.10 — soft delete: the chat hides for these users only. */
  hiddenBy: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChatDocument>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    type: { type: String, enum: ['private', 'group'], default: 'private', index: true },
    groupId: { type: Schema.Types.ObjectId, index: true, sparse: true },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date },
    lastMessageBy: { type: Schema.Types.ObjectId, ref: 'User' },
    streakDays: { type: Number, default: 0 },
    streakLastDate: { type: Date },
    mutedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    hiddenBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Unique index on the sorted participant pair (2-person chat)
chatSchema.index({ participants: 1 });
chatSchema.index({ lastMessageAt: -1 });

export const Chat = model<IChatDocument>('Chat', chatSchema);
