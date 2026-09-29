import { Schema, model, Document, Model } from 'mongoose';

export interface IPaymentMethodDocument extends Document {
  key: string;
  name: string;
  color: string;
  iconUrl: string;
  enabled: boolean;
  type: 'fiat' | 'crypto';
  feeType: 'percent' | 'points' | 'tiered';
  fee: number;
  feeTiers: number[];
  arrival: string;
  fields: string[]; // e.g. ['phone'], ['walletAddress']
  createdAt: Date;
  updatedAt: Date;
}

const paymentMethodSchema = new Schema<IPaymentMethodDocument>(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    color: { type: String, default: 'text-ink-muted' },
    iconUrl: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    type: { type: String, enum: ['fiat', 'crypto'], default: 'fiat' },
    feeType: { type: String, enum: ['percent', 'points', 'tiered'], default: 'percent' },
    fee: { type: Number, default: 0 },
    feeTiers: { type: [Number], default: [] },
    arrival: { type: String, default: '24 hours' },
    fields: { type: [String], default: ['phone'] },
  },
  { timestamps: true }
);

export const PaymentMethod = model<IPaymentMethodDocument>('PaymentMethod', paymentMethodSchema);
