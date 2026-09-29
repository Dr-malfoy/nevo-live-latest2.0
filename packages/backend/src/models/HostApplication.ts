import { Schema, model, Document } from 'mongoose';

/**
 * Host application to an agency/agent (BACKEND-GUIDE.md §4.7 — #5, #34).
 */
export interface IHostApplicationDocument extends Document {
  applicantId: Schema.Types.ObjectId;
  agentId: Schema.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  note?: string;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const hostApplicationSchema = new Schema<IHostApplicationDocument>(
  {
    applicantId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
    note: { type: String, default: '' },
    decidedAt: { type: Date },
  },
  { timestamps: true }
);

hostApplicationSchema.index({ agentId: 1, status: 1, createdAt: -1 });

export const HostApplication = model<IHostApplicationDocument>('HostApplication', hostApplicationSchema);
