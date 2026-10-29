import client from './client';

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
  userId?: string;
  hostId: string;
  streamId: string;
  nickname: string;
  avatar: string;
  level: number;
  uid: string;
  streamTitle?: string;
  title?: string;
  cover?: string;
  viewerCount?: number;
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
  getDailyPkRank: async (): Promise<{
    leaderboard: DailyPkHost[];
    myRankInfo: DailyPkHost | null;
    totalParticipants: number;
  }> => {
    const res = await client.get('/pk/daily-rank');
    return res.data?.data ?? res.data ?? { leaderboard: [], myRankInfo: null, totalParticipants: 0 };
  },

  getLiveOpponents: async (
    streamId?: string
  ): Promise<{
    friends: LiveOpponentHost[];
    random: LiveOpponentHost[];
    totalAvailable: number;
  }> => {
    const res = await client.get('/pk/live-opponents', { params: { streamId } });
    return res.data?.data ?? res.data ?? { friends: [], random: [], totalAvailable: 0 };
  },

  searchHostByUid: async (uid: string): Promise<LiveOpponentHost | null> => {
    const res = await client.get('/pk/search-host', { params: { uid } });
    const data = res.data?.data ?? res.data;
    if (!data) return null;
    return {
      userId: data.userId || data.hostId || data.host?._id || '',
      hostId: data.hostId || data.userId || data.host?._id || '',
      streamId: data.streamId || '',
      nickname: data.nickname || data.host?.nickname || 'Host',
      avatar: data.avatar || data.host?.avatar || '',
      level: data.level || data.host?.level || 1,
      uid: data.uid || data.host?.uid || uid,
      streamTitle: data.streamTitle || data.title || '',
      title: data.title || data.streamTitle || '',
      viewerCount: data.viewerCount || 0,
    };
  },

  inviteLivePk: async (data: {
    inviterStreamId?: string;
    fromStreamId?: string;
    targetHostId?: string;
    toHostId?: string;
    targetStreamId?: string;
    toStreamId?: string;
    durationMinutes?: number;
    durationSeconds?: number;
  }) => {
    const payload = {
      inviterStreamId: data.inviterStreamId || data.fromStreamId,
      targetHostId: data.targetHostId || data.toHostId,
      targetStreamId: data.targetStreamId || data.toStreamId,
      durationMinutes: data.durationMinutes || (data.durationSeconds ? Math.round(data.durationSeconds / 60) : 3),
    };
    const res = await client.post('/pk/live-invite', payload);
    return res.data?.data ?? res.data;
  },

  respondLivePk: async (data: { battleId?: string; pkId?: string; accept: boolean; streamId?: string }) => {
    const battleId = data.battleId || data.pkId;
    const res = await client.post('/pk/live-respond', { battleId, accept: data.accept });
    return res.data?.data ?? res.data;
  },

  addLivePkScore: async (data: {
    battleId?: string;
    pkId?: string;
    targetSide?: 'A' | 'B';
    hostSide?: 'left' | 'right' | 'A' | 'B';
    amount?: number;
    points?: number;
    senderName?: string;
    senderAvatar?: string;
    giftName?: string;
    giftIcon?: string;
  }) => {
    const battleId = data.battleId || data.pkId;
    const targetSide = (data.targetSide || (data.hostSide === 'right' ? 'B' : 'A')) as 'A' | 'B';
    const amount = data.amount || data.points || 10;
    const res = await client.post('/pk/live-score', {
      battleId,
      targetSide,
      amount,
      senderName: data.senderName,
      senderAvatar: data.senderAvatar,
      giftName: data.giftName,
      giftIcon: data.giftIcon,
    });
    return res.data?.data ?? res.data;
  },

  endLivePk: async (battleId: string) => {
    const res = await client.post(`/pk/${battleId}/end`);
    return res.data?.data ?? res.data;
  },
};
