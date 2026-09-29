import { Schema, model, Document } from 'mongoose';

export interface IReportDocument extends Document {
  reporterId: Schema.Types.ObjectId;
  targetType: 'user' | 'stream' | 'moment' | 'transaction' | 'chat' | 'message';
  targetId: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  adminNote?: string;
  reviewedBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReportDocument>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: ['user', 'stream', 'moment', 'transaction', 'chat', 'message'], required: true },
    targetId: { type: String, required: true },
    reason: { type: String, required: true },
    details: { type: String },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed', 'actioned'],
      default: 'pending',
      index: true,
    },
    adminNote: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

reportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

export const Report = model<IReportDocument>('Report', reportSchema);
