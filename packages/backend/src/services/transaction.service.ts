import { Transaction } from '../models';
import { getSkip } from '../utils/pagination';

export const transactionService = {
  async getUserTransactions(userId: string, page: number = 1, limit: number = 20) {
    const total = await Transaction.countDocuments({ userId });
    const transactions = await Transaction.find({ userId })
      .populate('giftId', 'name icon')
      .sort({ createdAt: -1 })
      .skip(getSkip(page, limit))
      .limit(limit);

    return { data: transactions, total };
  },
};
