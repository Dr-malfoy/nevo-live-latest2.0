import { Request, Response, NextFunction } from 'express';
import { WatchHistory, LiveStream, Moment } from '../models';
import { sendSuccess, sendError } from '../utils/response';
import mongoose from 'mongoose';

const getGroupLabel = (date: Date): string => {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0 && d.getDate() === now.getDate()) {
    return 'Today';
  }
  if (diffDays <= 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return 'This Week';
  }
  if (diffDays < 30) {
    return 'This Month';
  }
  return 'Earlier';
};

export const historyController = {
  /** GET /api/history/watch */
  async getWatchHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const type = (req.query.type as string) || 'live';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const historyRows = await WatchHistory.find({ userId: userObjectId, type })
        .sort({ watchedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('hostId', 'nickname avatar country verification')
        .lean();

      const items = await Promise.all(
        historyRows.map(async (row) => {
          let ended = false;
          let viewerCount: number | undefined;
          let cover = row.cover || '';
          let title = row.title || '';
          let hostName = (row.hostId as any)?.nickname || '';
          let hostId = (row.hostId as any)?._id?.toString() || (row.hostId as any)?.toString() || '';
          let country = (row.hostId as any)?.country || '';
          let videoUrl: string | undefined;
          let durationSec: number | undefined;

          if (type === 'live') {
            const stream = await LiveStream.findById(row.targetId).lean();
            if (stream) {
              ended = stream.status !== 'live';
              viewerCount = stream.viewerCount || 0;
              cover = stream.cover || cover || (row.hostId as any)?.avatar || '';
              title = stream.title || title;
              country = stream.country || country;
              hostId = stream.hostId?.toString() || hostId;
            } else {
              ended = true;
            }
          } else {
            // video / moment
            const moment = await Moment.findById(row.targetId)
              .populate('userId', 'nickname avatar country verification')
              .lean();
            if (moment) {
              ended = false;
              cover = moment.thumbnail || moment.media?.[0] || cover;
              title = moment.content || title || 'Video Reel';
              hostName = (moment.userId as any)?.nickname || hostName;
              hostId = (moment.userId as any)?._id?.toString() || hostId;
              country = (moment.userId as any)?.country || country;
              viewerCount = moment.viewCount || 0;
              videoUrl = moment.videoUrl || (moment.media && moment.media[0]);
              durationSec = moment.durationSec || 20;
            }
          }

          return {
            targetId: row.targetId.toString(),
            hostId,
            cover,
            title,
            hostName,
            country,
            ended,
            viewerCount,
            videoUrl,
            durationSec,
            watchedAt: row.watchedAt,
          };
        })
      );

      // Group items by label
      const groupMap = new Map<string, typeof items>();
      for (const item of items) {
        const label = getGroupLabel(item.watchedAt);
        if (!groupMap.has(label)) {
          groupMap.set(label, []);
        }
        groupMap.get(label)!.push(item);
      }

      const groups = Array.from(groupMap.entries()).map(([label, groupItems]) => ({
        label,
        items: groupItems,
      }));

      sendSuccess(res, { groups, items, total: historyRows.length });
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/history/watch */
  async recordWatch(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { type, targetId } = req.body;
      if (!type || !targetId) {
        sendError(res, 'Type and targetId are required', 400);
        return;
      }

      let title = '';
      let cover = '';
      let hostId: any = undefined;

      if (type === 'live') {
        const stream = await LiveStream.findById(targetId).lean();
        if (stream) {
          title = stream.title;
          cover = stream.cover;
          hostId = stream.hostId;
        }
      } else {
        const moment = await Moment.findById(targetId).lean();
        if (moment) {
          title = moment.content?.slice(0, 50) || 'Video Reel';
          cover = moment.thumbnail || moment.media?.[0] || '';
          hostId = moment.userId;
        }
      }

      await WatchHistory.findOneAndUpdate(
        { userId, type, targetId },
        {
          $set: {
            title,
            cover,
            hostId,
            watchedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      sendSuccess(res, { success: true });
    } catch (error) {
      next(error);
    }
  },

  /** DELETE /api/history/watch */
  async clearWatchHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { type, targetId } = req.query as { type?: string; targetId?: string };

      const filter: any = { userId };
      if (type) filter.type = type;
      if (targetId) filter.targetId = targetId;

      await WatchHistory.deleteMany(filter);
      sendSuccess(res, { cleared: true });
    } catch (error) {
      next(error);
    }
  },
};
