import { Schema, model, Document } from 'mongoose';

/**
 * An agent's host group (BACKEND-GUIDE.md §4.7 — #5, #34, #54).
 * Manage → Host Groups.
 */
export interface IHostGroupDocument extends Document {
  agentId: Schema.Types.ObjectId;
  name: string;
  memberIds: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const hostGroupSchema = new Schema<IHostGroupDocument>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

hostGroupSchema.index({ agentId: 1, name: 1 }, { unique: true });

export const HostGroup = model<IHostGroupDocument>('HostGroup', hostGroupSchema);
