import { Server, Socket } from 'socket.io';
import { teenPattiService } from '../services/teenpatti.service';
import { verifyToken } from '../utils/jwt';

const MAX_ACTIONS_PER_WINDOW = 10;
const ACTION_WINDOW_MS = 3000;

// Per-socket abuse throttle: max 10 game actions per 3 seconds
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

// Handlers wired onto a single socket. Used both on the /teenpatti
// namespace and the default namespace (app-user reuses the main socket).
export const registerTeenPattiSocket = (socket: Socket): void => {
  const allow = makeThrottle();

  socket.on('teenpatti:join', async (data: any, ack?: any) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId) return;
      const currency: 'diamond' | 'coin' = data?.currency === 'coin' ? 'coin' : 'diamond';
      teenPattiService.bindSocket(socket, userId);
      const result = await teenPattiService.joinQueue(userId, currency);
      socket.join(`teenpatti:${result.tableId}`);
      // Re-emit lobby + table to this socket
      socket.emit('teenpatti:lobby', teenPattiService.getLobbyState(currency));
      const tableState = teenPattiService.getState(result.tableId, userId);
      if (tableState) socket.emit('teenpatti:table', tableState);
      socket.emit('success', 'Joined Teen Patti');
      if (typeof ack === 'function') ack({ success: true, tableId: result.tableId });
    } catch (err: any) {
      socket.emit('error', { message: err?.message || 'Failed to join' });
      if (err?.message?.includes('balance')) socket.emit('recharge');
      if (typeof ack === 'function') ack({ success: false, error: err?.message });
    }
  });

  socket.on('teenpatti:leave', async (_data: any, ack?: any) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId) return;
      await teenPattiService.leaveTable(userId, 'diamond');
      await teenPattiService.leaveTable(userId, 'coin');
      teenPattiService.unbindSocket(socket, userId);
      socket.emit('success', 'Left Teen Patti');
      if (typeof ack === 'function') ack({ success: true });
    } catch (err: any) {
      socket.emit('error', { message: err?.message || 'Failed to leave' });
      if (typeof ack === 'function') ack({ success: false, error: err?.message });
    }
  });

  socket.on('teenpatti:bet', async (data: any, ack?: any) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId) return;
      if (!allow()) throw new Error('Too many actions, slow down');
      const tableId = data?.tableId;
      if (!tableId) throw new Error('Missing tableId');
      const amount = data?.amount || 10;
      const result = await teenPattiService.playerAction(userId, tableId, 'bet', amount);
      if (typeof ack === 'function') ack({ success: true, ...result });
    } catch (err: any) {
      socket.emit('error', { message: err?.message || 'Bet failed' });
      if (err?.message?.includes('balance')) socket.emit('recharge');
      if (typeof ack === 'function') ack({ success: false, error: err?.message });
    }
  });

  socket.on('teenpatti:action', async (data: any, ack?: any) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId) return;
      if (!allow()) {
        throw new Error('Too many actions, slow down');
      }
      const action = data?.action as 'fold' | 'call' | 'raise' | 'see' | 'show' | 'bet' | 'reset';
      const tableId = data?.tableId;
      if (!tableId) throw new Error('Missing tableId');
      if (!['fold', 'call', 'raise', 'see', 'show', 'bet', 'reset'].includes(action)) {
        throw new Error('Invalid action');
      }

      const result = await teenPattiService.playerAction(userId, tableId, action, data?.amount);
      socket.emit('success', 'Action sent');
      if (typeof ack === 'function') ack({ success: true, ...result });
    } catch (err: any) {
      socket.emit('error', { message: err?.message || 'Action failed' });
      if (err?.message?.includes('balance')) socket.emit('recharge');
      if (typeof ack === 'function') ack({ success: false, error: err?.message });
    }
  });
};

export const registerTeenPattiHandlers = (io: Server): void => {
  const nsp = io.of('/teenpatti');

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
    registerTeenPattiSocket(socket);
  });
};
