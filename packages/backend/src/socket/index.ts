import { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { verifyToken } from '../utils/jwt';
import { registerStreamHandlers } from './streamHandlers';
import { registerRoomHandlers, broadcastViewerCount } from './roomHandlers';
import { registerChatHandlers } from './chatHandlers';
import { registerCallHandlers } from './callHandlers';
import { registerMatchHandlers } from './matchHandlers';
import { registerTeenPattiHandlers, registerTeenPattiSocket } from './teenpattiHandlers';
import { registerRouletteHandlers, registerRouletteSocket } from './rouletteHandlers';
import { registerAviatorHandlers, registerAviatorSocket } from './aviatorHandlers';
import { streamService } from '../services/stream.service';

let io: Server;

const clintURLs: (string | RegExp)[] = [
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  "https://nevo-live-latest.onrender.com",
  "https://nevo-live.onrender.com",
  "https://nevo-live-app-user.onrender.com",
  "https://nevo-live-app-admin.onrender.com",
  "https://nevo-live-app-agent.onrender.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^https:\/\/.*\.onrender\.com$/,
];

export const initSocket = (httpServer: HTTPServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = clintURLs.some((pattern) =>
          typeof pattern === 'string' ? pattern === origin : pattern.test(origin)
        );
        if (
          allowed ||
          origin.startsWith('capacitor://') ||
          origin.startsWith('http://localhost') ||
          origin.startsWith('https://localhost') ||
          origin.endsWith('.onrender.com') ||
          process.env.NODE_ENV !== 'production'
        ) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = verifyToken(token);
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.data.user?.uid || 'anonymous'}`);

    // Join per-user room for notifications
    if (socket.data.user?.userId) {
      socket.join(`user:${socket.data.user.userId}`);
    }

    registerStreamHandlers(socket);
    registerRoomHandlers(socket);
    registerChatHandlers(socket);
    registerCallHandlers(socket);
    registerMatchHandlers(socket);
    registerTeenPattiSocket(socket);
    registerRouletteSocket(socket);
    registerAviatorSocket(socket);

    socket.on('disconnecting', () => {
      console.log(`Socket disconnecting: ${socket.data.user?.uid || 'anonymous'}`);
      const userId = socket.data.user?.userId;
      for (const room of socket.rooms) {
        if (room.startsWith('stream:')) {
          const streamId = room.slice('stream:'.length);
          if (userId && streamId) {
            streamService.leaveStream(streamId, userId).then(async () => {
              const currentStream = await import('../models').then(m => m.LiveStream.findById(streamId).select('viewerCount').lean());
              const count = Math.max(0, currentStream?.viewerCount ?? 0);
              socket.to(room).emit('stream:viewer-count', { count });
              socket.to(room).emit('stream:viewer-left', { userId, viewerCount: count });
            }).catch(() => {});
          }
        } else if (room.startsWith('room:')) {
          const roomId = room.slice('room:'.length);
          // Small timeout ensures the socket is removed from room before we fetch sockets
          setTimeout(() => {
            broadcastViewerCount(roomId).catch(() => {});
          }, 100);
        }
      }
    });
  });

  registerTeenPattiHandlers(io);
  registerRouletteHandlers(io);
  registerAviatorHandlers(io);

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};
