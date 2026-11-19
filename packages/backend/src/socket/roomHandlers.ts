import { Socket } from 'socket.io';
import { getIO } from '.';
import { User, Gift, Room } from '../models';

export const broadcastViewerCount = async (roomId: string) => {
  try {
    const io = getIO();
    const sockets = await io.in(`room:${roomId}`).fetchSockets();
    const count = sockets.length;
    io.to(`room:${roomId}`).emit('room:viewer-count', { count });
    await Room.updateOne({ _id: roomId }, { viewerCount: count }).catch(() => {});
    return count;
  } catch {
    return 0;
  }
};

const getUserProfile = async (userId?: string) => {
  if (!userId) return { userId: undefined as string | undefined, nickname: 'Guest', avatar: '', level: 1 };
  const u = await User.findById(userId).select('nickname avatar level').lean();
  return { userId, nickname: u?.nickname || 'Guest', avatar: u?.avatar || '', level: u?.level || 1 };
};

const roomRecentJoinsMap = new Map<string, number>();

setInterval(() => {
  const cutoff = Date.now() - 30000;
  for (const [key, ts] of roomRecentJoinsMap.entries()) {
    if (ts < cutoff) roomRecentJoinsMap.delete(key);
  }
}, 300000);

export const registerRoomHandlers = (socket: Socket): void => {
  socket.on('room:join', async ({ roomId, seatIndex }) => {
    if (!roomId) return;
    socket.join(`room:${roomId}`);
    const { userId, nickname, avatar, level } = await getUserProfile(socket.data.user?.userId);

    const joinKey = `${userId || socket.id}:${roomId}`;
    const now = Date.now();
    const lastJoin = roomRecentJoinsMap.get(joinKey) || 0;
    const isDuplicate = now - lastJoin < 3500;
    roomRecentJoinsMap.set(joinKey, now);

    if (!isDuplicate) {
      socket.to(`room:${roomId}`).emit('room:user-joined', {
        seatIndex,
        user: {
          userId,
          nickname,
          avatar,
          level,
        },
        nickname,
        level,
      });
    }
    const count = await broadcastViewerCount(roomId);
    socket.emit('room:viewer-count', { count });
  });

  socket.on('room:leave', async ({ roomId }) => {
    if (!roomId) return;
    socket.leave(`room:${roomId}`);
    socket.to(`room:${roomId}`).emit('room:user-left', {
      userId: socket.data.user?.userId,
    });
    await broadcastViewerCount(roomId);
  });

  socket.on('room:mic-toggle', async ({ roomId, enabled }) => {
    if (!roomId) return;
    const userId = socket.data.user?.userId;
    if (!userId) return;

    if (enabled) {
      try {
        const room = await Room.findById(roomId).select('ownerId seats').lean();
        if (room) {
          const isHost = room.ownerId.toString() === userId;
          const isSeated = room.seats.some(
            (s) => s.userId && s.userId.toString() === userId && !s.isMuted
          );
          if (!isHost && !isSeated) {
            // User is not on a seat or their seat is muted! Deny mic.
            socket.emit('room:mic-changed', { userId, enabled: false });
            return;
          }
        }
      } catch (e) {
        console.warn('[roomHandlers] mic-toggle validation error:', e);
      }
    }

    socket.to(`room:${roomId}`).emit('room:mic-changed', {
      userId,
      enabled: Boolean(enabled),
    });
  });

  socket.on('room:chat', async ({ roomId, message }) => {
    if (!roomId || !message) return;
    const { userId, nickname, avatar, level } = await getUserProfile(socket.data.user?.userId);
    const payload = {
      userId,
      nickname,
      avatar,
      level,
      message: String(message).slice(0, 500),
    };
    getIO().to(`room:${roomId}`).emit('room:chat-message', payload);
  });

  socket.on('room:message', async ({ roomId, message }) => {
    if (!roomId || !message) return;
    const { userId, nickname, avatar, level } = await getUserProfile(socket.data.user?.userId);
    const payload = {
      userId,
      nickname,
      avatar,
      level,
      message: String(message).slice(0, 500),
    };
    getIO().to(`room:${roomId}`).emit('room:message', payload);
  });

  socket.on('room:gift', async ({ roomId, giftId, receiverId, count = 1 }) => {
    if (!roomId || !giftId) return;
    try {
      const gift = await Gift.findById(giftId);
      const { userId, nickname, avatar } = await getUserProfile(socket.data.user?.userId);
      if (gift) {
         getIO().to(`room:${roomId}`).emit('room:gift', {
           senderId: userId,
           senderName: nickname,
           avatar,
           receiverId,
           count: count || 1,
           gift: {
             _id: gift._id,
             name: gift.name,
             icon: gift.icon,
             priceDiamonds: gift.priceDiamonds,
             animation: gift.animation,
           },
         });
      }
    } catch (err) {
      console.error('room:gift error:', err);
    }
  });

  // User requests to sit on a locked seat
  socket.on('room:seat:request', async ({ roomId, seatIndex }) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId || !roomId || !seatIndex) return;

      const room = await Room.findById(roomId).select('ownerId seats status').lean();
      if (!room || room.status !== 'active') return;

      const profile = await getUserProfile(userId);

      // Emit to room (the host will receive this and show the request banner)
      getIO().to(`room:${roomId}`).emit('room:seat:requested', {
        roomId,
        hostId: room.ownerId.toString(),
        seatIndex: Number(seatIndex),
        requester: {
          userId,
          nickname: profile.nickname,
          avatar: profile.avatar,
          level: profile.level,
        },
      });
    } catch (err) {
      console.error('[roomHandlers] room:seat:request error:', err);
    }
  });

  // Host responds to the seat request (accept or reject)
  socket.on('room:seat:respond', async (payload: any) => {
    try {
      const roomId = payload?.roomId;
      const seatIndex = Number(payload?.seatIndex);
      const requesterUserId = payload?.requesterUserId || payload?.requesterId;
      const isApproved = payload?.approved === true || payload?.action === 'accept';
      const hostUserId = socket.data.user?.userId;

      if (!hostUserId || !roomId || !seatIndex || !requesterUserId) {
        return;
      }

      const room = await Room.findById(roomId);
      if (!room || room.status !== 'active') return;

      const hostId = room.ownerId.toString();
      if (hostId !== String(hostUserId)) {
        console.warn('[roomHandlers] room:seat:respond unauthorized by', hostUserId);
        return;
      }

      const profile = await getUserProfile(requesterUserId);

      if (isApproved) {
        const seat = room.seats.find((s) => s.index === seatIndex);
        if (seat) {
          // If seat already occupied by someone else, inform requester
          if (seat.userId && seat.userId.toString() !== String(requesterUserId)) {
            getIO().to(`user:${requesterUserId}`).emit('room:seat:response', {
              roomId,
              seatIndex,
              requesterUserId,
              approved: false,
              message: `Seat ${seatIndex} was already occupied.`,
            });
            return;
          }

          // Remove user from any other seat in this room
          room.seats.forEach((s) => {
            if (s.userId?.toString() === String(requesterUserId)) {
              s.userId = undefined;
            }
          });

          seat.userId = requesterUserId as any;
          await room.save();

          const populated = await room.populate('seats.userId', 'uid nickname avatar');
          getIO().to(`room:${roomId}`).emit('room:seat:update', {
            roomId,
            seats: populated.seats,
          });

          // Notify directly and room
          getIO().to(`user:${requesterUserId}`).emit('room:seat:response', {
            roomId,
            seatIndex,
            requesterUserId,
            approved: true,
            message: `Host accepted your request to sit on Seat ${seatIndex}!`,
          });

          getIO().to(`room:${roomId}`).emit('room:seat:response', {
            roomId,
            seatIndex,
            requesterUserId,
            approved: true,
            message: `Host accepted ${profile.nickname}'s request to sit on Seat ${seatIndex}`,
          });
        }
      } else {
        // Declined
        getIO().to(`user:${requesterUserId}`).emit('room:seat:response', {
          roomId,
          seatIndex,
          requesterUserId,
          approved: false,
          message: `Host declined your request to sit on Seat ${seatIndex}.`,
        });

        getIO().to(`room:${roomId}`).emit('room:seat:response', {
          roomId,
          seatIndex,
          requesterUserId,
          approved: false,
          message: `Host declined Seat ${seatIndex} request.`,
        });
      }
    } catch (err) {
      console.error('[roomHandlers] room:seat:respond error:', err);
    }
  });
};
