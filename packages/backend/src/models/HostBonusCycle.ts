import { Schema, model, Document, Types } from 'mongoose';

export interface IHostBonusCycleDailyStat {
  date: string; // YYYY-MM-DD
  dayIndex: number; // 1 to 7
  rawSeconds: number; // raw total live seconds streamed on that day
  rawHours: number; // raw hours (rawSeconds / 3600)
  eligibleSeconds: number; // seconds counted towards weekly total (0 if < min, capped at max)
  eligibleHours: number; // hours counted towards weekly total
  minRequiredHours: number; // 2 for alpha, 3 for aurora
  maxCountedHours: number; // 4 for alpha, 5 for aurora
  passedDailyRule: boolean; // rawHours >= minRequiredHours
}

export interface IHostBonusCycleDocument extends Document {
  userId: Types.ObjectId;
  hostType: 'alpha' | 'aurora';
  cycleNumber: number;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'awarded' | 'missed';

  // Requirements configuration snapshot
  targetLiveHours: number; // 15 for alpha, 20 for aurora
  minDailyHours: number; // 2 for alpha, 3 for aurora
  maxDailyHours: number; // 4 for alpha, 5 for aurora
  targetGiftCoins: number; // 400,000 for alpha, 500,000 for aurora
  bonusDiamonds: number; // 200,000 for alpha, 300,000 for aurora

  // Current Progress stats
  totalEligibleLiveHours: number; // sum of daily eligible hours
  totalRawLiveHours: number; // total raw hours streamed
  validDaysCount: number; // number of days where rawHours >= minDailyHours
  currentGiftCoins: number; // total gift coins received in cycle

  // Criteria validation checks
  meetsLiveHours: boolean;
  meetsGiftCoins: boolean;
  isEligibleForBonus: boolean;

  dailyStats: IHostBonusCycleDailyStat[];

  // Bonus Awarding Info
  bonusAwarded: boolean;
  awardedAt?: Date;
  transactionId?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const hostBonusCycleDailyStatSchema = new Schema<IHostBonusCycleDailyStat>(
  {
    date: { type: String, required: true },
    dayIndex: { type: Number, required: true },
    rawSeconds: { type: Number, default: 0 },
    rawHours: { type: Number, default: 0 },
    eligibleSeconds: { type: Number, default: 0 },
    eligibleHours: { type: Number, default: 0 },
    minRequiredHours: { type: Number, required: true },
    maxCountedHours: { type: Number, required: true },
    passedDailyRule: { type: Boolean, default: false },
  },
  { _id: false }
);

const hostBonusCycleSchema = new Schema<IHostBonusCycleDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hostType: { type: String, enum: ['alpha', 'aurora'], required: true },
    cycleNumber: { type: Number, required: true, default: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'awarded', 'missed'],
      default: 'active',
      index: true,
    },

    targetLiveHours: { type: Number, required: true },
    minDailyHours: { type: Number, required: true },
    maxDailyHours: { type: Number, required: true },
    targetGiftCoins: { type: Number, required: true },
    bonusDiamonds: { type: Number, required: true },

    totalEligibleLiveHours: { type: Number, default: 0 },
    totalRawLiveHours: { type: Number, default: 0 },
    validDaysCount: { type: Number, default: 0 },
    currentGiftCoins: { type: Number, default: 0 },

    meetsLiveHours: { type: Boolean, default: false },
    meetsGiftCoins: { type: Boolean, default: false },
    isEligibleForBonus: { type: Boolean, default: false },

    dailyStats: [hostBonusCycleDailyStatSchema],

    bonusAwarded: { type: Boolean, default: false },
    awardedAt: { type: Date },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  },
  { timestamps: true }
);

hostBonusCycleSchema.index({ userId: 1, cycleNumber: 1 }, { unique: true });
hostBonusCycleSchema.index({ userId: 1, status: 1 });
hostBonusCycleSchema.index({ endDate: 1, status: 1 });

export const HostBonusCycle = model<IHostBonusCycleDocument>(
  'HostBonusCycle',
  hostBonusCycleSchema
);
