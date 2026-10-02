import { Schema, model, Document } from 'mongoose';

export interface IChatMessageDocument extends Document {
  chatId: Schema.Types.ObjectId;
  senderId: Schema.Types.ObjectId;
  message: string;
  kind: 'text' | 'gift' | 'voice' | 'image' | 'call';
  callType?: 'audio' | 'video';
  callDuration?: number;
  callStatus?: 'completed' | 'missed' | 'rejected' | 'cancelled';
  giftId?: Schema.Types.ObjectId;
  giftName?: string;
  giftCount?: number;
  voiceUrl?: string;
  voiceDuration?: number;
  imageUrl?: string;
  read: boolean;
  readAt?: Date;
  delivered: boolean;
  deliveredAt?: Date;
  status: 'sent' | 'delivered' | 'seen';
  edited?: boolean;
  editedAt?: Date;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessageDocument>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, default: '', trim: true, maxlength: 2000 },
    kind: { type: String, enum: ['text', 'gift', 'voice', 'image', 'call'], default: 'text' },
    callType: { type: String, enum: ['audio', 'video'] },
    callDuration: { type: Number, default: 0 },
    callStatus: { type: String, enum: ['completed', 'missed', 'rejected', 'cancelled'] },
    giftId: { type: Schema.Types.ObjectId, ref: 'Gift' },
    giftName: { type: String },
    giftCount: { type: Number },
    voiceUrl: { type: String },
    voiceDuration: { type: Number },
    imageUrl: { type: String },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
    delivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

chatMessageSchema.index({ chatId: 1, createdAt: 1 });

export const ChatMessage = model<IChatMessageDocument>('ChatMessage', chatMessageSchema);
