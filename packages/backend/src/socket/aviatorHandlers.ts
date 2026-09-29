import { Server, Socket } from 'socket.io';
import { aviatorService } from '../services/aviator.service';
import { verifyToken } from '../utils/jwt';

const MAX_ACTIONS_PER_WINDOW = 8;
const ACTION_WINDOW_MS = 5000;

// Per-socket abuse throttle: max 8 bet/cash-out actions per 5 seconds
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

// Handlers wired onto a single socket. Used both on the /aviator
// namespace and the default namespace (app-user reuses the main socket).
export const registerAviatorSocket = (socket: Socket): void => {
  const allow = makeThrottle();

  socket.on('aviator:join', async (_data: any, ack?: any) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId) return;
      socket.join('aviator:room');
      socket.emit('aviator:state', aviatorService.getState());
      socket.emit('aviator:history', await aviatorService.getHistoryNumbers());
      socket.emit('success', 'Joined Aviator');
      if (typeof ack === 'function') ack({ success: true });
    } catch (err: any) {
      socket.emit('error', { message: err?.message || 'Failed to join' });
      if (typeof ack === 'function') ack({ success: false, error: err?.message });
    }
  });

  socket.on('aviator:leave', async (_data: any, ack?: any) => {
    try {
      socket.leave('aviator:room');
      if (typeof ack === 'function') ack({ success: true });
    } catch (err: any) {
      socket.emit('error', { message: err?.message || 'Failed to leave' });
      if (typeof ack === 'function') ack({ success: false, error: err?.message });
    }
  });

  socket.on('aviator:bet', async (data: any, ack?: any) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId) return;
      if (!allow()) {
        throw new Error('Too many actions, slow down');
      }
      const result = await aviatorService.placeBet(userId, {
        betAmount: data?.betAmount,
        target: data?.target,
        currency: data?.currency,
      });
      socket.emit('success', 'Bet placed');
      if (typeof ack === 'function') ack({ ...result });
    } catch (err: any) {
      socket.emit('error', { message: err?.message || 'Bet failed' });
      if (err?.message?.includes('balance')) socket.emit('recharge');
      if (typeof ack === 'function') ack({ success: false, error: err?.message });
    }
  });

  socket.on('aviator:cashOut', async (_data: any, ack?: any) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId) return;
      if (!allow()) {
        throw new Error('Too many actions, slow down');
      }
      const result = await aviatorService.cashOut(userId);
      socket.emit('success', `Cashed out at ${result.cashOutAt}x — won ${result.winAmount}`);
      if (typeof ack === 'function') ack({ ...result, success: true });
    } catch (err: any) {
      socket.emit('error', { message: err?.message || 'Cash-out failed' });
      if (typeof ack === 'function') ack({ success: false, error: err?.message });
    }
  });
};

export const registerAviatorHandlers = (io: Server): void => {
  const nsp = io.of('/aviator');

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
    console.log(`[Aviator] Socket connected: ${socket.data.user?.uid || 'anonymous'}`);
    registerAviatorSocket(socket);

    socket.on('disconnect', () => {
      console.log(`[Aviator] Socket disconnected: ${socket.data.user?.uid || 'anonymous'}`);
    });
  });
};
