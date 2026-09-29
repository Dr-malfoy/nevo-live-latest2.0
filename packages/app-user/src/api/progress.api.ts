import client from './client';
import type { ApiResponse, UserPublic } from '../types';

/**
 * Rankings, tasks, levels and achievements.
 *
 * Specified in BACKEND-GUIDE.md §4.3, §4.5 and §4.6. None built yet — call
 * through `optional()`.
 */

/* ── Rankings (#28, #35–#38, #71) — §4.5 ──────────────────────────── */

export type RankingBoard =
  | 'agent_count'
  | 'agent_income'
  | 'elite_agent'
  | 'host_daily'
  | 'rocket_host'
  | 'star_host'
  | 'esports_host'
  | 'earnings'
  | 'rich'
  | 'gift'
  | 'video';

export type RankingPeriod = 'today' | 'yesterday' | 'week' | 'month';

export interface RankingRow {
  rank: number;
  user: UserPublic;
  metric: number;
  metricLabel: string;
  earnings?: number;
  prize?: number;
  badge?: string | null;
  frame?: string | null;
}

export interface RankingResult {
  resetsAt?: string;
  me?: { rank: number | null; distanceToNext?: number; metricLabel?: string } | null;
  rows: RankingRow[];
}

export interface RankingConfig {
  poolTotal?: number;
  prizes?: number[];
  condition?: string;
  countries?: string[];
}

/* ── Tasks (#30, #31, #32, #69) — §4.3 ────────────────────────────── */

export type TaskGroup = 'daily' | 'interactive' | 'fan_club' | 'pk_mission' | 'games' | 'activity';

export interface TaskReward {
  currency: 'coin' | 'diamond' | 'ticket' | 'pk_flag' | string;
  amount: number;
}

export interface TaskItem {
  key: string;
  label: string;
  note?: string;
  progress: number;
  target: number;
  reward: TaskReward;
  state: 'todo' | 'claimable' | 'claimed';
  goTo?: string;
}

export interface TaskSection {
  key: string;
  title: string;
  icon?: string;
  note?: string;
  totals?: TaskReward[];
  tasks: TaskItem[];
}

export interface TaskBoard {
  todayEarnings: { points: number; coins: number };
  resetsAt?: string;
  sections: TaskSection[];
}

/* ── Levels (#33, #43, #55, #61) — §4.6 ───────────────────────────── */

export type LevelKind = 'wealth' | 'livestream';

export interface LevelPrivilege {
  level: number;
  key: 'badge' | 'entry_effect' | 'levelup_effect' | string;
  title: string;
  icon?: string;
  preview?: string;
  scope?: 'all_rooms' | 'ongoing_room';
  hint?: string;
  pillColor?: string;
}

export interface LevelState {
  current: {
    level: number;
    points: number;
    nextLevel?: number;
    remaining?: number;
    progress: number;
    badgeIcon?: string;
  };
  unlocked: LevelPrivilege[];
  locked: LevelPrivilege[];
}

/* ── Achievements (#53) — §4.6 ────────────────────────────────────── */

export interface Poster {
  level: number;
  title: string;
  image?: string;
  unlockedAt?: string;
  shareUrl?: string;
}

export interface AchievementGroup {
  key: string;
  title: string;
  count: number;
  posters: Poster[];
}

export const rankingApi = {
  get: (params: {
    board: RankingBoard;
    period?: RankingPeriod;
    country?: string;
    scope?: 'global' | 'friends';
    gameKey?: string;
  }) => client.get<ApiResponse<RankingResult>>('/rankings', { params }),

  getConfig: (board: RankingBoard) =>
    client.get<ApiResponse<RankingConfig>>(`/rankings/${board}/config`),

  /** #35 scrolls back through settled days. */
  getHistory: (board: RankingBoard, date: string) =>
    client.get<ApiResponse<RankingResult>>(`/rankings/${board}/history`, { params: { date } }),
};

export const taskApi = {
  getBoard: (group: TaskGroup = 'daily') =>
    client.get<ApiResponse<TaskBoard>>('/tasks', { params: { group } }),

  /** Crediting happens on claim, never on progress. */
  claim: (key: string) => client.post<ApiResponse<TaskReward>>(`/tasks/${key}/claim`),
};

export const levelApi = {
  get: (kind: LevelKind) => client.get<ApiResponse<LevelState>>(`/levels/${kind}`),
};

export const achievementApi = {
  get: (category: 'milestones' | 'merits' | 'identity' = 'milestones') =>
    client.get<ApiResponse<{ obtainedCount: number; groups: AchievementGroup[] }>>('/achievements', {
      params: { category },
    }),
};
