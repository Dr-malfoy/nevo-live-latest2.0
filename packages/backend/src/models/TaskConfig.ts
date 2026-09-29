import { Schema, model, Document } from 'mongoose';

/**
 * Task catalogue (BACKEND-GUIDE.md §4.3).
 *
 * DB-backed so rewards and targets can be retuned without an app release —
 * the guide explicitly asks for this for the #30 referral task table too.
 */
export type TaskGroup = 'daily' | 'interactive' | 'fan_club' | 'pk_mission' | 'games' | 'activity';

export interface ITaskReward {
  currency: 'coins' | 'diamonds' | 'pk_flag' | 'tickets';
  amount: number;
  /** #31/#32 — PK gift rewards expire (72h) after being claimed. */
  expiresInHours?: number;
}

export interface ITaskConfigDocument extends Document {
  key: string;
  group: TaskGroup;
  sectionKey: string;
  sectionTitle: string;
  sectionNote?: string;
  label: string;
  /** `event` progress is incremented by the feature that owns it. */
  target: number;
  /** Which counter the feature writes (e.g. 'likes', 'gift_sent', 'live_minutes'). */
  metric: string;
  note?: string;
  reward: ITaskReward;
  goTo?: string;
  /** #30 — daily-cap (e.g. a new host's live time counts at most 2h/day). */
  dailyCap?: number | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const taskConfigSchema = new Schema<ITaskConfigDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    group: {
      type: String,
      enum: ['daily', 'interactive', 'fan_club', 'pk_mission', 'games', 'activity'],
      required: true,
      index: true,
    },
    sectionKey: { type: String, required: true },
    sectionTitle: { type: String, required: true },
    sectionNote: { type: String },
    label: { type: String, required: true },
    target: { type: Number, required: true, min: 1 },
    metric: { type: String, required: true },
    note: { type: String },
    reward: {
      currency: { type: String, enum: ['coins', 'diamonds', 'pk_flag', 'tickets'], required: true },
      amount: { type: Number, required: true, min: 0 },
      expiresInHours: { type: Number },
    },
    goTo: { type: String },
    dailyCap: { type: Number, default: null },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

taskConfigSchema.index({ group: 1, isActive: 1, order: 1 });

export const TaskConfig = model<ITaskConfigDocument>('TaskConfig', taskConfigSchema);
