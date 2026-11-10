import { Schema, model, Document } from 'mongoose';

export interface IAgencyInvitationDocument extends Document {
  agencyId: Schema.Types.ObjectId;
  agentId: Schema.Types.ObjectId;
  inviteeId: Schema.Types.ObjectId;
  hostCode?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const agencyInvitationSchema = new Schema<IAgencyInvitationDocument>(
  {
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
    inviteeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    hostCode: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'canceled'],
      default: 'pending',
      index: true,
    },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

agencyInvitationSchema.index({ agencyId: 1, inviteeId: 1, status: 1 });
agencyInvitationSchema.index({ inviteeId: 1, status: 1, createdAt: -1 });
agencyInvitationSchema.index({ agentId: 1, createdAt: -1 });

export const AgencyInvitation = model<IAgencyInvitationDocument>('AgencyInvitation', agencyInvitationSchema);
