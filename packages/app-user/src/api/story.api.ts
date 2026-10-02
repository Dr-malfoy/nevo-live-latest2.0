import client from './client';
import type { ApiResponse } from '../types';
import { useAuthStore } from '../stores';

export interface StoryItem {
  _id: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video' | 'text';
  caption?: string;
  backgroundColor?: string;
  textColor?: string;
  viewsCount?: number;
  hasViewed?: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface UserStoryGroup {
  user: {
    _id: string;
    uid?: string;
    nickname: string;
    avatar?: string;
    level?: number;
    country?: string;
    online?: boolean;
  };
  stories: StoryItem[];
  hasUnviewed: boolean;
  latestStoryAt: string;
  isSelf: boolean;
}

export interface CreateStoryPayload {
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'text';
  caption?: string;
  backgroundColor?: string;
  textColor?: string;
}

const LOCAL_STORAGE_STORIES_KEY = 'nevo_local_stories_v1';
let isServerStoriesSupported: boolean | null = null;

// Helper to get non-expired local stories
const getLocalStories = (): UserStoryGroup[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STORIES_KEY);
    if (!raw) return [];
    const groups: UserStoryGroup[] = JSON.parse(raw);
    const now = Date.now();

    // Filter out expired stories (24h)
    const validGroups = groups
      .map((g) => ({
        ...g,
        stories: (g.stories || []).filter((s) => new Date(s.expiresAt).getTime() > now),
      }))
      .filter((g) => g.stories.length > 0);

    localStorage.setItem(LOCAL_STORAGE_STORIES_KEY, JSON.stringify(validGroups));
    return validGroups;
  } catch {
    return [];
  }
};

const saveLocalStory = (payload: CreateStoryPayload): StoryItem => {
  const currentUser = useAuthStore.getState().user;
  const currentUserId = currentUser?._id || 'self_user';
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const newStory: StoryItem = {
    _id: 'local_story_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    mediaUrl: payload.mediaUrl,
    mediaType: payload.mediaType || (payload.mediaUrl ? 'image' : 'text'),
    caption: payload.caption,
    backgroundColor: payload.backgroundColor,
    textColor: payload.textColor || '#FFFFFF',
    viewsCount: 1,
    hasViewed: true,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const currentGroups = getLocalStories();
  const existingGroupIdx = currentGroups.findIndex(
    (g) => g.user._id === currentUserId || g.isSelf
  );

  if (existingGroupIdx >= 0) {
    currentGroups[existingGroupIdx].stories.push(newStory);
    currentGroups[existingGroupIdx].latestStoryAt = newStory.createdAt;
  } else {
    currentGroups.unshift({
      user: {
        _id: currentUserId,
        uid: currentUser?.uid,
        nickname: currentUser?.nickname || 'You',
        avatar: currentUser?.avatar,
        level: currentUser?.level,
        country: currentUser?.country,
        online: true,
      },
      stories: [newStory],
      hasUnviewed: false,
      latestStoryAt: newStory.createdAt,
      isSelf: true,
    });
  }

  localStorage.setItem(LOCAL_STORAGE_STORIES_KEY, JSON.stringify(currentGroups));
  return newStory;
};

export const storyApi = {
  getStories: async () => {
    if (isServerStoriesSupported === false) {
      return { data: { success: true, data: getLocalStories() } } as any;
    }

    try {
      const res = await client.get<ApiResponse<UserStoryGroup[]>>('/stories');
      if (res.data?.success && Array.isArray(res.data.data)) {
        isServerStoriesSupported = true;
        return res;
      }
      return { data: { success: true, data: getLocalStories() } } as any;
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.code === 'ERR_NETWORK') {
        isServerStoriesSupported = false;
        return { data: { success: true, data: getLocalStories() } } as any;
      }
      return { data: { success: true, data: getLocalStories() } } as any;
    }
  },

  createStory: async (data: CreateStoryPayload) => {
    if (isServerStoriesSupported === false) {
      const localStory = saveLocalStory(data);
      return { data: { success: true, data: localStory, message: 'Story posted (24h)' } } as any;
    }

    try {
      const res = await client.post<ApiResponse<StoryItem>>('/stories', data);
      isServerStoriesSupported = true;
      return res;
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.code === 'ERR_NETWORK') {
        isServerStoriesSupported = false;
        const localStory = saveLocalStory(data);
        return { data: { success: true, data: localStory, message: 'Story posted (24h)' } } as any;
      }
      throw err;
    }
  },

  viewStory: async (storyId: string) => {
    if (isServerStoriesSupported === false) {
      const groups = getLocalStories();
      for (const g of groups) {
        for (const s of g.stories) {
          if (s._id === storyId) s.hasViewed = true;
        }
      }
      localStorage.setItem(LOCAL_STORAGE_STORIES_KEY, JSON.stringify(groups));
      return { data: { success: true } } as any;
    }

    try {
      return await client.post<ApiResponse>(`/stories/${storyId}/view`);
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.code === 'ERR_NETWORK') {
        isServerStoriesSupported = false;
        const groups = getLocalStories();
        for (const g of groups) {
          for (const s of g.stories) {
            if (s._id === storyId) s.hasViewed = true;
          }
        }
        localStorage.setItem(LOCAL_STORAGE_STORIES_KEY, JSON.stringify(groups));
        return { data: { success: true } } as any;
      }
      return { data: { success: true } } as any;
    }
  },

  deleteStory: async (storyId: string) => {
    if (isServerStoriesSupported === false) {
      const groups = getLocalStories();
      const updated = groups
        .map((g) => ({
          ...g,
          stories: g.stories.filter((s) => s._id !== storyId),
        }))
        .filter((g) => g.stories.length > 0);
      localStorage.setItem(LOCAL_STORAGE_STORIES_KEY, JSON.stringify(updated));
      return { data: { success: true } } as any;
    }

    try {
      return await client.delete<ApiResponse>(`/stories/${storyId}`);
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.code === 'ERR_NETWORK') {
        isServerStoriesSupported = false;
        const groups = getLocalStories();
        const updated = groups
          .map((g) => ({
            ...g,
            stories: g.stories.filter((s) => s._id !== storyId),
          }))
          .filter((g) => g.stories.length > 0);
        localStorage.setItem(LOCAL_STORAGE_STORIES_KEY, JSON.stringify(updated));
        return { data: { success: true } } as any;
      }
      throw err;
    }
  },
};
