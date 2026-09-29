import { Schema, model, Document } from 'mongoose';

export interface IAgencyDocument extends Document {
  agentId: Schema.Types.ObjectId;
  name: string;
  code: string;
  commission: number;
  hosts: Schema.Types.ObjectId[];
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const agencySchema = new Schema<IAgencyDocument>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    commission: { type: Number, required: true, min: 0, max: 100, default: 10 },
    hosts: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isBanned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Agency = model<IAgencyDocument>('Agency', agencySchema);
