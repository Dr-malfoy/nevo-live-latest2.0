import { Socket } from 'socket.io';
import { callService } from '../services/call.service';

/**
 * Call signaling events:
 * - call:invite / call:accept / call:member-joined / call:member-left / call:end
 *   are server-driven (emitted by callService into per-user rooms and the
 *   per-call room `call:<callId>`).
 * - These handlers forward client intents and manage the per-call room join.
 *
 * Billing events:
 * - call:billing-tick  — client requests a billing tick (every 60 s).
 *   The server is the authoritative source; the client heartbeat is a safety net
 *   for when the server-side interval misses a beat.
 * - balance:update     — server → client, sent after each billing event.
 * - call:coins-finished — server → client, sent when coins are exhausted.
 */
export const registerCallHandlers = (socket: Socket): void => {
  /** Join the per-call room so member events (join/leave) are received. */
  socket.on('call:join-room', ({ callId }) => {
    if (!callId) return;
    const prev = socket.data.callRoomId;
    if (prev && prev !== callId) {
      const res = socket.leave(`call:${prev}`);
      if (res && typeof res.catch === 'function') res.catch(() => {});
    }
    socket.data.callRoomId = callId;
    socket.join(`call:${callId}`);
  });

  /** Leave the per-call room (call closed / screen closed). */
  socket.on('call:leave-room', ({ callId }) => {
    if (!callId) return;
    const res = socket.leave(`call:${callId}`);
    if (res && typeof res.catch === 'function') res.catch(() => {});
    if (socket.data.callRoomId === callId) socket.data.callRoomId = undefined;
  });

  socket.on('call:reject', async ({ callId }, ack) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId || !callId) return;
      const result = await callService.endCall(callId, userId, 'rejected');
      if (typeof ack === 'function') ack({ success: true, ...result });
    } catch (err: any) {
      if (typeof ack === 'function') ack({ success: false, error: err?.message || 'Failed to reject call' });
    }
  });

  socket.on('call:end', async ({ callId }, ack) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId || !callId) return;
      const result = await callService.endCall(callId, userId, 'ended');
      if (typeof ack === 'function') ack({ success: true, ...result });
    } catch (err: any) {
      if (typeof ack === 'function') ack({ success: false, error: err?.message || 'Failed to end call' });
    }
  });

  /**
   * Client billing heartbeat — emitted every 60 s by the audience device.
   * The server validates, deducts coins, and emits balance:update / call:coins-finished.
   */
  socket.on('call:billing-tick', async ({ callId }, ack) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId || !callId) return;
      const result = await callService.billingTick(callId, userId);
      if (typeof ack === 'function') ack({ success: true, result });
    } catch (err: any) {
      console.warn('[call:billing-tick] error:', err?.message);
      if (typeof ack === 'function') ack({ success: false, error: err?.message });
    }
  });

  /** Real-time in-call text chat */
  socket.on('call:message', async ({ callId, text, sender }) => {
    try {
      const userId = socket.data.user?.userId;
      if (!userId || !callId || !text?.trim()) return;
      const payload = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        callId,
        senderId: userId,
        sender: sender || {
          _id: userId,
          nickname: 'User',
          avatar: '',
        },
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };
      socket.to(`call:${callId}`).emit('call:message', payload);
    } catch (err) {
      console.warn('call:message error:', err);
    }
  });
};
