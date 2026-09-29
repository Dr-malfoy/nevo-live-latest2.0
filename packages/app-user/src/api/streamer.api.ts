import client from './client';
import type { ApiResponse } from '../types';

/**
 * Streamer center (#40, #42) and video creator center (#62).
 * Specified in BACKEND-GUIDE.md §4.8. Not built yet.
 */

export type StreamerRange = 'today' | 'week' | 'month';

export interface StreamerStats {
  liveDurationSec: number;
  pointsEarned: number;
  newFollowers: number;
  avgConcurrentUsers: number;
}

export interface LastStreamReport {
  startedAt: string;
  cover?: string;
  aiScoreStatus: 'in_progress' | 'done' | 'none';
  liveDurationSec: number;
  pointsEarned: number;
  newFollowers: number;
  viewers: number;
  /** Compared against the previous stream server-side — drives the red arrows. */
  trend?: Partial<Record<'liveDuration' | 'pointsEarned' | 'newFollowers' | 'viewers', 'up' | 'down'>>;
}

export interface InspirationRow {
  key: string;
  title: string;
  description: string;
  icon?: string;
}

export interface CreatorStats {
  level: number;
  levelTitle: string;
  verified: boolean;
  progress: { posted: number; target: number };
  totals: { videos: number; topOriginal: number };
  last7Days: { views: number; interactions: number; newFollowers: number };
  academy: { title: string; thumbnail?: string; url?: string }[];
}

export const streamerApi = {
  getStats: (range: StreamerRange = 'today') =>
    client.get<ApiResponse<StreamerStats>>('/streamer/stats', { params: { range } }),

  getLastReport: () => client.get<ApiResponse<LastStreamReport>>('/streamer/last-report'),

  updateCover: (cover: string) => client.put<ApiResponse>('/streamer/cover', { cover }),

  getInspiration: () =>
    client.get<ApiResponse<{ guidelines: InspirationRow[]; tools: InspirationRow[] }>>(
      '/streamer/inspiration'
    ),

  updateSettings: (payload: { title?: string; tags?: string[]; locationEnabled?: boolean }) =>
    client.put<ApiResponse>('/streamer/settings', payload),

  /** #62 */
  getCreatorStats: () => client.get<ApiResponse<CreatorStats>>('/creator/stats'),
};
