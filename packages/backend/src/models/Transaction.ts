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
  txId?: string;
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

export function getTxPrefix(type: TransactionType | string): 'TRX' | 'TICKET' | 'DEP' | 'WTH' {
  if (type === 'recharge' || type === 'agent_recharge') {
    return 'DEP';
  }
  if (type === 'withdraw' || type === 'coin_sale') {
    return 'WTH';
  }
  if (
    type === 'store_purchase' ||
    type === 'game_bet' ||
    type === 'game_win' ||
    type === 'daily_reward' ||
    type === 'task_reward' ||
    type === 'signin_reward' ||
    type === 'activity_reward' ||
    type === 'spin_reward' ||
    type === 'ranking_prize'
  ) {
    return 'TICKET';
  }
  return 'TRX';
}

export function generateTransactionId(type: TransactionType | string): string {
  const prefix = getTxPrefix(type);
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${randomDigits}`;
}

export function getFormattedTxId(tx: { txId?: string; type: TransactionType | string; _id?: any; createdAt?: any }): string {
  if (tx.txId) return tx.txId;
  const prefix = getTxPrefix(tx.type);
  if (tx._id) {
    const idStr = String(tx._id);
    const hexPart = idStr.slice(-6);
    const num = parseInt(hexPart, 16);
    const digits = String(num % 1000000).padStart(6, '0');
    return `${prefix}${digits}`;
  }
  return generateTransactionId(tx.type);
}

const transactionSchema = new Schema<ITransactionDocument>({
  txId: { type: String, index: true, sparse: true },
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

transactionSchema.pre('validate', function (next) {
  if (!this.txId) {
    this.txId = generateTransactionId(this.type);
  }
  next();
});

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ txId: 1 });

export const Transaction = model<ITransactionDocument>('Transaction', transactionSchema);
