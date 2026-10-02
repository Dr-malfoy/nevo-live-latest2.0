import { Schema, model, Document } from 'mongoose';

export interface ITicketReply {
  _id?: any;
  sender: 'user' | 'admin' | 'support';
  senderName?: string;
  message: string;
  createdAt?: Date;
}

export interface IContactMessageDocument extends Document {
  ticketId: string;
  userId: Schema.Types.ObjectId;
  category: string;
  subject: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  adminReply?: string;
  replies: ITicketReply[];
  createdAt: Date;
  updatedAt: Date;
}

const contactMessageSchema = new Schema<IContactMessageDocument>(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, default: 'General', trim: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved', 'closed'],
      default: 'pending',
      index: true,
    },
    adminReply: { type: String },
    replies: [
      {
        sender: { type: String, enum: ['user', 'admin', 'support'], default: 'user' },
        senderName: { type: String, trim: true },
        message: { type: String, required: true, trim: true, maxlength: 3000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

contactMessageSchema.index({ userId: 1, createdAt: -1 });
contactMessageSchema.index({ status: 1, createdAt: -1 });

export const ContactMessage = model<IContactMessageDocument>('ContactMessage', contactMessageSchema);

