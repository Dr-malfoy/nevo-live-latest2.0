import mongoose from 'mongoose';
import { Transaction, getFormattedTxId } from '../models';
import { getSkip } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';

export const transactionService = {
  async getUserTransactions(userId: string, page: number = 1, limit: number = 20) {
    const total = await Transaction.countDocuments({ userId });
    const transactions = await Transaction.find({ userId })
      .populate('giftId', 'name icon')
      .populate('targetId', 'uid nickname avatar isAgent role')
      .populate('userId', 'uid nickname avatar isAgent role')
      .sort({ createdAt: -1 })
      .skip(getSkip(page, limit))
      .limit(limit);

    const data = transactions.map((t) => {
      const plain = t.toObject() as any;
      plain.txId = getFormattedTxId(plain);
      return plain;
    });

    return { data, total };
  },

  async getTransactionById(idOrTxId: string, userId: string) {
    const cleanId = String(idOrTxId).trim();
    const idFilter = [
      { txId: cleanId },
      ...(mongoose.isValidObjectId(cleanId) ? [{ _id: cleanId }] : []),
    ];

    let tx = await Transaction.findOne({
      $and: [
        { $or: idFilter },
        { $or: [{ userId }, { targetId: userId }] },
      ],
    })
      .populate('giftId', 'name icon')
      .populate('targetId', 'uid nickname avatar isAgent role')
      .populate('userId', 'uid nickname avatar isAgent role');

    if (!tx) {
      // Also check if admin or unconstrained lookup if not found
      tx = await Transaction.findOne({
        $or: [
          { txId: cleanId },
          ...(mongoose.isValidObjectId(cleanId) ? [{ _id: cleanId }] : []),
        ],
      })
        .populate('giftId', 'name icon')
        .populate('targetId', 'uid nickname avatar isAgent role')
        .populate('userId', 'uid nickname avatar isAgent role');
    }

    if (!tx) {
      throw new AppError('Transaction not found', 404);
    }

    const plain = tx.toObject() as any;
    plain.txId = getFormattedTxId(plain);
    return plain;
  },
};
