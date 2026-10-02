import { Schema, model, Document } from 'mongoose';

export interface IAgencyLeaveRequestDocument extends Document {
  userId: Schema.Types.ObjectId;
  agencyId: Schema.Types.ObjectId;
  agentId: Schema.Types.ObjectId;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const agencyLeaveRequestSchema = new Schema<IAgencyLeaveRequestDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      required: true,
      index: true,
    },
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

agencyLeaveRequestSchema.index({ userId: 1, status: 1 });
agencyLeaveRequestSchema.index({ agentId: 1, status: 1 });
agencyLeaveRequestSchema.index({ agencyId: 1, status: 1 });

export const AgencyLeaveRequest = model<IAgencyLeaveRequestDocument>(
  'AgencyLeaveRequest',
  agencyLeaveRequestSchema
);
