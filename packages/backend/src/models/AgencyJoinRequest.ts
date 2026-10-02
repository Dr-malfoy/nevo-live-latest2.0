import { Schema, model, Document } from 'mongoose';

export interface IAgencyJoinRequestDocument extends Document {
  agencyId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  agentId: Schema.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const agencyJoinRequestSchema = new Schema<IAgencyJoinRequestDocument>(
  {
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    message: { type: String, default: '', trim: true, maxlength: 300 },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

agencyJoinRequestSchema.index({ agencyId: 1, userId: 1, status: 1 });
agencyJoinRequestSchema.index({ agentId: 1, status: 1, createdAt: -1 });

export const AgencyJoinRequest = model<IAgencyJoinRequestDocument>('AgencyJoinRequest', agencyJoinRequestSchema);
