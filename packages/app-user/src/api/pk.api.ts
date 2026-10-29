import client from './client';
import type { ApiResponse } from '../types';

export interface DailyPkHost {
  rank: number;
  userId: string;
  nickname: string;
  avatar: string;
  uid: string;
  level: number;
  gender?: string;
  totalScore: number;
  wins: number;
  battlesCount: number;
  winRate: number;
}

export interface LiveOpponentHost {
  streamId: string;
  hostId: string;
  nickname: string;
  avatar: string;
  level: number;
  uid: string;
  title: string;
  cover: string;
  viewerCount: number;
}

export interface LivePkBattleState {
  battleId: string;
  streamIdA: string;
  streamIdB: string;
  durationSeconds: number;
  endsAt: string | Date;
  scoreA: number;
  scoreB: number;
  hostA: {
    _id: string;
    nickname: string;
    avatar: string;
    level: number;
    uid: string;
  };
  hostB: {
    _id: string;
    nickname: string;
    avatar: string;
    level: number;
    uid: string;
  };
}

export const pkApi = {
  getDailyPkRank: () =>
    client.get<ApiResponse<{ leaderboard: DailyPkHost[]; myRankInfo: DailyPkHost | null; totalParticipants: number }>>(
      '/pk/daily-rank'
    ),

  getLiveOpponents: () =>
    client.get<ApiResponse<{ friends: LiveOpponentHost[]; random: LiveOpponentHost[]; totalAvailable: number }>>(
      '/pk/live-opponents'
    ),

  searchHostByUid: (uid: string) =>
    client.get<ApiResponse<{ host: any; isLive: boolean; streamId: string | null; streamTitle: string | null }>>(
      '/pk/search-host',
      { params: { uid } }
    ),

  inviteLivePk: (data: {
    inviterStreamId: string;
    targetHostId: string;
    targetStreamId?: string;
    durationMinutes?: number;
  }) => client.post<ApiResponse<any>>('/pk/live-invite', data),

  respondLivePk: (battleId: string, accept: boolean) =>
    client.post<ApiResponse<{ success: boolean; accepted: boolean; battle?: LivePkBattleState }>>(
      '/pk/live-respond',
      { battleId, accept }
    ),

  addLivePkScore: (data: {
    battleId: string;
    targetSide: 'A' | 'B';
    amount: number;
    senderName?: string;
    senderAvatar?: string;
    giftName?: string;
    giftIcon?: string;
  }) => client.post<ApiResponse<any>>('/pk/live-score', data),

  endLivePk: (battleId: string) => client.post<ApiResponse<any>>(`/pk/${battleId}/end`),
};
