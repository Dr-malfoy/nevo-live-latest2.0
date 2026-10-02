import { Chat, ChatMessage, User, LiveStream, Story, Note } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getIO } from '../socket';

export const chatService = {
  async getOrCreateChat(userId: string, otherUserId: string) {
    if (userId === otherUserId) throw new AppError('Cannot chat with yourself', 400);

    const other = await User.findById(otherUserId);
    if (!other) throw new AppError('User not found', 404);

    // Sorted participant pair for deterministic lookup
    const pair = [userId, otherUserId].sort();

    let chat = await Chat.findOne({
      participants: { $all: pair },
    }).populate('participants', 'uid nickname avatar level sellerType verification country');

    if (!chat) {
      chat = await Chat.create({ participants: pair });
      chat = await Chat.populate(chat, { path: 'participants', select: 'uid nickname avatar level sellerType verification country' });
    }

    return chat;
  },

  async getChatById(chatId: string, userId: string) {
    const chat = await Chat.findOne({ _id: chatId, participants: userId })
      .populate('participants', 'uid nickname avatar level sellerType verification country lastActiveAt');
    if (!chat) throw new AppError('Chat not found', 404);

    const other = (chat.participants as any[]).find((p: any) => p._id.toString() !== userId);
    return {
      ...chat.toObject(),
      other,
    };
  },

  async getUserChats(userId: string, page: number, limit: number, readFilter?: 'unread' | 'seen') {
    const currentUser = await User.findById(userId).select('following followers role isAgent agencyId').lean();
    const followingSet = new Set((currentUser?.following || []).map((id: any) => id.toString()));
    const followerSet = new Set((currentUser?.followers || []).map((id: any) => id.toString()));

    const total = await Chat.countDocuments({ participants: userId });
    let chats = await Chat.find({ participants: userId })
      .populate('participants', 'uid nickname avatar level sellerType verification country role isAgent agencyId')
      .populate('lastMessageBy', 'uid nickname')
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const now = new Date();
    // Get active stories & active notes for participants
    const activeStories = await Story.find({ expiresAt: { $gt: now } }).select('userId views createdAt').lean();
    const storyUserMap = new Map<string, { count: number; hasUnviewed: boolean }>();
    for (const s of activeStories) {
      if (!s.userId) continue;
      const uId = s.userId.toString();
      const hasViewed = Array.isArray(s.views) && s.views.some((v: any) => v.toString() === userId);
      const cur = storyUserMap.get(uId) || { count: 0, hasUnviewed: false };
      cur.count += 1;
      if (!hasViewed) cur.hasUnviewed = true;
      storyUserMap.set(uId, cur);
    }

    const activeNotes = await Note.find({ expiresAt: { $gt: now } }).select('userId text emoji createdAt expiresAt').lean();
    const noteUserMap = new Map<string, { text: string; emoji: string; createdAt: Date }>();
    for (const n of activeNotes) {
      if (!n.userId) continue;
      noteUserMap.set(n.userId.toString(), { text: n.text, emoji: n.emoji || '💭', createdAt: n.createdAt });
    }

    // Add unread count + other participant per chat + category tags
    let result = await Promise.all(
      chats.map(async (chat) => {
        const unread = await ChatMessage.countDocuments({
          chatId: chat._id,
          senderId: { $ne: userId },
          read: false,
        });
        const otherDoc = (chat.participants as any[]).find((p: any) => p._id.toString() !== userId);
        
        let category: 'following' | 'friends' | 'strangers' | 'agency' | 'system' = 'strangers';
        let isFriend = false;
        let isFollowing = false;
        let isAgency = false;
        let isSystem = (chat.type as string) === 'official' || (chat.type as string) === 'system';

        if (otherDoc) {
          const oId = otherDoc._id.toString();
          isFollowing = followingSet.has(oId);
          isFriend = isFollowing && followerSet.has(oId);
          isAgency = Boolean(otherDoc.isAgent || otherDoc.role === 'agent' || otherDoc.sellerType === 'official' || otherDoc.agencyId || (chat.type as string) === 'agency');

          if (isSystem) category = 'system';
          else if (isAgency) category = 'agency';
          else if (isFriend) category = 'friends';
          else if (isFollowing) category = 'following';
          else category = 'strangers';
        }

        const otherStory = otherDoc ? storyUserMap.get(otherDoc._id.toString()) : undefined;
        const otherNote = otherDoc ? noteUserMap.get(otherDoc._id.toString()) : undefined;

        const other = otherDoc ? {
          ...(otherDoc.toObject ? otherDoc.toObject() : otherDoc),
          isFriend,
          isFollowing,
          isAgency,
          category,
          hasStory: Boolean(otherStory && otherStory.count > 0),
          storyCount: otherStory ? otherStory.count : 0,
          hasUnviewedStory: otherStory ? otherStory.hasUnviewed : false,
          note: otherNote || null,
        } : null;

        // Find last message details to include delivery/seen status
        const lastMsg = await ChatMessage.findOne({ chatId: chat._id }).sort({ createdAt: -1 }).lean();

        return {
          ...chat.toObject(),
          unread,
          other,
          category,
          lastMessageStatus: lastMsg?.status || (lastMsg?.read ? 'seen' : lastMsg?.delivered ? 'delivered' : 'sent'),
          lastMessageSenderId: lastMsg?.senderId?.toString(),
        };
      })
    );

    // Unread/Seen tabs
    if (readFilter === 'unread') result = result.filter((c) => c.unread > 0);
    else if (readFilter === 'seen') result = result.filter((c) => c.unread === 0);

    return { data: result, total };
  },

  /** Mark all incoming messages in a chat as read (read receipts). */
  async markChatRead(chatId: string, userId: string) {
    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) throw new AppError('Chat not found', 404);

    const now = new Date();
    const result = await ChatMessage.updateMany(
      { chatId, senderId: { $ne: userId }, read: false },
      { $set: { read: true, readAt: now, delivered: true, deliveredAt: now, status: 'seen' } }
    );

    // Push a live "read" signal to the sender so their Seen badge updates in real time
    const senderIds = await ChatMessage.distinct('senderId', { chatId, senderId: { $ne: userId } });
    try {
      const io = getIO();
      for (const senderId of senderIds) {
        io.to(`user:${senderId.toString()}`).emit('chat:read', { chatId, byUserId: userId, readAt: now });
        io.to(`user:${senderId.toString()}`).emit('chat:seen', { chatId, byUserId: userId, readAt: now });
      }
    } catch {
      // socket not ready
    }

    return { modified: result.modifiedCount };
  },

  /** Mark messages in a chat as delivered to the recipient */
  async markChatDelivered(chatId: string, userId: string) {
    const now = new Date();
    const result = await ChatMessage.updateMany(
      { chatId, senderId: { $ne: userId }, delivered: false, read: false },
      { $set: { delivered: true, deliveredAt: now, status: 'delivered' } }
    );

    const senderIds = await ChatMessage.distinct('senderId', { chatId, senderId: { $ne: userId } });
    try {
      const io = getIO();
      for (const senderId of senderIds) {
        io.to(`user:${senderId.toString()}`).emit('chat:delivered', { chatId, byUserId: userId, deliveredAt: now });
      }
    } catch {
      // socket not ready
    }

    return { modified: result.modifiedCount };
  },

  async getMessages(chatId: string, userId: string, page: number, limit: number) {
    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) throw new AppError('Chat not found', 404);

    const now = new Date();
    // Mark incoming messages as read (with readAt for receipts)
    const updated = await ChatMessage.updateMany(
      { chatId, senderId: { $ne: userId }, read: false },
      { $set: { read: true, readAt: now, delivered: true, deliveredAt: now, status: 'seen' } }
    );

    if (updated.modifiedCount > 0) {
      const senderIds = await ChatMessage.distinct('senderId', { chatId, senderId: { $ne: userId } });
      try {
        const io = getIO();
        for (const senderId of senderIds) {
          io.to(`user:${senderId.toString()}`).emit('chat:read', { chatId, byUserId: userId, readAt: now });
          io.to(`user:${senderId.toString()}`).emit('chat:seen', { chatId, byUserId: userId, readAt: now });
        }
      } catch {
        // socket not ready
      }
    }

    const total = await ChatMessage.countDocuments({ chatId });
    const messages = await ChatMessage.find({ chatId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { data: messages.reverse(), total };
  },

  async sendMessage(chatId: string, senderId: string, message: string, extras: { kind?: 'text' | 'gift' | 'voice' | 'image'; giftId?: string; giftName?: string; giftCount?: number; voiceUrl?: string; voiceDuration?: number; imageUrl?: string } = {}) {
    if (!message || !message.trim()) throw new AppError('Message is required', 400);
    const text = message.trim().slice(0, 2000);

    const chat = await Chat.findOne({ _id: chatId, participants: senderId });
    if (!chat) throw new AppError('Chat not found', 404);

    const recipientId = (chat.participants as any[])
      .find((p: any) => p.toString() !== senderId);

    let isRecipientConnected = false;
    try {
      const io = getIO();
      if (recipientId && io) {
        const room = io.sockets.adapter.rooms.get(`user:${recipientId.toString()}`);
        if (room && room.size > 0) {
          isRecipientConnected = true;
        }
      }
    } catch {
      // socket check fallback
    }

    const now = new Date();
    const delivered = isRecipientConnected;
    const deliveredAt = isRecipientConnected ? now : undefined;
    const status = isRecipientConnected ? 'delivered' : 'sent';

    const msg = await ChatMessage.create({
      chatId,
      senderId,
      message: text,
      kind: extras.kind || 'text',
      giftId: extras.giftId,
      giftName: extras.giftName,
      giftCount: extras.giftCount,
      voiceUrl: extras.voiceUrl,
      voiceDuration: extras.voiceDuration,
      imageUrl: extras.imageUrl,
      read: false,
      delivered,
      deliveredAt,
      status,
    });

    chat.lastMessage = extras.kind === 'gift' ? `Sent ${extras.giftCount || ''} ${extras.giftName || 'a gift'}` : extras.kind === 'voice' ? 'Voice message' : text;
    chat.lastMessageAt = now;
    chat.lastMessageBy = senderId as any;
    await chat.save();

    // Real-time delivery to the other participant
    if (recipientId) {
      try {
        getIO().to(`user:${recipientId.toString()}`).emit('chat:message', {
          chatId,
          message: msg.toObject(),
          senderId,
        });
      } catch {
        // socket not initialized
      }
    }

    return msg;
  },

  async getUnreadCount(userId: string) {
    const chats = await Chat.find({ participants: userId }).select('_id');
    const ids = chats.map((c) => c._id);
    if (ids.length === 0) return 0;

    return ChatMessage.countDocuments({
      chatId: { $in: ids },
      senderId: { $ne: userId },
      read: false,
    });
  },

  // ── §4.10 Chat Extras ──────────────────────────────────────────────────────

  /** Official inbox channel list */
  getOfficialChats() {
    return Promise.resolve([
      { key: 'system',   label: 'System Notifications', icon: 'system'   },
      { key: 'gifts',    label: 'Gift Notifications',   icon: 'gift'     },
      { key: 'activity', label: 'Activity Updates',     icon: 'activity' },
    ]);
  },

  /** Messages for an official channel (uses Notification model, filtered by type) */
  async getOfficialChatMessages(key: string, userId: string, page: number, limit: number) {
    const { Notification } = await import('../models');
    const filter = { userId, type: key };
    const total = await (Notification as any).countDocuments(filter);
    const messages = await (Notification as any).find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { data: messages, total };
  },

  /** Mark all official channel notifications as read */
  async markOfficialRead(key: string, userId: string) {
    const { Notification } = await import('../models');
    await (Notification as any).updateMany({ userId, type: key, read: false }, { $set: { read: true } });
    return { success: true };
  },

  /** Active users strip: followers & friends & recent contacts with online & live status */
  async getActiveUsers(userId: string) {
    const user = await User.findById(userId).select('following followers').lean();
    const candidateIds = new Set<string>();

    const followingIds = (user?.following || []).map((id: any) => id.toString());
    const followerIds = (user?.followers || []).map((id: any) => id.toString());

    // Friends = mutual follow
    const friendIdSet = new Set(followingIds.filter((id) => followerIds.includes(id)));

    followingIds.forEach((id) => candidateIds.add(id));
    followerIds.forEach((id) => candidateIds.add(id));

    // Also get recent chat participants
    const recentChats = await Chat.find({ participants: userId })
      .sort({ lastMessageAt: -1 })
      .limit(20)
      .select('participants')
      .lean();

    for (const c of recentChats) {
      for (const p of c.participants) {
        const pid = p.toString();
        if (pid !== userId) candidateIds.add(pid);
      }
    }

    // Also recent message senders
    const since = new Date(Date.now() - 30 * 60_000);
    const recentMsgs = await ChatMessage.find({ createdAt: { $gte: since } })
      .limit(30)
      .select('senderId')
      .lean();

    for (const m of recentMsgs) {
      const sid = (m as any).senderId?.toString();
      if (sid && sid !== userId) candidateIds.add(sid);
    }

    const idsArray = Array.from(candidateIds).slice(0, 50);
    if (idsArray.length === 0) {
      // Fallback: suggest popular/featured active users
      const fallbackUsers = await User.find({ _id: { $ne: userId } })
        .sort({ lastActiveAt: -1, level: -1 })
        .limit(15)
        .select('uid nickname avatar level country lastActiveAt')
        .lean();

      return fallbackUsers.map((u: any) => ({
        _id: u._id.toString(),
        uid: u.uid,
        nickname: u.nickname,
        avatar: u.avatar,
        level: u.level,
        country: u.country,
        online: u.lastActiveAt ? Date.now() - new Date(u.lastActiveAt).getTime() < 10 * 60_000 : false,
        relationship: 'suggested',
      }));
    }

    const userDocs = await User.find({ _id: { $in: idsArray } })
      .select('uid nickname avatar level country lastActiveAt settings')
      .lean();

    let io: any = null;
    try {
      io = getIO();
    } catch {
      // no socket
    }

    const fiveMinutesAgo = Date.now() - 5 * 60_000;

    // Check active live streams for candidates
    const liveStreams = await LiveStream.find({
      hostId: { $in: idsArray },
      status: 'live',
    }).select('_id hostId').lean();

    const liveStreamMap = new Map<string, string>();
    for (const ls of liveStreams) {
      if (ls.hostId) liveStreamMap.set(ls.hostId.toString(), ls._id.toString());
    }

    const result = userDocs.map((u: any) => {
      const uIdStr = u._id.toString();
      const hasSocket = io?.sockets?.adapter?.rooms?.get(`user:${uIdStr}`)?.size > 0;
      const isRecentlyActive = u.lastActiveAt && new Date(u.lastActiveAt).getTime() >= fiveMinutesAgo;
      const showsOnline = u.settings?.privacy?.showOnlineStatus !== false;
      const online = showsOnline ? Boolean(hasSocket || isRecentlyActive) : false;
      const liveStreamId = liveStreamMap.get(uIdStr) || null;

      let relationship: 'friend' | 'follower' | 'following' | 'recent' = 'recent';
      if (friendIdSet.has(uIdStr)) relationship = 'friend';
      else if (followerIds.includes(uIdStr)) relationship = 'follower';
      else if (followingIds.includes(uIdStr)) relationship = 'following';

      return {
        _id: uIdStr,
        uid: u.uid,
        nickname: u.nickname,
        avatar: u.avatar,
        level: u.level,
        country: u.country,
        online,
        liveStreamId,
        relationship,
      };
    });

    // Sort: Live first, then Online (friends & followers first), then others
    result.sort((a, b) => {
      if (a.liveStreamId && !b.liveStreamId) return -1;
      if (!a.liveStreamId && b.liveStreamId) return 1;
      if (a.online && !b.online) return -1;
      if (!a.online && b.online) return 1;
      if (a.relationship === 'friend' && b.relationship !== 'friend') return -1;
      if (a.relationship !== 'friend' && b.relationship === 'friend') return 1;
      return 0;
    });

    return result.slice(0, 30);
  },

  /** Count consecutive days the user has sent messages in a chat */
  async getChatStreak(chatId: string, userId: string) {
    const msgs = await ChatMessage.find({ chatId, senderId: userId })
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean();
    const seen = new Set<string>();
    for (const m of msgs) {
      const d = new Date((m as any).createdAt);
      d.setHours(0, 0, 0, 0);
      seen.add(d.toISOString().split('T')[0]);
    }
    return { streak: seen.size };
  },

  /** Edit a previously sent message */
  async editMessage(chatId: string, messageId: string, userId: string, newText: string) {
    if (!newText || !newText.trim()) throw new AppError('Message cannot be empty', 400);
    const text = newText.trim().slice(0, 2000);

    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) throw new AppError('Chat not found', 404);

    const msg = await ChatMessage.findOne({ _id: messageId, chatId });
    if (!msg) throw new AppError('Message not found', 404);

    if (msg.senderId.toString() !== userId) {
      throw new AppError('You can only edit your own messages', 403);
    }

    if (msg.kind !== 'text') {
      throw new AppError('Only text messages can be edited', 400);
    }

    msg.message = text;
    msg.edited = true;
    msg.editedAt = new Date();
    await msg.save();

    // Check if this was the last message of the chat
    const latest = await ChatMessage.findOne({ chatId }).sort({ createdAt: -1 });
    if (latest && latest._id.toString() === messageId) {
      chat.lastMessage = text;
      await chat.save();
    }

    // Real-time broadcast to participants
    try {
      const io = getIO();
      for (const p of chat.participants) {
        io.to(`user:${p.toString()}`).emit('chat:message_updated', {
          chatId,
          message: msg.toObject(),
        });
      }
    } catch {
      // socket fallback
    }

    return msg;
  },

  /** Delete a single message from the chat */
  async deleteMessage(chatId: string, messageId: string, userId: string) {
    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) throw new AppError('Chat not found', 404);

    const msg = await ChatMessage.findOne({ _id: messageId, chatId });
    if (!msg) throw new AppError('Message not found', 404);

    if (msg.senderId.toString() !== userId) {
      throw new AppError('You can only delete your own messages', 403);
    }

    await ChatMessage.deleteOne({ _id: messageId });

    // Update last message preview in chat
    const newLastMsg = await ChatMessage.findOne({ chatId }).sort({ createdAt: -1 });
    if (newLastMsg) {
      chat.lastMessage =
        newLastMsg.kind === 'gift'
          ? `Sent ${newLastMsg.giftCount || ''} ${newLastMsg.giftName || 'a gift'}`
          : newLastMsg.kind === 'voice'
            ? 'Voice message'
            : newLastMsg.message;
      chat.lastMessageAt = newLastMsg.createdAt;
      chat.lastMessageBy = newLastMsg.senderId as any;
    } else {
      chat.lastMessage = '';
      chat.lastMessageAt = new Date();
    }
    await chat.save();

    // Real-time notification to participants
    try {
      const io = getIO();
      for (const p of chat.participants) {
        io.to(`user:${p.toString()}`).emit('chat:message_deleted', {
          chatId,
          messageId,
          lastMessage: chat.lastMessage,
        });
      }
    } catch {
      // socket fallback
    }

    return { deleted: true, messageId };
  },

  /** Clear all messages from a conversation */
  async clearChat(chatId: string, userId: string) {
    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) throw new AppError('Chat not found', 404);

    await ChatMessage.deleteMany({ chatId });

    chat.lastMessage = '';
    chat.lastMessageAt = new Date();
    await chat.save();

    try {
      const io = getIO();
      for (const p of chat.participants) {
        io.to(`user:${p.toString()}`).emit('chat:cleared', { chatId });
      }
    } catch {
      // socket fallback
    }

    return { cleared: true };
  },

  /** Soft-delete a chat (remove the user from participants — it vanishes from their list) */
  async deleteChat(chatId: string, userId: string) {
    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) throw new AppError('Chat not found', 404);
    await Chat.updateOne({ _id: chatId }, { $pull: { participants: userId as any } });
    return { deleted: true };
  },
};


