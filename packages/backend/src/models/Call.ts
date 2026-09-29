import { Schema, model, Document } from 'mongoose';

export interface ICallDocument extends Document {
  participants: Schema.Types.ObjectId[];
  initiatorId: Schema.Types.ObjectId;
  channel: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'active' | 'ended' | 'missed' | 'rejected';
  maxParticipants: number;
  /** #72 — 1-to-1 pricing, locked in when the call is accepted. */
  hostId?: Schema.Types.ObjectId;
  coinsPerMinute: number;
  minutesBilled: number;
  totalCoins: number;
  endReason?: 'HANGUP' | 'INSUFFICIENT_COINS' | 'TIMEOUT' | 'MISSED' | 'REJECTED' | 'ERROR';
  endedById?: Schema.Types.ObjectId;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const callSchema = new Schema<ICallDocument>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    initiatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    channel: { type: String, required: true },
    type: { type: String, enum: ['audio', 'video'], default: 'audio' },
    maxParticipants: { type: Number, default: 10 },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    coinsPerMinute: { type: Number, default: 0 },
    minutesBilled: { type: Number, default: 0 },
    totalCoins: { type: Number, default: 0 },
    endReason: {
      type: String,
      enum: ['HANGUP', 'INSUFFICIENT_COINS', 'TIMEOUT', 'MISSED', 'REJECTED', 'ERROR'],
    },
    endedById: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['ringing', 'active', 'ended', 'missed', 'rejected'],
      default: 'ringing',
      index: true,
    },
    startedAt: Date,
    endedAt: Date,
  },
  { timestamps: true }
);

callSchema.index({ participants: 1, status: 1, createdAt: -1 });

export const Call = model<ICallDocument>('Call', callSchema);
