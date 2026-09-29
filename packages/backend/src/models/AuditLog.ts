import { Schema, model, Document } from 'mongoose';

export interface IAuditLogDocument extends Document {
  actorId: Schema.Types.ObjectId;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  ip?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, index: true },
    targetId: { type: String },
    details: { type: Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: true }
);

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

export const AuditLog = model<IAuditLogDocument>('AuditLog', auditLogSchema);
