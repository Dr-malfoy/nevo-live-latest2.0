import { Socket } from 'socket.io';
import { matchService } from '../services/match.service';
import { User } from '../models';

/**
 * Random 1:1 match queue signaling:
 * - match:join → put the user in the pool (deduped) + kick immediate pairing.
 * - match:leave → remove the user from the pool.
 * - disconnect → remove the user so they never get ghost-paired.
 */
export const registerMatchHandlers = (socket: Socket): void => {
  socket.on('match:join', async ({ type, gender } = {}, ack) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId) return ack?.({ success: false, error: 'Not authenticated' });

      const callType: 'audio' | 'video' = type === 'audio' ? 'audio' : 'video';
      const targetGender = gender === 'male' || gender === 'female' ? gender : 'all';

      // 1:1 Match Filter Quota Validation
      if (targetGender === 'male' || targetGender === 'female') {
        const user = await User.findById(userId).select('matchSubscription');
        const isSubActive = Boolean(
          user?.matchSubscription?.active &&
          user?.matchSubscription?.expiresAt &&
          new Date(user.matchSubscription.expiresAt) > new Date()
        );
        const remaining = user?.matchSubscription?.filterMatchesRemaining || 0;

        if (!isSubActive || remaining <= 0) {
          return ack?.({
            success: false,
            error: '1:1 Subscription Card required to filter matches (100 matches/week). Please get it from the Store.',
            needSubscription: true,
          });
        }

        // Decrement filter match quota by 1
        await User.updateOne(
          { _id: userId },
          { $inc: { 'matchSubscription.filterMatchesRemaining': -1 } }
        );
      }

      socket.data.matchType = callType;
      await matchService.enqueue(userId, socket.id, callType, targetGender);
      ack?.({ success: true, waiting: true, type: callType, gender: targetGender });
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
