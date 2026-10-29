import { Socket } from 'socket.io';
import { getIO } from '.';
import { User, Transaction, LiveStream } from '../models';
import { streamService } from '../services/stream.service';

/** Diamond cost of a highlighted (SMS) message in the live chat. */
const HIGHLIGHT_COST = 100;

/** Max length of a live chat message (prevent abuse). */
const MAX_MESSAGE_LENGTH = 500;

import { calculateWealthLevel, calculateLiveLevel } from '../utils/userLevels';

/**
 * The JWT carries no profile fields (only userId/uid/role), so display
 * identity must be resolved from the DB — otherwise nickname/avatar are
 * undefined and every receiving client crashes on render.
 */
const getUserProfile = async (userId?: string) => {
  if (!userId) return { userId: undefined as string | undefined, nickname: 'Guest', avatar: '', level: 1, wealthLevel: 1, liveLevel: 1, isVip: false, diamonds: 0, coins: 0 };
  const u = await User.findById(userId).select('nickname avatar level wealthLevel liveLevel wealthExp liveStreamSeconds liveStreamMinutes isVip hasPurchasedDiamonds noble diamonds coins').lean();
  const isVip = Boolean(u?.isVip || u?.hasPurchasedDiamonds || u?.noble || (u?.diamonds && u.diamonds > 0));
  const wealthExp = Math.max(u?.wealthExp || 0, (u?.coins || 0) + (u?.diamonds || 0));
  const wealthLevel = u?.wealthLevel && u.wealthLevel > 1 ? u.wealthLevel : calculateWealthLevel(wealthExp, u?.level).level;
  const liveStreamSeconds = u?.liveStreamSeconds || 0;
  const liveStreamMinutes = u?.liveStreamMinutes || Math.floor(liveStreamSeconds / 60);
  const liveLevel = u?.liveLevel && u.liveLevel > 1 ? u.liveLevel : calculateLiveLevel(liveStreamMinutes, u?.level).level;
  const level = u?.level && u.level > 1 ? u.level : Math.max(wealthLevel, liveLevel, 1);
  return {
    userId,
    nickname: u?.nickname || 'Guest',
    avatar: u?.avatar || '',
    level,
    wealthLevel,
    liveLevel,
    isVip,
    diamonds: u?.diamonds || 0,
    coins: u?.coins || 0,
  };
};

export interface StreamGifter {
  userId: string;
  nickname: string;
  avatar: string;
  totalGifts: number;
}

export interface StreamSpeaker {
  userId: string;
  nickname: string;
  avatar: string;
  isMuted: boolean;
  approvedAt: Date;
}

// In-memory stream tracking for live sessions
const streamGiftersMap = new Map<string, Map<string, StreamGifter>>();
const streamSpeakersMap = new Map<string, Map<string, StreamSpeaker>>();
const streamLikesMap = new Map<string, Set<string>>();

const getTopGifters = (streamId: string): StreamGifter[] => {
  const gifters = streamGiftersMap.get(streamId);
  if (!gifters) return [];
  return Array.from(gifters.values())
    .sort((a, b) => b.totalGifts - a.totalGifts)
    .slice(0, 5);
};

const getSpeakers = (streamId: string): StreamSpeaker[] => {
  const speakers = streamSpeakersMap.get(streamId);
  if (!speakers) return [];
  return Array.from(speakers.values());
};

export const cleanupStreamUser = (streamId: string, userId: string) => {
  const speakers = streamSpeakersMap.get(streamId);
  if (speakers && speakers.has(userId)) {
    speakers.delete(userId);
    try {
      getIO().to(`stream:${streamId}`).emit('stream:speakers-update', {
        streamId,
        speakers: getSpeakers(streamId),
      });
    } catch {}
  }
};

