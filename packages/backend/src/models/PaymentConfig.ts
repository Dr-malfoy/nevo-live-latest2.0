import { Schema, model, Document, Model } from 'mongoose';

export interface IPaymentConfigDocument extends Document {
  bybitEnabled: boolean;
  binanceEnabled: boolean;
  bkashEnabled: boolean;
  nagadEnabled: boolean;
  rocketEnabled: boolean;
  diamondRate: number;
  dollarRate: number;
  usdBdtRate: number;
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
    diamondRate: { type: Number, default: 128, min: 0.01 },
    dollarRate: { type: Number, default: 15600, min: 1 },
    usdBdtRate: { type: Number, default: 122, min: 1 },
    coinRate: { type: Number, default: 130, min: 0.01 },
    withdrawalRate: { type: Number, default: 130, min: 0.01 },
    rechargeRate: { type: Number, default: 128, min: 0.01 },
    bonusRate: { type: Number, default: 0, min: 0, max: 100 },
    serviceCharge: { type: Number, default: 0, min: 0 },
    agentProfitPercent: { type: Number, default: 5, min: 0, max: 100 },
  },
  { timestamps: true }
);

paymentConfigSchema.statics.getConfig = async function (): Promise<IPaymentConfigDocument> {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({ diamondRate: 128, dollarRate: 15600, usdBdtRate: 122, rechargeRate: 128, coinRate: 130, withdrawalRate: 130 });
  } else {
    let modified = false;
    if (!config.diamondRate || config.diamondRate === 1 || config.diamondRate === 130) {
      config.diamondRate = 128;
      config.rechargeRate = 128;
      modified = true;
    }
    if (!config.dollarRate || config.dollarRate === 13000) {
      config.dollarRate = 15600;
      modified = true;
    }
    if (!config.usdBdtRate || config.usdBdtRate === 120) {
      config.usdBdtRate = 122;
      modified = true;
    }
    if (!config.withdrawalRate || config.withdrawalRate === 1) {
      config.withdrawalRate = 130;
      modified = true;
    }
    if (!config.coinRate || config.coinRate === 1) {
      config.coinRate = 130;
      modified = true;
    }
    if (modified) await config.save();
  }
  return config;
};

export const PaymentConfig = model<IPaymentConfigDocument, IPaymentConfigModel>('PaymentConfig', paymentConfigSchema);
