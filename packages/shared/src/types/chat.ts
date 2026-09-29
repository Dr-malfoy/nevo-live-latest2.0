export interface IChat {
  _id: string;
  participants: Array<string | { _id: string; uid: string; nickname: string; avatar?: string; level?: number }>;
  lastMessage: string;
  lastMessageAt?: Date;
  lastMessageBy?: string | { _id: string; uid: string; nickname: string };
  unread?: number;
  other?: { _id: string; uid: string; nickname: string; avatar?: string; level?: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatMessage {
  _id: string;
  chatId: string;
  senderId: string;
  message: string;
  kind?: 'text' | 'gift' | 'voice' | 'image';
  giftId?: string;
  giftName?: string;
  giftCount?: number;
  voiceUrl?: string;
  voiceDuration?: number;
  imageUrl?: string;
  read: boolean;
  readAt?: Date | string;
  delivered?: boolean;
  deliveredAt?: Date | string;
  status?: 'sending' | 'sent' | 'delivered' | 'seen';
  edited?: boolean;
  editedAt?: Date | string;
  isDeleted?: boolean;
  createdAt: Date | string;
}

