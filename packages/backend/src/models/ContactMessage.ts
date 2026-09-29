import { Schema, model, Document } from 'mongoose';

export interface IContactMessageDocument extends Document {
  userId: Schema.Types.ObjectId;
  subject: string;
  message: string;
  status: 'pending' | 'resolved';
  adminReply?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactMessageSchema = new Schema<IContactMessageDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ['pending', 'resolved'], default: 'pending', index: true },
    adminReply: { type: String },
  },
  { timestamps: true }
);

contactMessageSchema.index({ status: 1, createdAt: -1 });

export const ContactMessage = model<IContactMessageDocument>('ContactMessage', contactMessageSchema);
