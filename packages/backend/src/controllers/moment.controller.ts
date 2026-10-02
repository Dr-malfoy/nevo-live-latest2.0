import { Request, Response, NextFunction } from 'express';
import { Moment } from '../models';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { getIO } from '../socket';
import { calculateWealthLevel, calculateLiveLevel } from '../utils/userLevels';

const USER_FIELDS = 'uid nickname avatar level wealthLevel liveLevel wealthExp exp sellerType verification diamonds coins noble isVip';

const decorateUser = (plain: any) => {
  if (!plain) return plain;
  const raw = typeof plain.toObject === 'function' ? plain.toObject() : { ...plain };
  const diamonds = Math.max(0, raw?.diamonds ?? 0);
  const coins = Math.max(0, raw?.coins ?? 0);
  const wealthExp = Math.max(raw?.wealthExp || 0, diamonds);
  const wealthLevel = raw?.wealthLevel && raw.wealthLevel > 1 ? raw.wealthLevel : calculateWealthLevel(wealthExp, raw?.level).level;
  const liveLevel = raw?.liveLevel && raw.liveLevel > 1 ? raw.liveLevel : calculateLiveLevel(coins, raw?.level).level;
  const level = raw?.level && raw.level > 1 ? raw.level : Math.max(wealthLevel, liveLevel, 1);
  return {
    ...raw,
    wealthLevel,
    liveLevel,
    level,
  };
};

const decorateMoment = (m: any) => {
  if (!m) return m;
  const obj = typeof m.toObject === 'function' ? m.toObject() : { ...m };
  if (obj.userId && typeof obj.userId === 'object') {
    obj.userId = decorateUser(obj.userId);
  }
  if (Array.isArray(obj.comments)) {
    obj.comments = obj.comments.map((c: any) => {
      if (c && c.userId && typeof c.userId === 'object') {
        return { ...c, userId: decorateUser(c.userId) };
      }
      return c;
    });
  }
  return obj;
};

const safeEmit = (event: string, payload: any) => {
  try {
    getIO().emit(event, payload);
  } catch {
    // Socket not yet initialised or server starting
  }
};

