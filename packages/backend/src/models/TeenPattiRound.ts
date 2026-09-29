import { Schema, model, Document } from 'mongoose';

export interface ITeenPattiRoundDocument extends Document {
  roundNumber: number;
  tableId: string;
  currency: 'diamond' | 'coin';
  pot: number;
  stake: number;
  houseCut: number;
  winnerId?: Schema.Types.ObjectId;
  status: 'betting' | 'showdown' | 'ended';
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const teenPattiRoundSchema = new Schema<ITeenPattiRoundDocument>(
  {
    roundNumber: { type: Number, required: true, unique: true },
    tableId: { type: String, required: true, index: true },
    currency: { type: String, enum: ['diamond', 'coin'], required: true },
    pot: { type: Number, required: true, default: 0 },
    stake: { type: Number, required: true, default: 0 },
    houseCut: { type: Number, required: true, default: 0 },
    winnerId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['betting', 'showdown', 'ended'], default: 'betting' },
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

teenPattiRoundSchema.index({ roundNumber: -1 });

export const TeenPattiRound = model<ITeenPattiRoundDocument>('TeenPattiRound', teenPattiRoundSchema);
