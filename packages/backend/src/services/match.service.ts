import { callService } from './call.service';
import { User } from '../models';

/**
 * 1:1 random-match queue for the Match feature.
 *
 * Supports Call Type (audio / video) and Gender Filter ('male' | 'female' | 'all').
 * Waiters are paired first-come-first-served with gender filter compatibility.
 * On a match, a ringing Call is created through callService.
 */

export type GenderFilter = 'male' | 'female' | 'all';

interface MatchWaiter {
  userId: string;
  socketId: string;
  type: 'audio' | 'video';
  userGender: string;
  targetGender: GenderFilter;
  joinedAt: number;
}

const MATCH_INTERVAL_MS = 2000;

let waiters: MatchWaiter[] = [];
let interval: ReturnType<typeof setInterval> | null = null;
let started = false;

const removeWaiter = (userId: string) => {
  waiters = waiters.filter((w) => w.userId !== userId);
};

const isMatchCompatible = (a: MatchWaiter, b: MatchWaiter): boolean => {
  if (a.userId === b.userId) return false;
  if (a.type !== b.type) return false;

  // Verify A's target preference matches B's gender
  if (a.targetGender === 'male' && b.userGender !== 'male') return false;
  if (a.targetGender === 'female' && b.userGender !== 'female') return false;

  // Verify B's target preference matches A's gender
  if (b.targetGender === 'male' && a.userGender !== 'male') return false;
  if (b.targetGender === 'female' && a.userGender !== 'female') return false;

  return true;
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

  /** Add a user to the match pool (deduped) with gender filter and kick immediate pairing. */
  async enqueue(
    userId: string,
    socketId: string,
    type: 'audio' | 'video' = 'video',
    targetGender: GenderFilter = 'all'
  ): Promise<void> {
    removeWaiter(userId);

    let userGender = 'unspecified';
    try {
      const u = await User.findById(userId).select('gender').lean();
      if (u?.gender) {
        userGender = u.gender;
      }
    } catch {
      // fallback to unspecified if lookup fails
    }

    waiters.push({
      userId,
      socketId,
      type,
      userGender,
      targetGender: targetGender === 'male' || targetGender === 'female' ? targetGender : 'all',
      joinedAt: Date.now(),
    });

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
 * Pair the oldest compatible waiters according to type and gender filter.
 */
async function tryMatch(): Promise<void> {
  if (waiters.length < 2) return;

  // Sort by join order — oldest first
  waiters.sort((a, b) => a.joinedAt - b.joinedAt);

  let matchedAny = true;
  while (matchedAny && waiters.length >= 2) {
    matchedAny = false;

    for (let i = 0; i < waiters.length; i++) {
      const a = waiters[i];
      let partnerIndex = -1;

      for (let j = i + 1; j < waiters.length; j++) {
        const b = waiters[j];
        if (isMatchCompatible(a, b)) {
          partnerIndex = j;
          break;
        }
      }

      if (partnerIndex !== -1) {
        const b = waiters[partnerIndex];

        // Consume both before creating the call
        removeWaiter(a.userId);
        removeWaiter(b.userId);

        try {
          await callService.createCall(a.userId, [b.userId], a.type);
          matchedAny = true;
          break; // break to re-evaluate remaining waiters
        } catch (err) {
          console.error('[match] createCall failed, restoring waiters:', (err as Error)?.message);
          waiters.push(a, b);
        }
      }
    }
  }
}
