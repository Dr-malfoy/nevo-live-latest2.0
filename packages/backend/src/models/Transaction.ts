import { Schema, model, Document } from 'mongoose';

export type TransactionType =
  | 'recharge'
  | 'gift_send'
  | 'gift_receive'
  | 'gift_cut'
  | 'withdraw'
  | 'coin_sale'
  | 'agent_recharge'
  | 'commission'
  | 'transfer'
  | 'transfer_in'
  | 'income_exchange'
  | 'game_bet'
  | 'game_win'
  | 'daily_reward'
  | 'task_reward'
  | 'signin_reward'
  | 'activity_reward'
  | 'spin_reward'
  | 'store_purchase'
  | 'call_payment'
  | 'call_earning'
  | 'fanclub_join'
  | 'highlight'
  | 'ranking_prize';

export interface ITransactionDocument extends Document {
  userId: Schema.Types.ObjectId;
  type: TransactionType;
  amount: number;
  currency: 'diamond' | 'coin';
  /**
   * §4.1 — splits `gift_receive` into Livestream vs Party income. Set by
   * `gift.service.ts` when crediting; absent (undefined) on legacy rows.
   */
  sourceType?: 'live' | 'party' | 'call' | 'other';
  targetId?: Schema.Types.ObjectId;
  targetModel?: 'Gift' | 'User';
  giftId?: Schema.Types.ObjectId;
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  createdAt: Date;
}

const TRANSACTION_TYPES: TransactionType[] = [
  'recharge', 'gift_send', 'gift_receive', 'gift_cut', 'withdraw', 'coin_sale',
  'agent_recharge', 'commission', 'transfer', 'transfer_in', 'income_exchange',
  'game_bet', 'game_win', 'daily_reward', 'task_reward', 'signin_reward',
  'activity_reward', 'spin_reward', 'store_purchase', 'call_payment',
  'call_earning', 'fanclub_join', 'highlight', 'ranking_prize',
];

const transactionSchema = new Schema<ITransactionDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: TRANSACTION_TYPES,
    required: true,
    index: true,
  },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['diamond', 'coin'], required: true },
  sourceType: { type: String, enum: ['live', 'party', 'call', 'other'] },
  targetId: { type: Schema.Types.ObjectId, refPath: 'targetModel' },
  targetModel: { type: String, enum: ['Gift', 'User'] },
  giftId: { type: Schema.Types.ObjectId, ref: 'Gift' },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  description: { type: String },
  createdAt: { type: Date, default: Date.now, index: true },
});

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });

export const Transaction = model<ITransactionDocument>('Transaction', transactionSchema);
