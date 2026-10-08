import client from './client';
import type { ApiResponse } from '../types';

export type StreamerRange = 'today' | 'week' | 'month' | 'all';

export interface StreamerStats {
  liveDurationSec: number;
  pointsEarned: number;
  newFollowers: number;
  avgConcurrentUsers: number;
  peakConcurrentUsers?: number;
  streamCount?: number;
  totalViewers?: number;
  diamondsEarned?: number;
  level?: number;
  agencyName?: string;
  agencyCode?: string;
  cover?: string;
  trend?: {
    liveDuration?: 'up' | 'down';
    pointsEarned?: 'up' | 'down';
    newFollowers?: 'up' | 'down';
    avgConcurrentUsers?: 'up' | 'down';
  };
}

export interface LastStreamReport {
  _id?: string;
  startedAt: string;
  endedAt?: string;
  cover?: string;
  title?: string;
  aiScoreStatus: 'in_progress' | 'done' | 'none';
  aiScore?: number;
  aiFeedback?: string;
  liveDurationSec: number;
  pointsEarned: number;
  newFollowers: number;
  viewers: number;
  peakViewers?: number;
  status?: string;
  trend?: Partial<Record<'liveDuration' | 'pointsEarned' | 'newFollowers' | 'viewers', 'up' | 'down'>>;
}

export interface InspirationRow {
  key: string;
  title: string;
  description: string;
  icon?: string;
  badge?: string;
  category?: string;
  tips?: string[];
  route?: string;
}

export interface StreamHistoryItem {
  _id: string;
  title: string;
  cover?: string;
  category?: string;
  type?: string;
  status: 'live' | 'ended';
  startedAt: string;
  endedAt?: string;
  durationSec: number;
  viewers: number;
  peakViewers?: number;
}

export interface MilestoneReward {
  level: number;
  reward: string;
  unlocked: boolean;
}

export interface MilestoneData {
  currentLevel: number;
  levelTitle: string;
  progressPercent: number;
  currentExp: number;
  nextLevelExp: number;
  monthlyTargetHours: number;
  monthlyTargetDiamonds: number;
  rewards: MilestoneReward[];
}

export interface CreatorVideoItem {
  _id: string;
  content?: string;
  media: string[];
  mediaType: 'image' | 'video';
  videoUrl?: string;
  thumbnail?: string;
  durationSec?: number;
  viewCount: number;
  likes: string[];
  comments: any[];
  shareCount: number;
  giftCount: number;
  createdAt: string;
}

export interface CreatorPeriodStats {
  views: number;
  interactions: number;
  newFollowers: number;
  watchTimeMinutes: number;
  watchTimeHours: number;
  videosPosted: number;
  liveHours: number;
  liveStreams: number;
}

export interface CreatorPerk {
  title: string;
  desc: string;
  unlocked: boolean;
  reqLevel: number;
}

export interface CreatorAcademyItem {
  title: string;
  thumbnail?: string;
  url?: string;
  duration?: string;
  category?: string;
}

export interface CreatorStats {
  level: number;
  levelTitle: string;
  verified: boolean;
  progress: {
    posted: number;
    target: number;
    percent?: number;
  };
  totals: {
    posts: number;
    videos: number;
    images: number;
    views: number;
    videoViews?: number;
    likes: number;
    comments: number;
    shares: number;
    gifts: number;
    topOriginal: number;
    videoWatchTimeMinutes?: number;
    videoWatchTimeHours?: number;
    liveWatchTimeHours?: number;
    totalWatchTimeHours?: number;
    liveStreamsCount?: number;
    liveDurationHours?: number;
    liveViewersCount?: number;
    liveDiamondsEarned?: number;
  };
  last7Days: CreatorPeriodStats;
  last30Days?: CreatorPeriodStats;
  allTime?: CreatorPeriodStats;
  myVideos?: CreatorVideoItem[];
  topVideos?: CreatorVideoItem[];
  perks?: CreatorPerk[];
  academy?: CreatorAcademyItem[];
}

export const streamerApi = {
  getStats: (range: StreamerRange = 'today') =>
    client.get<ApiResponse<StreamerStats>>('/streamer/stats', { params: { range } }),

  getLastReport: () => client.get<ApiResponse<LastStreamReport>>('/streamer/last-report'),

  updateCover: (cover: string) => client.put<ApiResponse<{ cover: string }>>('/streamer/cover', { cover }),

  getInspiration: () =>
    client.get<ApiResponse<{ guidelines: InspirationRow[]; tools: InspirationRow[] }>>(
      '/streamer/inspiration'
    ),

  updateSettings: (payload: { title?: string; tags?: string[]; locationEnabled?: boolean }) =>
    client.put<ApiResponse>('/streamer/settings', payload),

  getMilestones: () => client.get<ApiResponse<MilestoneData>>('/streamer/milestones'),

  getHistory: (page = 1, limit = 10) =>
    client.get<{ success: boolean; data: StreamHistoryItem[]; total: number; page: number; limit: number }>(
      '/streamer/history',
      { params: { page, limit } }
    ),

  getCreatorStats: () => client.get<ApiResponse<CreatorStats>>('/streamer/creator-stats'),
};
