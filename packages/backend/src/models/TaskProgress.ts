import { Schema, model, Document } from 'mongoose';

/**
 * Per-user task progress (BACKEND-GUIDE.md §4.3 — #30, #31, #32, #69).
 *
 * Progress is written by the features themselves (gift send, comment, like,
 * live minutes), never posted by the client. Credit only ever happens on claim.
 */
export interface ITaskProgressDocument extends Document {
  userId: Schema.Types.ObjectId;
  taskKey: string;
  /** 'YYYY-MM-DD' for daily tasks; a fixed key for one-off/repeatable tasks. */
  dateKey: string;
  progress: number;
  target: number;
  state: 'todo' | 'claimable' | 'claimed';
  claimedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const taskProgressSchema = new Schema<ITaskProgressDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    taskKey: { type: String, required: true },
    dateKey: { type: String, required: true },
    progress: { type: Number, default: 0, min: 0 },
    target: { type: Number, required: true, min: 1 },
    state: {
      type: String,
      enum: ['todo', 'claimable', 'claimed'],
      default: 'todo',
      index: true,
    },
    claimedAt: { type: Date },
  },
  { timestamps: true }
);

// One row per user / task / window — the guard against double credit.
taskProgressSchema.index({ userId: 1, taskKey: 1, dateKey: 1 }, { unique: true });

export const TaskProgress = model<ITaskProgressDocument>('TaskProgress', taskProgressSchema);
