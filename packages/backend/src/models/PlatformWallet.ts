import { Schema, model, Document, Model } from 'mongoose';

export interface IPlatformWalletDocument extends Document {
  adminId: Schema.Types.ObjectId;
  diamonds: number;
  coins: number;
  createdAt: Date;
  updatedAt: Date;
}

interface IPlatformWalletModel extends Model<IPlatformWalletDocument> {
  getWallet(): Promise<IPlatformWalletDocument>;
}

const platformWalletSchema = new Schema<IPlatformWalletDocument, IPlatformWalletModel>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'User' },
    diamonds: { type: Number, default: 0, min: 0 },
    coins: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

platformWalletSchema.statics.getWallet = async function (): Promise<IPlatformWalletDocument> {
  let wallet = await this.findOne();
  if (!wallet) wallet = await this.create({});
  return wallet;
};

export const PlatformWallet = model<IPlatformWalletDocument, IPlatformWalletModel>('PlatformWallet', platformWalletSchema);
