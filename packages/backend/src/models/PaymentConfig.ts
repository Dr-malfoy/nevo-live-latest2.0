import { Schema, model, Document, Model } from 'mongoose';

export interface IPaymentConfigDocument extends Document {
  bybitEnabled: boolean;
  binanceEnabled: boolean;
  bkashEnabled: boolean;
  nagadEnabled: boolean;
  rocketEnabled: boolean;
  diamondRate: number;
  coinRate: number;
  withdrawalRate: number;
  rechargeRate: number;
  bonusRate: number;
  serviceCharge: number;
  agentProfitPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

interface IPaymentConfigModel extends Model<IPaymentConfigDocument> {
  getConfig(): Promise<IPaymentConfigDocument>;
}

const paymentConfigSchema = new Schema<IPaymentConfigDocument, IPaymentConfigModel>(
  {
    bybitEnabled: { type: Boolean, default: true },
    binanceEnabled: { type: Boolean, default: true },
    bkashEnabled: { type: Boolean, default: true },
    nagadEnabled: { type: Boolean, default: true },
    rocketEnabled: { type: Boolean, default: true },
    diamondRate: { type: Number, default: 1, min: 0.01 },
    coinRate: { type: Number, default: 1, min: 0.01 },
    withdrawalRate: { type: Number, default: 1, min: 0.01 },
    rechargeRate: { type: Number, default: 1, min: 0.01 },
    bonusRate: { type: Number, default: 0, min: 0, max: 100 },
    serviceCharge: { type: Number, default: 0, min: 0 },
    agentProfitPercent: { type: Number, default: 5, min: 0, max: 100 },
  },
  { timestamps: true }
);

paymentConfigSchema.statics.getConfig = async function (): Promise<IPaymentConfigDocument> {
  let config = await this.findOne();
  if (!config) config = await this.create({});
  return config;
};

export const PaymentConfig = model<IPaymentConfigDocument, IPaymentConfigModel>('PaymentConfig', paymentConfigSchema);
