import { Schema, model, Document } from 'mongoose';

/**
 * Fan group (BACKEND-GUIDE.md §4.10 — #41, #59).
 *
 * A host's group chat. Messages reuse the existing chat stack via
 * `Chat.type: 'group'` + `Chat.groupId` — this model is only the group itself.
 */
export interface IFanGroupDocument extends Document {
  hostId: Schema.Types.ObjectId;
  name: string;
  avatar: string;
  announcement: string;
  memberIds: Schema.Types.ObjectId[];
  /** The `Chat` document that backs this group's messages. */
  chatId?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const fanGroupSchema = new Schema<IFanGroupDocument>(
  {
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    avatar: { type: String, default: '' },
    announcement: { type: String, default: '' },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat' },
  },
  { timestamps: true }
);

fanGroupSchema.index({ memberIds: 1 });

export const FanGroup = model<IFanGroupDocument>('FanGroup', fanGroupSchema);
