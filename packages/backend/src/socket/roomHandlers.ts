import { Socket } from 'socket.io';
import { getIO } from '.';
import { User, Gift, Room } from '../models';

export const broadcastViewerCount = async (roomId: string) => {
  try {
    const io = getIO();
    const sockets = await io.in(`room:${roomId}`).fetchSockets();
    const count = Math.max(0, sockets.length); // Should be 0 if no one is left
    io.to(`room:${roomId}`).emit('room:viewer-count', { count });
    await Room.updateOne({ _id: roomId }, { viewerCount: count }).catch(() => {});
  } catch {
    // Ignore error
  }
};

const getUserProfile = async (userId?: string) => {
  if (!userId) return { userId: undefined as string | undefined, nickname: 'Guest', avatar: '', level: 1 };
  const u = await User.findById(userId).select('nickname avatar level').lean();
  return { userId, nickname: u?.nickname || 'Guest', avatar: u?.avatar || '', level: u?.level || 1 };
};

export const registerRoomHandlers = (socket: Socket): void => {
  socket.on('room:join', async ({ roomId, seatIndex }) => {
    if (!roomId || socket.rooms.has(`room:${roomId}`)) return;
    socket.join(`room:${roomId}`);
    const { userId, nickname, avatar, level } = await getUserProfile(socket.data.user?.userId);
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
    await broadcastViewerCount(roomId);
  });

  socket.on('room:leave', async ({ roomId }) => {
    if (!roomId) return;
    socket.leave(`room:${roomId}`);
    socket.to(`room:${roomId}`).emit('room:user-left', {
      userId: socket.data.user?.userId,
    });
    await broadcastViewerCount(roomId);
  });

  socket.on('room:mic-toggle', ({ roomId, enabled }) => {
    if (!roomId) return;
    socket.to(`room:${roomId}`).emit('room:mic-changed', {
      userId: socket.data.user?.userId,
      enabled,
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
};
