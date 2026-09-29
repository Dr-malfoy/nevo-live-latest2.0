import { streamsApi } from '../api';
import type { Socket } from 'socket.io-client';

/**
 * Centralized, idempotent Live-session cleanup.
 *
 * Every exit path (End button, Back button, screen unmount, app backgrounding,
 * network-timeout auto-end) funnels through endLiveSession(). Repeated calls
 * are safely ignored — the first call owns the teardown.
 *
 * Order:
 * 1. Stop publishing / leave the Agora channel (via the shared hook's client).
 * 2. Clear heartbeat + network-grace timers.
 * 3. Call the end/leave REST API (host ends, viewer leaves).
 * 4. Emit socket events + leave the room.
 * 5. Navigate away only after cleanup has begun safely.
 */

interface SessionContext {
  streamId: string;
  isHost: boolean;
  channel?: string;
  /** Cleanup function provided by the Agora hook (leave + close tracks). */
  leaveChannel: () => Promise<void>;
  socket?: Socket | null;
  navigate?: () => void;
}

let activeContext: SessionContext | null = null;
let cleaningUp = false;
let cleanupPromise: Promise<void> | null = null;

/** Register the active session so endLiveSession() knows how to tear it down. */
export const registerLiveSession = (ctx: SessionContext) => {
  // A newer session supersedes an older one; never interrupt an in-flight cleanup.
  if (!cleaningUp) {
    activeContext = ctx;
    cleanupPromise = null;
  }
};

/** Unregister when the session is fully done (or never started). */
export const unregisterLiveSession = (streamId: string) => {
  if (activeContext?.streamId === streamId) {
    activeContext = null;
  }
};

/** Whether a cleanup is currently in flight (UI can show a spinner). */
export const isCleaningUp = () => cleaningUp;

export const endLiveSession = async (): Promise<void> => {
  // Idempotency guard: only the first call runs the teardown.
  if (cleaningUp) {
    // Return the in-flight promise so callers can await the same teardown.
    return cleanupPromise || Promise.resolve();
  }
  const ctx = activeContext;
  if (!ctx) return;

  cleaningUp = true;

  cleanupPromise = (async () => {
    // 1. Leave Agora + close local tracks
    try {
      await ctx.leaveChannel();
    } catch (e) {
      console.warn('[LiveSession] leaveChannel error (ignored):', e);
    }

    // 2. REST: host ends the stream, viewer leaves
    try {
      if (ctx.isHost) {
        await streamsApi.endStream(ctx.streamId);
      } else {
        await streamsApi.leaveStream(ctx.streamId);
      }
    } catch (e) {
      console.warn('[LiveSession] end/leave API error:', e);
    }

    // 3. Socket: tell the room + leave
    try {
      if (ctx.socket) {
        if (ctx.isHost) ctx.socket.emit('stream:ended', { streamId: ctx.streamId });
        ctx.socket.emit('stream:leave', { streamId: ctx.streamId });
      }
    } catch (e) {
      console.warn('[LiveSession] socket cleanup error:', e);
    }

    // 4. Navigate away
    ctx.navigate?.();

    // 5. Clear context so future calls are no-ops
    activeContext = null;
    cleaningUp = false;
    cleanupPromise = null;
  })();

  return cleanupPromise;
};

/** Reset module state (mainly for tests / logout). */
export const resetLiveSession = () => {
  activeContext = null;
  cleaningUp = false;
  cleanupPromise = null;
};
