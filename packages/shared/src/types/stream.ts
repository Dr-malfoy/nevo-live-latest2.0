export interface ILiveStream {
  _id: string;
  hostId: string;
  title: string;
  cover: string;
  type: 'video' | 'voice' | 'game';
  category: 'talk' | 'game' | 'music' | 'other';
  status: 'live' | 'ended';
  sessionId?: string;
  agoraChannel: string;
  agoraToken?: string;
  viewerCount: number;
  totalViewers: number;
  startedAt: Date;
  endedAt?: Date;
  heartbeatAt?: Date;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStreamInput {
  title: string;
  cover?: string;
  type: 'video' | 'voice' | 'game';
  category: 'talk' | 'game' | 'music' | 'other';
}

export interface StreamFeedQuery {
  tab?: 'popular' | 'follow' | 'newest';
  type?: 'video' | 'voice' | 'game';
  category?: string;
  page?: number;
  limit?: number;
}
