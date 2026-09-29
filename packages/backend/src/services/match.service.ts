import { callService } from './call.service';

/**
 * 1:1 random-match queue for the Match feature.
 *
 * An in-memory waiting pool (per process). Waiters are paired
 * first-come-first-served, same call type only (video with video, audio with
 * audio). On a match, a normal ringing Call is created through callService —
 * both users receive the existing `call:invite` and the existing accept flow
 * takes over. Pairing is kicked instantly on enqueue and also runs on a
 * short interval as a safety net.
 *
 * NOTE: in-memory means a multi-instance deploy would need this moved to
 * Mongo/Redis. Fine for the current single-instance deployment.
 */

interface MatchWaiter {
  userId: string;
  socketId: string;
  type: 'audio' | 'video';
  joinedAt: number;
}

const MATCH_INTERVAL_MS = 2000;

let waiters: MatchWaiter[] = [];
let interval: ReturnType<typeof setInterval> | null = null;
let started = false;

const removeWaiter = (userId: string) => {
  waiters = waiters.filter((w) => w.userId !== userId);
};

export const matchService = {
  start(): void {
    if (started) return;
    started = true;
    interval = setInterval(() => {
      tryMatch().catch((err) => console.error('[match] pairing error:', err?.message));
    }, MATCH_INTERVAL_MS);
  },

  stop(): void {
    if (interval) clearInterval(interval);
    interval = null;
    started = false;
    waiters = [];
  },

  /** Add a user to the match pool (deduped) and kick an immediate pairing. */
  async enqueue(userId: string, socketId: string, type: 'audio' | 'video' = 'audio'): Promise<void> {
    removeWaiter(userId);
    waiters.push({ userId, socketId, type, joinedAt: Date.now() });
    await tryMatch();
  },

  /** Remove a user from the pool. */
  dequeue(userId: string): void {
    removeWaiter(userId);
  },

  /** Whether the user is currently waiting in the pool. */
  isWaiting(userId: string): boolean {
    return waiters.some((w) => w.userId === userId);
  },
};

/**
 * Pair the two oldest waiters of the same call type and create the call.
 * Consumes both from the queue so a matched user is never matched twice.
 */
async function tryMatch(): Promise<void> {
  if (waiters.length < 2) return;

  // Sort by join order — oldest first
  waiters.sort((a, b) => a.joinedAt - b.joinedAt);

  // Group by type and pair the earliest two of the same type.
  const byType: Record<string, MatchWaiter[]> = { audio: [], video: [] };
  for (const w of waiters) byType[w.type].push(w);

  for (const type of ['audio', 'video'] as const) {
    const pool = byType[type];
    if (pool.length < 2) continue;

    const [a, b] = pool;
    if (a.userId === b.userId) continue; // never pair with self (defensive)

    // Consume both before creating the call — if creation fails, re-enqueue.
    removeWaiter(a.userId);
    removeWaiter(b.userId);

    try {
      await callService.createCall(a.userId, [b.userId], type);
    } catch (err) {
      console.error('[match] createCall failed, restoring waiters:', (err as Error)?.message);
      waiters.push(a, b);
    }
  }
}