export const momentController = {
  async getFeed(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const total = await Moment.countDocuments();
      const moments = await Moment.find()
        .populate('userId', USER_FIELDS)
        .populate('comments.userId', USER_FIELDS)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const decorated = moments.map(decorateMoment);
      sendPaginated(res, decorated, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async createMoment(req: Request, res: Response, next: NextFunction) {
    try {
      const { content, media, mediaType, videoUrl, thumbnail, hashtags, durationSec } = req.body;
      const isVideo = mediaType === 'video' || !!videoUrl || (Array.isArray(media) && media[0]?.match(/\.(mp4|webm|mov|mkv)$/i));

      if (isVideo && typeof durationSec === 'number' && durationSec > 95) {
        sendError(res, 'Video duration cannot exceed 1 minute 30 seconds (90s)', 400);
        return;
      }
      
      const moment = await Moment.create({
        userId: req.user!.userId,
        content,
        media: media || (videoUrl ? [videoUrl] : []),
        mediaType: isVideo ? 'video' : 'image',
        videoUrl: videoUrl || (isVideo && Array.isArray(media) ? media[0] : undefined),
        thumbnail: thumbnail || (!isVideo && Array.isArray(media) ? media[0] : undefined),
        hashtags: Array.isArray(hashtags) ? hashtags : [],
        durationSec,
      });
      const populated = await moment.populate('userId', USER_FIELDS);
      const decorated = decorateMoment(populated);
      
      safeEmit('moment:created', decorated);
      sendSuccess(res, decorated, 'Moment created', 201);
    } catch (error) {
      next(error);
    }
  },

  async getMoment(req: Request, res: Response, next: NextFunction) {
    try {
      const moment = await Moment.findById(req.params.id)
        .populate('userId', USER_FIELDS)
        .populate('comments.userId', USER_FIELDS);
      if (!moment) {
        sendError(res, 'Moment not found', 404);
        return;
      }
      const decorated = decorateMoment(moment);
      sendSuccess(res, decorated);
    } catch (error) {
      next(error);
    }
  },

  async updateMoment(req: Request, res: Response, next: NextFunction) {
    try {
      const { content, hashtags } = req.body;
      const moment = await Moment.findOne({
        _id: req.params.id,
        userId: req.user!.userId,
      });
      if (!moment) {
        sendError(res, 'Moment not found or unauthorized', 404);
        return;
      }

      if (typeof content === 'string') {
        moment.content = content.trim();
      }
      if (Array.isArray(hashtags)) {
        moment.hashtags = hashtags;
      }

      await moment.save();

      const populated = await moment.populate([
        { path: 'userId', select: USER_FIELDS },
        { path: 'comments.userId', select: USER_FIELDS },
      ]);
      const decorated = decorateMoment(populated);

      safeEmit('moment:updated', decorated);
      sendSuccess(res, decorated, 'Moment updated successfully');
    } catch (error) {
      next(error);
    }
  },

  async deleteMoment(req: Request, res: Response, next: NextFunction) {
    try {
      const moment = await Moment.findOneAndDelete({
        _id: req.params.id,
        userId: req.user!.userId,
      });
      if (!moment) {
        sendError(res, 'Moment not found or unauthorized', 404);
        return;
      }
      safeEmit('moment:deleted', { momentId: req.params.id });
      sendSuccess(res, null, 'Moment deleted');
    } catch (error) {
      next(error);
    }
  },

  async toggleLike(req: Request, res: Response, next: NextFunction) {
    try {
      const moment = await Moment.findById(req.params.id);
      if (!moment) {
        sendError(res, 'Moment not found', 404);
        return;
      }

      const userId = req.user!.userId;
      const index = moment.likes.findIndex(
        (id) => (id ? id.toString() : '') === userId.toString()
      );
      let isLiked = false;

      if (index > -1) {
        moment.likes.splice(index, 1);
        await moment.save();
        isLiked = false;
      } else {
        moment.likes.push(userId as any);
        await moment.save();
        isLiked = true;
      }

      safeEmit('moment:like', {
        momentId: moment._id.toString(),
        userId: userId.toString(),
        liked: isLiked,
        likes: moment.likes.map((id) => (id ? id.toString() : '')),
        likesCount: moment.likes.length,
      });

      sendSuccess(res, {
        liked: isLiked,
        likesCount: moment.likes.length,
        likes: moment.likes,
      });
    } catch (error) {
      next(error);
    }
  },

  async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const moment = await Moment.findById(req.params.id);
      if (!moment) {
        sendError(res, 'Moment not found', 404);
        return;
      }

      moment.comments.push({
        userId: req.user!.userId as any,
        text: req.body.text,
        createdAt: new Date(),
      });

      await moment.save();

      const populated = await moment.populate('comments.userId', USER_FIELDS);
      const rawComment: any = populated.comments[populated.comments.length - 1];
      const commentObj = typeof rawComment?.toObject === 'function' ? rawComment.toObject() : { ...rawComment };
      if (commentObj.userId && typeof commentObj.userId === 'object') {
        commentObj.userId = decorateUser(commentObj.userId);
      }

      safeEmit('moment:comment', {
        momentId: moment._id.toString(),
        comment: commentObj,
        commentsCount: moment.comments.length,
      });

      sendSuccess(res, commentObj, 'Comment added');
    } catch (error) {
      next(error);
    }
  },

  async shareMoment(req: Request, res: Response, next: NextFunction) {
    try {
      const moment = await Moment.findById(req.params.id);
      if (!moment) {
        sendError(res, 'Moment not found', 404);
        return;
      }

      moment.shareCount = (moment.shareCount || 0) + 1;
      if (req.user?.userId && !moment.shares?.includes(req.user.userId as any)) {
        if (!moment.shares) moment.shares = [];
        moment.shares.push(req.user.userId as any);
      }
      await moment.save();

      safeEmit('moment:share', {
        momentId: moment._id.toString(),
        shareCount: moment.shareCount,
      });

      sendSuccess(res, { shareCount: moment.shareCount }, 'Moment shared');
    } catch (error) {
      next(error);
    }
  },
};
