import { Schema, model, Document } from 'mongoose';

export interface IVerificationAuditEntry {
  action: 'SUBMITTED' | 'OPENED' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED' | 'REVOKED';
  adminId?: Schema.Types.ObjectId;
  from: string;
  to: string;
  timestamp: Date;
}

export interface IVerificationRequestDocument extends Document {
  userId: Schema.Types.ObjectId;
  verificationType: 'face' | 'nid' | 'both';
  accountType?: 'host' | 'agency' | 'user';
  fullName?: string;
  olaId?: string;
  nidNumber?: string;
  dateOfBirth?: string;
  documentType?: 'nid' | 'olaid' | 'passport' | 'driving_license';
  documentFrontUrl?: string;
  documentBackUrl?: string;
  selfieUrl?: string;
  facePhotoUrl?: string;
  status: 'pending' | 'under_review' | 'verified' | 'rejected';
  rejectionReason?: string;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: Schema.Types.ObjectId;
  auditLog: IVerificationAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const verificationRequestSchema = new Schema<IVerificationRequestDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    verificationType: { type: String, enum: ['face', 'nid', 'both'], default: 'nid', index: true },
    accountType: { type: String, enum: ['host', 'agency', 'user'], default: 'host' },
    fullName: { type: String, trim: true },
    olaId: { type: String, trim: true },
    nidNumber: { type: String, trim: true },
    dateOfBirth: { type: String },
    documentType: { type: String, enum: ['nid', 'olaid', 'passport', 'driving_license'], default: 'nid' },
    documentFrontUrl: { type: String },
    documentBackUrl: { type: String },
    selfieUrl: { type: String },
    facePhotoUrl: { type: String },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String },
    submittedAt: { type: Date, required: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    auditLog: [
      {
        action: {
          type: String,
          enum: ['SUBMITTED', 'OPENED', 'APPROVED', 'REJECTED', 'RESUBMITTED', 'REVOKED'],
        },
        adminId: { type: Schema.Types.ObjectId, ref: 'User' },
        from: { type: String },
        to: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

verificationRequestSchema.index({ userId: 1, verificationType: 1 });
verificationRequestSchema.index({ status: 1, submittedAt: -1 });

export const VerificationRequest = model<IVerificationRequestDocument>(
  'VerificationRequest',
  verificationRequestSchema
);

// Gracefully drop legacy unique index on userId if it exists in MongoDB
setTimeout(() => {
  VerificationRequest.collection?.dropIndex('userId_1').catch(() => {});
}, 1000);
