import { LiveStream, Transaction, User, Moment } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getBangladeshMonthBounds } from '../utils/date';

export const streamerService = {
  /**
   * §4.8 — Streamer dashboard: earnings, viewer count, stream count for the current month.
   */
  async getStreamerStats(userId: string) {
    const { start, end } = getBangladeshMonthBounds();

    const [streamCount, totalViewers, monthEarnings] = await Promise.all([
      LiveStream.countDocuments({ hostId: userId, createdAt: { $gte: start, $lte: end } }),
      LiveStream.aggregate([
        { $match: { hostId: userId as any, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$totalViewers' } } },
      ]),
      (Transaction as any).aggregate([
        {
          $match: {
            userId: userId as any,
            type: 'credit',
            sourceType: 'live',
            createdAt: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return {
      streamCount,
      totalViewers: totalViewers[0]?.total || 0,
      monthEarningsDiamonds: monthEarnings[0]?.total || 0,
    };
  },

  /**
   * §4.8 — Creator stats: moments count, total likes, total comments.
   */
  async getCreatorStats(userId: string) {
    const [momentCount, likeAggregate, commentAggregate] = await Promise.all([
      Moment.countDocuments({ userId }),
      Moment.aggregate([
        { $match: { userId: userId as any } },
        { $group: { _id: null, totalLikes: { $sum: { $size: { $ifNull: ['$likes', []] } } } } },
      ]),
      Moment.aggregate([
        { $match: { userId: userId as any } },
        { $group: { _id: null, totalComments: { $sum: { $ifNull: ['$commentCount', 0] } } } },
      ]),
    ]);

    return {
      momentCount,
      totalLikes: likeAggregate[0]?.totalLikes || 0,
      totalComments: commentAggregate[0]?.totalComments || 0,
    };
  },

  /**
   * §4.8 — Video feed (moments with video type).
   */
  async getVideoFeed(page: number, limit: number, userId?: string) {
    const filter: any = { mediaType: { $in: ['video', 'reel'] }, visibility: 'public' };
    if (userId) filter.userId = userId;
    const total = await Moment.countDocuments(filter);
    const videos = await Moment.find(filter)
      .populate('userId', 'uid nickname avatar level verification')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { data: videos, total };
  },

  /**
   * §4.8 — Get live stream history for a streamer.
   */
  async getStreamHistory(hostId: string, page: number, limit: number) {
    const total = await LiveStream.countDocuments({ hostId, status: 'ended' });
    const streams = await LiveStream.find({ hostId, status: 'ended' })
      .sort({ startedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { data: streams, total };
  },
};
