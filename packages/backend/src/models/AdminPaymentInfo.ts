import { Schema, model, Document } from 'mongoose';

interface IPaymentMethodInfo {
  qrCode: string;
  walletAddress: string;
  number?: string;
}

export interface IAdminPaymentInfoDocument extends Document {
  bybit: IPaymentMethodInfo;
  binance: IPaymentMethodInfo;
  bkash: IPaymentMethodInfo;
  nagad: IPaymentMethodInfo;
  rocket: IPaymentMethodInfo;
  createdAt: Date;
  updatedAt: Date;
}

const adminPaymentInfoSchema = new Schema<IAdminPaymentInfoDocument>(
  {
    bybit: {
      qrCode: { type: String, default: '' },
      walletAddress: { type: String, default: '' },
      number: { type: String, default: '' },
    },
    binance: {
      qrCode: { type: String, default: '' },
      walletAddress: { type: String, default: '' },
      number: { type: String, default: '' },
    },
    bkash: {
      qrCode: { type: String, default: '' },
      walletAddress: { type: String, default: '' },
      number: { type: String, default: '' },
    },
    nagad: {
      qrCode: { type: String, default: '' },
      walletAddress: { type: String, default: '' },
      number: { type: String, default: '' },
    },
    rocket: {
      qrCode: { type: String, default: '' },
      walletAddress: { type: String, default: '' },
      number: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export const AdminPaymentInfo = model<IAdminPaymentInfoDocument>('AdminPaymentInfo', adminPaymentInfoSchema);
