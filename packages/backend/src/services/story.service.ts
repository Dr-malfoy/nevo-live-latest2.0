import { Story, User } from '../models';
import { AppError } from '../middleware/errorHandler';

export interface CreateStoryDto {
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'text';
  caption?: string;
  backgroundColor?: string;
  textColor?: string;
}

export const storyService = {
  async createStory(userId: string, data: CreateStoryDto) {
    if (data.mediaType !== 'text' && !data.mediaUrl) {
      if (!data.caption) {
        throw new AppError('Story content or media is required', 400);
      }
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    const story = await Story.create({
      userId,
      mediaUrl: data.mediaUrl || '',
      mediaType: data.mediaType || (data.mediaUrl ? 'image' : 'text'),
      caption: (data.caption || '').trim().slice(0, 500),
      backgroundColor: data.backgroundColor || '#E11D48',
      textColor: data.textColor || '#FFFFFF',
      views: [userId], // Author has viewed their own story
      expiresAt,
    });

    return story;
  },

  async getActiveStories(requesterId: string) {
    const now = new Date();
    // Only fetch non-expired stories
    const stories = await Story.find({
      expiresAt: { $gt: now },
    })
      .populate('userId', 'uid nickname avatar level country lastActiveAt')
      .sort({ createdAt: 1 })
      .lean();

    // Group stories by user
    const groupedMap = new Map<string, any>();

    for (const s of stories) {
      if (!s.userId) continue;
      const user = s.userId as any;
      const uIdStr = user._id.toString();

      const hasViewed = Array.isArray(s.views) && s.views.some((v: any) => v.toString() === requesterId);

      if (!groupedMap.has(uIdStr)) {
        groupedMap.set(uIdStr, {
          user: {
            _id: uIdStr,
            uid: user.uid,
            nickname: user.nickname,
            avatar: user.avatar,
            level: user.level,
            country: user.country,
            online: user.lastActiveAt && (Date.now() - new Date(user.lastActiveAt).getTime() < 5 * 60 * 1000),
          },
          stories: [],
          hasUnviewed: false,
          latestStoryAt: s.createdAt,
          isSelf: uIdStr === requesterId,
        });
      }

      const group = groupedMap.get(uIdStr);
      group.stories.push({
        _id: s._id.toString(),
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType,
        caption: s.caption,
        backgroundColor: s.backgroundColor,
        textColor: s.textColor,
        viewsCount: Array.isArray(s.views) ? s.views.length : 0,
        hasViewed,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      });

      if (!hasViewed) {
        group.hasUnviewed = true;
      }
      group.latestStoryAt = s.createdAt;
    }

    const result = Array.from(groupedMap.values());

    // Sort order:
    // 1. Self story first
    // 2. Unviewed stories next
    // 3. Most recently posted stories
    result.sort((a, b) => {
      if (a.isSelf && !b.isSelf) return -1;
      if (!a.isSelf && b.isSelf) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return new Date(b.latestStoryAt).getTime() - new Date(a.latestStoryAt).getTime();
    });

    return result;
  },

  async viewStory(storyId: string, viewerId: string) {
    const story = await Story.findById(storyId);
    if (!story) throw new AppError('Story not found', 404);

    if (story.expiresAt && new Date(story.expiresAt) <= new Date()) {
      throw new AppError('This story has expired', 410);
    }

    const hasViewed = story.views.some((v) => v.toString() === viewerId);
    if (!hasViewed) {
      story.views.push(viewerId as any);
      await story.save();
    }

    return { success: true, viewsCount: story.views.length };
  },

  async deleteStory(storyId: string, userId: string) {
    const story = await Story.findOne({ _id: storyId, userId });
    if (!story) throw new AppError('Story not found or unauthorized', 404);

    await Story.deleteOne({ _id: storyId });
    return { success: true };
  },
};
