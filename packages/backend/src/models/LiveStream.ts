import { Schema, model, Document } from 'mongoose';

export interface ILiveStreamDocument extends Document {
  hostId: Schema.Types.ObjectId;
  title: string;
  cover: string;
  type: 'video' | 'voice' | 'game';
  category: 'talk' | 'game' | 'music' | 'other';
  /**
   * Host's country, denormalised at create time (ISO alpha-2).
   * Denormalised so the country filter is an indexed match on the stream
   * collection instead of a $lookup into users on every feed request.
   */
  country: string;
  status: 'live' | 'ended';
  sessionId: string;
  agoraChannel: string;
  agoraToken?: string;
  viewerCount: number;
  totalViewers: number;
  /** Distinct viewers currently in the room — makes join/leave idempotent. */
  viewers: Schema.Types.ObjectId[];
  startedAt: Date;
  endedAt?: Date;
  heartbeatAt: Date;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const liveStreamSchema = new Schema<ILiveStreamDocument>(
  {
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    cover: { type: String, default: '' },
    type: {
      type: String,
      enum: ['video', 'voice', 'game'],
      required: true,
    },
    category: {
      type: String,
      enum: ['talk', 'game', 'music', 'other'],
      default: 'talk',
    },
    country: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
      maxlength: 2,
      index: true,
    },
    status: {
      type: String,
      enum: ['live', 'ended'],
      default: 'live',
      index: true,
    },
    sessionId: { type: String, unique: true, index: true },
    agoraChannel: { type: String, required: true },
    agoraToken: { type: String },
    viewerCount: { type: Number, default: 0, min: 0 },
    totalViewers: { type: Number, default: 0, min: 0 },
    viewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    heartbeatAt: { type: Date, default: Date.now },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

liveStreamSchema.index({ status: 1, startedAt: -1 });
liveStreamSchema.index({ status: 1, type: 1, startedAt: -1 });
liveStreamSchema.index({ hostId: 1, status: 1 });
// Country filter (requirement #1) — served straight off this index.
liveStreamSchema.index({ status: 1, country: 1, startedAt: -1 });

export const LiveStream = model<ILiveStreamDocument>('LiveStream', liveStreamSchema);
