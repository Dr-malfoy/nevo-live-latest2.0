import { Server, Socket } from 'socket.io';
import { rouletteService } from '../services/roulette.service';
import { verifyToken } from '../utils/jwt';

const MAX_ACTIONS_PER_WINDOW = 8;
const ACTION_WINDOW_MS = 5000;

// Per-socket abuse throttle: max 8 bet actions per 5 seconds
function makeThrottle() {
  let timestamps: number[] = [];
  return () => {
    const now = Date.now();
    timestamps = timestamps.filter((t) => now - t < ACTION_WINDOW_MS);
    if (timestamps.length >= MAX_ACTIONS_PER_WINDOW) return false;
    timestamps.push(now);
    return true;
  };
}

// Handlers wired onto a single socket. Used both on the /roulette
// namespace and the default namespace (app-user reuses the main socket).
export const registerRouletteSocket = (socket: Socket): void => {
  const allow = makeThrottle();

  socket.on('roulette:join', async (_data: any, ack?: any) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId) return;
      socket.join('roulette:room');
      socket.emit('roulette:state', rouletteService.getState());
      socket.emit('success', 'Joined Roulette');
      if (typeof ack === 'function') ack({ success: true });
    } catch (err: any) {
      socket.emit('error', { message: err?.message || 'Failed to join' });
      if (typeof ack === 'function') ack({ success: false, error: err?.message });
    }
  });

  socket.on('roulette:leave', async (_data: any, ack?: any) => {
    try {
      socket.leave('roulette:room');
      if (typeof ack === 'function') ack({ success: true });
    } catch (err: any) {
      socket.emit('error', { message: err?.message || 'Failed to leave' });
      if (typeof ack === 'function') ack({ success: false, error: err?.message });
    }
  });

  socket.on('roulette:bet', async (data: any, ack?: any) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId) return;
      if (!allow()) {
        throw new Error('Too many actions, slow down');
      }
      const result = await rouletteService.placeBet(userId, {
        currency: data?.currency,
        betType: data?.betType,
        numbers: data?.numbers,
        amount: data?.amount,
      });
      socket.emit('success', 'Bet placed');
      if (typeof ack === 'function') ack({ ...result });
    } catch (err: any) {
      socket.emit('error', { message: err?.message || 'Bet failed' });
      if (err?.message?.includes('balance')) socket.emit('recharge');
      if (typeof ack === 'function') ack({ success: false, error: err?.message });
    }
  });
};

export const registerRouletteHandlers = (io: Server): void => {
  const nsp = io.of('/roulette');

  nsp.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = verifyToken(token);
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  nsp.on('connection', (socket: Socket) => {
    console.log(`[Roulette] Socket connected: ${socket.data.user?.uid || 'anonymous'}`);
    registerRouletteSocket(socket);

    socket.on('disconnect', () => {
      console.log(`[Roulette] Socket disconnected: ${socket.data.user?.uid || 'anonymous'}`);
    });
  });
};
