import { Socket } from 'socket.io';
import { matchService } from '../services/match.service';

/**
 * Random 1:1 match queue signaling:
 * - match:join → put the user in the pool (deduped) + kick immediate pairing.
 * - match:leave → remove the user from the pool.
 * - disconnect → remove the user so they never get ghost-paired.
 */
export const registerMatchHandlers = (socket: Socket): void => {
  socket.on('match:join', async ({ type } = {}, ack) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId) return ack?.({ success: false, error: 'Not authenticated' });

      const callType: 'audio' | 'video' = type === 'video' ? 'video' : 'audio';
      socket.data.matchType = callType;
      await matchService.enqueue(userId, socket.id, callType);
      ack?.({ success: true, waiting: true, type: callType });
    } catch (err: any) {
      ack?.({ success: false, error: err?.message || 'Failed to join match queue' });
    }
  });

  socket.on('match:leave', async (_data, ack) => {
    try {
      const userId = socket.data.user?.userId;
      if (userId) matchService.dequeue(userId);
      ack?.({ success: true });
    } catch (err: any) {
      ack?.({ success: false, error: err?.message || 'Failed to leave match queue' });
    }
  });

  socket.on('disconnect', () => {
    const userId = socket.data.user?.userId;
    if (userId) matchService.dequeue(userId);
  });
};