export const registerStreamHandlers = (socket: Socket): void => {
  socket.on('stream:join', async ({ streamId }) => {
    const { userId, nickname, avatar, level, wealthLevel, liveLevel, isVip, diamonds, coins } = await getUserProfile(socket.data.user?.userId);
    socket.join(`stream:${streamId}`);

    const currentStream = await LiveStream.findById(streamId).select('viewerCount').lean();
    const count = Math.max(0, currentStream?.viewerCount ?? 0);

    getIO().to(`stream:${streamId}`).emit('stream:viewer-count', { count });
    socket.to(`stream:${streamId}`).emit('stream:viewer-joined', {
      userId,
      nickname,
      avatar,
      level,
      wealthLevel,
      liveLevel,
      isVip,
      diamonds,
      coins,
      viewerCount: count,
      peerSocketId: socket.id,
    });

    // Provide the current Top 5 gifters and active speakers to the user
    socket.emit('stream:top-gifters', {
      streamId,
      topGifters: getTopGifters(streamId),
    });
    socket.emit('stream:speakers-update', {
      streamId,
      speakers: getSpeakers(streamId),
    });
    const currentLikes = streamLikesMap.get(streamId);
    if (currentLikes) {
      socket.emit('stream:like-count', {
        streamId,
        count: currentLikes.size,
      });
    }
  });

  socket.on('stream:leave', async ({ streamId }) => {
    socket.leave(`stream:${streamId}`);
    // Idempotent per-viewer decrement so closing/leaving is reflected in the count.
    const userId = socket.data.user?.userId;
    if (userId) {
      await streamService.leaveStream(streamId, userId).catch(() => {});
      cleanupStreamUser(streamId, userId);
    }

    const currentStream = await LiveStream.findById(streamId).select('viewerCount').lean();
    const count = Math.max(0, currentStream?.viewerCount ?? 0);

    getIO().to(`stream:${streamId}`).emit('stream:viewer-count', { count });
    socket.to(`stream:${streamId}`).emit('stream:viewer-left', {
      userId,
      viewerCount: count,
    });
  });

  // WebRTC P2P fallback signaling relays (when Agora is offline / dev mode & PK battle)
  socket.on('stream:signal:request-stream', ({ streamId }) => {
    getIO().to(`stream:${streamId}`).emit('stream:signal:peer-joined', {
      peerSocketId: socket.id,
      peerUserId: socket.data.user?.userId,
      streamId,
    });
  });

  socket.on('stream:signal:offer', ({ toSocketId, offer, streamId }) => {
    if (toSocketId) {
      getIO().to(toSocketId).emit('stream:signal:offer', {
        fromSocketId: socket.id,
        offer,
        streamId,
      });
    }
  });

  socket.on('stream:signal:answer', ({ toSocketId, answer, streamId }) => {
    if (toSocketId) {
      getIO().to(toSocketId).emit('stream:signal:answer', {
        fromSocketId: socket.id,
        answer,
        streamId,
      });
    }
  });

  socket.on('stream:signal:candidate', ({ toSocketId, candidate, streamId }) => {
    if (toSocketId) {
      getIO().to(toSocketId).emit('stream:signal:candidate', {
        fromSocketId: socket.id,
        candidate,
        streamId,
      });
    }
  });

  // Host ends the stream from the room — flips status server-side (authoritative).
  socket.on('stream:ended', async ({ streamId }, ack) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId || !streamId) return;
      await streamService.endStream(streamId, userId);
      getIO().to(`stream:${streamId}`).emit('stream:ended', { streamId });
      streamSpeakersMap.delete(streamId);
      streamGiftersMap.delete(streamId);
      streamLikesMap.delete(streamId);
      if (typeof ack === 'function') ack?.({ success: true });
    } catch {
      if (typeof ack === 'function') ack?.({ success: false });
    }
  });

  socket.on('stream:chat', async ({ streamId, message }) => {
    const { userId, nickname, avatar, level, wealthLevel, liveLevel } = await getUserProfile(socket.data.user?.userId);
    // Emit to the whole room (including sender) so everyone, including the
    // sender, sees the message immediately.
    getIO().to(`stream:${streamId}`).emit('stream:chat-received', {
      userId,
      nickname,
      avatar,
      level,
      wealthLevel,
      liveLevel,
      message: String(message ?? '').trim().slice(0, MAX_MESSAGE_LENGTH),
    });
  });

  socket.on('stream:gift', async ({ streamId, gift, count, receiverId }) => {
    const { userId, nickname, avatar, level, wealthLevel, liveLevel } = await getUserProfile(socket.data.user?.userId);
    if (!streamId) return;

    // Track total gift value for ranking in this stream
    if (userId) {
      if (!streamGiftersMap.has(streamId)) {
        streamGiftersMap.set(streamId, new Map());
      }
      const gifters = streamGiftersMap.get(streamId)!;
      const existing = gifters.get(userId) || {
        userId,
        nickname,
        avatar,
        totalGifts: 0,
      };
      const giftValue = (Number(gift?.priceDiamonds) || Number(gift?.priceCoins) || 1) * (Number(count) || 1);
      existing.totalGifts += giftValue;
      existing.nickname = nickname;
      existing.avatar = avatar;
      gifters.set(userId, existing);
    }

    // Emit to the whole room (including sender) so the sender sees their own
    // gift message + burst, and the host sees the gift.
    getIO().to(`stream:${streamId}`).emit('stream:gift-received', {
      userId,
      nickname,
      avatar,
      level,
      wealthLevel,
      liveLevel,
      gift,
      count,
      receiverId,
    });

    // Broadcast updated Top 5 gifters to the room
    getIO().to(`stream:${streamId}`).emit('stream:top-gifters', {
      streamId,
      topGifters: getTopGifters(streamId),
    });

    // If stream is participating in an active PK battle, credit score to corresponding side!
    try {
      const { PkBattle } = await import('../models/PkBattle');
      const activeBattle = await PkBattle.findOne({
        $or: [{ streamIdA: streamId }, { streamIdB: streamId }],
        status: 'active',
      });
      if (activeBattle) {
        const giftPoints = (Number(gift?.priceDiamonds) || Number(gift?.priceCoins) || 1) * (Number(count) || 1);
        const isTargetHostB = receiverId && activeBattle.teamB.some((t: any) => t.toString() === receiverId);
        const targetSide = isTargetHostB || activeBattle.streamIdB?.toString() === streamId ? 'B' : 'A';

        const { pkService } = await import('../services/pk.service');
        await pkService.addLivePkScore({
          battleId: activeBattle._id.toString(),
          targetSide,
          amount: giftPoints,
          senderName: nickname,
          senderAvatar: avatar,
          giftName: gift?.name || 'Gift',
          giftIcon: gift?.icon || '🎁',
        });
      }
    } catch (e) {
      console.warn('[streamHandlers] pk score auto-update error:', e);
    }
  });

  // Viewer requests microphone access from the host
  socket.on('stream:mic:request', async ({ streamId }) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId || !streamId) return;

      const stream = await LiveStream.findById(streamId).select('hostId').lean();
      if (!stream) return;

      const profile = await getUserProfile(userId);

      // Emit to the stream room (host handles this)
      getIO().to(`stream:${streamId}`).emit('stream:mic:requested', {
        streamId,
        hostId: stream.hostId.toString(),
        requester: {
          userId,
          nickname: profile.nickname,
          avatar: profile.avatar,
          level: profile.level,
        },
      });
    } catch (err) {
      console.error('[streamHandlers] stream:mic:request error:', err);
    }
  });

  // Host responds to the mic request (accept or decline)
  socket.on('stream:mic:respond', async (payload: any) => {
    try {
      const streamId = payload?.streamId;
      const requesterUserId = payload?.requesterUserId || payload?.requesterId;
      const isApproved = payload?.approved === true || payload?.approve === true || payload?.action === 'accept';
      const hostUserId = socket.data.user?.userId;

      if (!hostUserId || !streamId || !requesterUserId) {
        console.warn('[streamHandlers] stream:mic:respond missing parameters:', { hostUserId, streamId, requesterUserId });
        return;
      }

      const stream = await LiveStream.findById(streamId).select('hostId').lean();
      if (!stream) return;

      const streamHostId = typeof stream.hostId === 'object' && stream.hostId !== null
        ? ((stream.hostId as any)._id?.toString() || stream.hostId.toString())
        : String(stream.hostId);

      if (streamHostId !== String(hostUserId)) {
        console.warn('[streamHandlers] stream:mic:respond unauthorized:', { streamHostId, hostUserId });
        return;
      }

      if (isApproved) {
        if (!streamSpeakersMap.has(streamId)) {
          streamSpeakersMap.set(streamId, new Map());
        }
        const speakers = streamSpeakersMap.get(streamId)!;
        const profile = await getUserProfile(requesterUserId);

        speakers.set(requesterUserId, {
          userId: requesterUserId,
          nickname: profile.nickname,
          avatar: profile.avatar,
          isMuted: false,
          approvedAt: new Date(),
        });

        // Notify the viewer directly and the room
        getIO().to(`user:${requesterUserId}`).emit('stream:mic:response', {
          streamId,
          requesterUserId,
          approved: true,
          message: 'The host accepted your speak request!',
        });

        getIO().to(`stream:${streamId}`).emit('stream:mic:response', {
          streamId,
          requesterUserId,
          approved: true,
          message: 'The host accepted your speak request!',
        });

        getIO().to(`stream:${streamId}`).emit('stream:speakers-update', {
          streamId,
          speakers: getSpeakers(streamId),
        });

        // Broadcast announcement in chat
        getIO().to(`stream:${streamId}`).emit('stream:chat-received', {
          userId: 'system',
          nickname: 'System',
          avatar: '',
          message: `🎙️ ${profile.nickname} has been approved to speak!`,
        });
      } else {
        // Declined
        getIO().to(`user:${requesterUserId}`).emit('stream:mic:response', {
          streamId,
          requesterUserId,
          approved: false,
          message: 'The host declined your speak request.',
        });

        getIO().to(`stream:${streamId}`).emit('stream:mic:response', {
          streamId,
          requesterUserId,
          approved: false,
          message: 'The host declined your speak request.',
        });
      }
    } catch (err) {
      console.error('[streamHandlers] stream:mic:respond error:', err);
    }
  });

  // Speaker or Host toggles microphone mute/unmute
  socket.on('stream:mic:toggle', async ({ streamId, isMuted, targetUserId }) => {
    const currentUserId = socket.data.user?.userId;
    if (!currentUserId || !streamId) return;

    const stream = await LiveStream.findById(streamId).select('hostId').lean();
    const streamHostId = typeof stream?.hostId === 'object' && stream?.hostId !== null
      ? ((stream.hostId as any)._id?.toString() || stream.hostId.toString())
      : String(stream?.hostId);

    const isHost = streamHostId === String(currentUserId);
    const effectiveUserId = (isHost && targetUserId) ? String(targetUserId) : String(currentUserId);

    const speakers = streamSpeakersMap.get(streamId);
    if (speakers && speakers.has(effectiveUserId)) {
      const sp = speakers.get(effectiveUserId)!;
      sp.isMuted = !!isMuted;
      speakers.set(effectiveUserId, sp);

      // If host muted another user, instruct that user's client to force-mute their local microphone
      if (isHost && targetUserId && targetUserId !== currentUserId) {
        getIO().to(`user:${targetUserId}`).emit('stream:mic:force-mute', {
          streamId,
          targetUserId,
          isMuted: !!isMuted,
        });
        getIO().to(`stream:${streamId}`).emit('stream:mic:force-mute', {
          streamId,
          targetUserId,
          isMuted: !!isMuted,
        });
      }

      getIO().to(`stream:${streamId}`).emit('stream:speakers-update', {
        streamId,
        speakers: getSpeakers(streamId),
      });
    }
  });

  // Host mutes or removes speaker from microphone
  socket.on('stream:mic:kick', async ({ streamId, targetUserId }) => {
    const currentUserId = socket.data.user?.userId;
    if (!currentUserId || !streamId || !targetUserId) return;

    const stream = await LiveStream.findById(streamId).select('hostId').lean();
    const streamHostId = typeof stream?.hostId === 'object' && stream?.hostId !== null
      ? ((stream.hostId as any)._id?.toString() || stream.hostId.toString())
      : String(stream?.hostId);

    const isHost = streamHostId === String(currentUserId);
    if (!isHost && currentUserId !== targetUserId) {
      return;
    }

    const speakers = streamSpeakersMap.get(streamId);
    if (speakers) {
      speakers.delete(targetUserId);

      getIO().to(`user:${targetUserId}`).emit('stream:mic:kicked', {
        streamId,
        targetUserId,
        message: 'You have left the microphone.',
      });

      getIO().to(`stream:${streamId}`).emit('stream:mic:kicked', {
        streamId,
        targetUserId,
        message: 'You have left the microphone.',
      });

      getIO().to(`stream:${streamId}`).emit('stream:speakers-update', {
        streamId,
        speakers: getSpeakers(streamId),
      });
    }
  });

  socket.on('stream:highlight', async ({ streamId, message }, ack) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId) return ack?.({ success: false, error: 'Not authenticated' });
      if (!message || !String(message).trim()) return ack?.({ success: false, error: 'Message is required' });

      // Atomic diamond deduction — prevents double-spend on rapid taps
      const updated = await User.findOneAndUpdate(
        { _id: userId, diamonds: { $gte: HIGHLIGHT_COST } },
        { $inc: { diamonds: -HIGHLIGHT_COST } },
        { new: true }
      );
      if (!updated) return ack?.({ success: false, error: 'Insufficient diamonds' });

      // Ledger entry (audit trail)
      await Transaction.create({
        userId,
        type: 'highlight',
        amount: HIGHLIGHT_COST,
        currency: 'diamond',
        targetId: streamId,
        targetModel: 'User',
        status: 'completed',
        description: `Highlighted message in live stream`,
      }).catch(() => {});

      // Real-time balance sync to the sender's other devices
      try {
        getIO().to(`user:${userId}`).emit('balance:update', {
          diamonds: updated.diamonds,
        });
      } catch {
        // socket not initialized
      }

      const { nickname, avatar } = await getUserProfile(userId);

      // Broadcast the highlight to the whole room
      getIO().to(`stream:${streamId}`).emit('stream:highlight-received', {
        userId,
        nickname,
        avatar,
        message: String(message).trim().slice(0, MAX_MESSAGE_LENGTH),
      });

      ack?.({ success: true, senderBalance: updated.diamonds });
    } catch (err: any) {
      ack?.({ success: false, error: err?.message || 'Failed to highlight message' });
    }
  });

  socket.on('stream:like', async ({ streamId, nickname: clientNickname, avatar: clientAvatar }: any) => {
    if (!streamId) return;

    if (!streamLikesMap.has(streamId)) {
      streamLikesMap.set(streamId, new Set<string>());
    }
    const likesSet = streamLikesMap.get(streamId)!;

    const rawUserId = socket.data.user?.userId;
    const userKey = rawUserId ? String(rawUserId) : (socket.id || clientNickname || 'anonymous');

    // "ekjon user bar bar love delew 1 bar e count hbe"
    // Only counted once per user in this stream
    const isFirstLike = !likesSet.has(userKey);
    if (isFirstLike) {
      likesSet.add(userKey);
    }

    let nickname = clientNickname || 'Someone';
    let avatar = clientAvatar || '';

    if (rawUserId) {
      try {
        const u = await getUserProfile(rawUserId);
        if (u.nickname && u.nickname !== 'Guest') nickname = u.nickname;
        if (u.avatar) avatar = u.avatar;
      } catch {}
    }

    // Real-time reaction count — broadcast to the whole room so the host sees
    // every viewer's like (and the sender sees their own).
    getIO().to(`stream:${streamId}`).emit('stream:like-received', {
      userId: rawUserId,
      nickname,
      avatar,
      isCounted: isFirstLike,
      totalLikes: likesSet.size,
    });
  });

  // ── LIVE PK BATTLE SOCKET EVENTS ──────────────────────────────────
  socket.on('pk:live:invite:send', async (data: any) => {
    try {
      const inviterId = socket.data.user?.userId;
      if (!inviterId || !data?.inviterStreamId || !data?.targetHostId) return;
      const { pkService } = await import('../services/pk.service');
      await pkService.inviteLivePk({
        inviterId,
        inviterStreamId: data.inviterStreamId,
        targetHostId: data.targetHostId,
        targetStreamId: data.targetStreamId,
        durationMinutes: Number(data.durationMinutes) || 3,
      });
    } catch (e: any) {
      socket.emit('pk:live:error', { message: e?.message || 'Failed to send PK invitation' });
    }
  });

  socket.on('pk:live:invite:respond', async (data: any) => {
    try {
      const responderId = socket.data.user?.userId;
      if (!responderId || !data?.battleId) return;
      const { pkService } = await import('../services/pk.service');
      await pkService.respondLivePk({
        battleId: data.battleId,
        responderId,
        accept: Boolean(data.accept),
      });
    } catch (e: any) {
      socket.emit('pk:live:error', { message: e?.message || 'Failed to respond to PK invitation' });
    }
  });

  socket.on('pk:live:battle:end', async (data: any) => {
    try {
      if (!data?.battleId) return;
      const { pkService } = await import('../services/pk.service');
      await pkService.endLivePk(data.battleId);
    } catch (e: any) {
      console.warn('[streamHandlers] pk end error:', e);
    }
  });
};
