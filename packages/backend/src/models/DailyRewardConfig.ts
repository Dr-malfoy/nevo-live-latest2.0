import { Schema, model, Document, Model } from 'mongoose';

export interface IRewardTier {
  count: number;          // minimum daily count (host's earned coins) for this tier
  rewardCoins: number;    // coins credited when claiming this tier
  requiredHours: number;  // minimum live hours that day to claim this tier
}

export interface IDailyRewardConfigDocument extends Document {
  giftUserShare: number;   // percent of gift value the receiver earns (default 70)
  giftAdminShare: number;  // percent of gift value the platform takes (default 30)
  tiers: IRewardTier[];
  createdAt: Date;
  updatedAt: Date;
}

interface IDailyRewardConfigModel extends Model<IDailyRewardConfigDocument> {
  getConfig(): Promise<IDailyRewardConfigDocument>;
}

export const DEFAULT_REWARD_TIERS: IRewardTier[] = [
  { count: 150000, rewardCoins: 3000, requiredHours: 2 },
  { count: 300000, rewardCoins: 5000, requiredHours: 2 },
  { count: 900000, rewardCoins: 9000, requiredHours: 3 },
  { count: 1200000, rewardCoins: 12000, requiredHours: 3 },
  { count: 2000000, rewardCoins: 18000, requiredHours: 3 },
  { count: 4000000, rewardCoins: 28000, requiredHours: 3 },
  { count: 7000000, rewardCoins: 40000, requiredHours: 4 },
  { count: 10000000, rewardCoins: 50000, requiredHours: 4 },
  { count: 22000000, rewardCoins: 70000, requiredHours: 4 },
  { count: 50000000, rewardCoins: 120000, requiredHours: 5 },
];

const dailyRewardConfigSchema = new Schema<IDailyRewardConfigDocument, IDailyRewardConfigModel>(
  {
    giftUserShare: { type: Number, default: 70, min: 0, max: 100 },
    giftAdminShare: { type: Number, default: 30, min: 0, max: 100 },
    tiers: {
      type: [
        {
          count: { type: Number, required: true, min: 0 },
          rewardCoins: { type: Number, required: true, min: 0 },
          requiredHours: { type: Number, required: true, min: 0 },
        },
      ],
      default: DEFAULT_REWARD_TIERS,
    },
  },
  { timestamps: true }
);

dailyRewardConfigSchema.statics.getConfig = async function (): Promise<IDailyRewardConfigDocument> {
  let config = await this.findOne();
  if (!config) config = await this.create({});
  return config;
};

export const DailyRewardConfig = model<IDailyRewardConfigDocument, IDailyRewardConfigModel>(
  'DailyRewardConfig',
  dailyRewardConfigSchema
);
