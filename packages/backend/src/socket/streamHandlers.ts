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
  const u = await User.findById(userId).select('nickname avatar level wealthLevel liveLevel isVip hasPurchasedDiamonds noble diamonds coins').lean();
  const isVip = Boolean(u?.isVip || u?.hasPurchasedDiamonds || u?.noble || (u?.diamonds && u.diamonds > 0));
  const wealthLevel = u?.wealthLevel && u.wealthLevel > 1 ? u.wealthLevel : calculateWealthLevel(u?.diamonds, u?.level).level;
  const liveLevel = u?.liveLevel && u.liveLevel > 1 ? u.liveLevel : calculateLiveLevel(u?.coins, u?.level).level;
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
  });

  socket.on('stream:leave', async ({ streamId }) => {
    socket.leave(`stream:${streamId}`);
    // Idempotent per-viewer decrement so closing/leaving is reflected in the count.
    const userId = socket.data.user?.userId;
    if (userId) await streamService.leaveStream(streamId, userId).catch(() => {});

    const currentStream = await LiveStream.findById(streamId).select('viewerCount').lean();
    const count = Math.max(0, currentStream?.viewerCount ?? 0);

    getIO().to(`stream:${streamId}`).emit('stream:viewer-count', { count });
    socket.to(`stream:${streamId}`).emit('stream:viewer-left', {
      userId,
      viewerCount: count,
    });
  });

  // WebRTC P2P fallback signaling relays (when Agora is offline / dev mode)
  socket.on('stream:signal:request-stream', ({ streamId }) => {
    socket.to(`stream:${streamId}`).emit('stream:signal:peer-joined', {
      peerSocketId: socket.id,
      peerUserId: socket.data.user?.userId,
    });
  });

  socket.on('stream:signal:offer', ({ toSocketId, offer }) => {
    if (toSocketId) {
      getIO().to(toSocketId).emit('stream:signal:offer', {
        fromSocketId: socket.id,
        offer,
      });
    }
  });

  socket.on('stream:signal:answer', ({ toSocketId, answer }) => {
    if (toSocketId) {
      getIO().to(toSocketId).emit('stream:signal:answer', {
        fromSocketId: socket.id,
        answer,
      });
    }
  });

  socket.on('stream:signal:candidate', ({ toSocketId, candidate }) => {
    if (toSocketId) {
      getIO().to(toSocketId).emit('stream:signal:candidate', {
        fromSocketId: socket.id,
        candidate,
      });
    }
  });

  // Host ends the stream from the room — flips status server-side (authoritative).
  socket.on('stream:ended', async ({ streamId }, ack) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId || !streamId) return;
      await streamService.endStream(streamId, userId);
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

  socket.on('stream:gift', async ({ streamId, gift, count }) => {
    const { userId, nickname, avatar, level, wealthLevel, liveLevel } = await getUserProfile(socket.data.user?.userId);
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
    });
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

  socket.on('stream:like', ({ streamId }) => {
    // Real-time reaction count — broadcast to the whole room so the host sees
    // every viewer's like (and the sender sees their own).
    getIO().to(`stream:${streamId}`).emit('stream:like-received', {
      userId: socket.data.user?.userId,
    });
  });
};
