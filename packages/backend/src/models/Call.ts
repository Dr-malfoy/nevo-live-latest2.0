import { Schema, model, Document } from 'mongoose';

export interface ICallDocument extends Document {
  participants: Schema.Types.ObjectId[];
  recipientIds?: Schema.Types.ObjectId[];
  initiatorId: Schema.Types.ObjectId;
  channel: string;
  type: 'audio' | 'video';
  /** Where the call was initiated from. */
  callSource: 'profile' | 'messenger' | 'match';
  status: 'ringing' | 'active' | 'ended' | 'missed' | 'rejected';
  maxParticipants: number;
  /** #72 — 1-to-1 pricing, locked in when the call is accepted. */
  hostId?: Schema.Types.ObjectId;
  /** Audience (caller) UID — the one paying. */
  audienceId?: Schema.Types.ObjectId;
  coinsPerMinute: number;
  minutesBilled: number;
  totalCoins: number;
  /** 60% of totalCoins credited to host. */
  hostEarning: number;
  /** 40% of totalCoins credited to company. */
  companyCommission: number;
  /**
   * Set to true once the final settlement has been written so that retries
   * or crashes cannot double-credit the host or double-deduct the audience.
   */
  finalized: boolean;
  recordedInChat?: boolean;
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
    recipientIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    initiatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    channel: { type: String, required: true },
    type: { type: String, enum: ['audio', 'video'], default: 'audio' },
    callSource: { type: String, enum: ['profile', 'messenger', 'match'], default: 'messenger', index: true },

    maxParticipants: { type: Number, default: 10 },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    audienceId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    coinsPerMinute: { type: Number, default: 0 },
    minutesBilled: { type: Number, default: 0 },
    totalCoins: { type: Number, default: 0 },
    hostEarning: { type: Number, default: 0 },
    companyCommission: { type: Number, default: 0 },
    finalized: { type: Boolean, default: false, index: true },
    recordedInChat: { type: Boolean, default: false, index: true },
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
callSchema.index({ audienceId: 1, status: 1 });

export const Call = model<ICallDocument>('Call', callSchema);

