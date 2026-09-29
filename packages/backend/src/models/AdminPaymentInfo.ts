import { Schema, model, Document } from 'mongoose';

interface IPaymentMethodInfo {
  qrCode: string;
  walletAddress: string;
}

export interface IAdminPaymentInfoDocument extends Document {
  bybit: IPaymentMethodInfo;
  binance: IPaymentMethodInfo;
  createdAt: Date;
  updatedAt: Date;
}

const adminPaymentInfoSchema = new Schema<IAdminPaymentInfoDocument>(
  {
    bybit: {
      qrCode: { type: String, default: '' },
      walletAddress: { type: String, default: '' },
    },
    binance: {
      qrCode: { type: String, default: '' },
      walletAddress: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export const AdminPaymentInfo = model<IAdminPaymentInfoDocument>('AdminPaymentInfo', adminPaymentInfoSchema);
