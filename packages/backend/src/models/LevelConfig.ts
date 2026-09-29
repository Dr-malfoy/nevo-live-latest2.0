import { Schema, model, Document } from 'mongoose';

export interface ILevelConfigDocument extends Document {
  level: number;
  expRequired: number;
  title: string;
  rewards?: {
    diamonds?: number;
    nobleDays?: number;
  };
}

const levelConfigSchema = new Schema<ILevelConfigDocument>({
  level: { type: Number, required: true, unique: true },
  expRequired: { type: Number, required: true },
  title: { type: String, required: true },
  rewards: {
    diamonds: { type: Number },
    nobleDays: { type: Number },
  },
});

export const LevelConfig = model<ILevelConfigDocument>('LevelConfig', levelConfigSchema);
