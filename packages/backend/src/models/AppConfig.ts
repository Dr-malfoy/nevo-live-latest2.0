import { Schema, model, Document } from 'mongoose';

/**
 * Small key/value app config (BACKEND-GUIDE.md §4.12).
 *
 * Static links (Help Center, Follow Us, Builder Center) and tunable knobs live
 * here so they can change without an app release.
 */
export interface IAppConfigDocument extends Document {
  key: string;
  value: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const appConfigSchema = new Schema<IAppConfigDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const AppConfig = model<IAppConfigDocument>('AppConfig', appConfigSchema);
