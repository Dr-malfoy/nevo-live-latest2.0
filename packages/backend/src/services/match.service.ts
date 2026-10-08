import { Call, User } from '../models';
import { generateAgoraToken } from '../config/agora';
import { getIO } from '../socket';
import crypto from 'crypto';

/**
 * 1:1 Random Matchmaking service for live video & audio calls.
 *
 * Supports Call Type (audio / video) and Gender Filter ('male' | 'female' | 'all').
 * Waiters are paired first-come-first-served with gender filter compatibility.
 * On a match:
 *  - Both users are removed from the queue immediately.
 *  - An active 1:1 Call is created.
 *  - Both users receive a 'call:matched' socket event with credentials.
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

const MATCH_INTERVAL_MS = 1500;

let waiters: MatchWaiter[] = [];
let interval: ReturnType<typeof setInterval> | null = null;
let started = false;

const removeWaiter = (userId: string) => {
  waiters = waiters.filter((w) => w.userId !== userId);
};

/**
 * Compatibility check between two waiters:
 * 1. Must be different users.
 * 2. Must request the same call type ('audio' or 'video').
 * 3. Gender matching:
 *    - Both selected 'all' -> compatible.
 *    - Both selected the same filter (e.g., both selected 'male' / Boy or both selected 'female' / Girl) -> compatible.
 *    - One selected 'all' and the other selected a specific filter -> compatible.
 *    - Cross-preferences (e.g. Boy looking for Girl & Girl looking for Boy) -> compatible.
 */
export const isMatchCompatible = (a: MatchWaiter, b: MatchWaiter): boolean => {
  if (a.userId === b.userId) return false;
  if (a.type !== b.type) return false;

  // 1. Both selected 'all'
  if (a.targetGender === 'all' && b.targetGender === 'all') return true;

  // 2. Both selected the exact same targetGender ('male' or 'female')
  if (a.targetGender === b.targetGender) return true;

  // 3. A selected 'all', B selected specific target ('male' or 'female')
  if (a.targetGender === 'all') {
    if (b.targetGender === 'male') {
      return a.userGender === 'male' || a.userGender === 'unspecified';
    }
    if (b.targetGender === 'female') {
      return a.userGender === 'female' || a.userGender === 'unspecified';
    }
  }

  // 4. B selected 'all', A selected specific target ('male' or 'female')
  if (b.targetGender === 'all') {
    if (a.targetGender === 'male') {
      return b.userGender === 'male' || b.userGender === 'unspecified';
    }
    if (a.targetGender === 'female') {
      return b.userGender === 'female' || b.userGender === 'unspecified';
    }
  }

  // 5. Cross preferences (A wants 'male' and B wants 'female')
  if (a.targetGender === 'male' && b.targetGender === 'female') {
    if (a.userGender === 'female' && b.userGender === 'male') return true;
  }
  if (a.targetGender === 'female' && b.targetGender === 'male') {
    if (a.userGender === 'male' && b.userGender === 'female') return true;
  }

  return false;
};

/**
 * Creates an active 1:1 match call and notifies both users.
 */
async function createAndDispatchMatchCall(a: MatchWaiter, b: MatchWaiter): Promise<void> {
  const [userA, userB] = await Promise.all([
    User.findById(a.userId).select('_id uid nickname avatar role gender').lean() as any,
    User.findById(b.userId).select('_id uid nickname avatar role gender').lean() as any,
  ]);

  if (!userA || !userB) {
    throw new Error('One or more users not found in database');
  }

  const channel = `match_${crypto.randomUUID().slice(0, 8)}_${Date.now()}`;
  const participants = [a.userId, b.userId];

  const call = await Call.create({
    participants,
    initiatorId: a.userId,
    channel,
    type: a.type,
    callSource: 'match',
    status: 'active',
    startedAt: new Date(),
    maxParticipants: 2,
    coinsPerMinute: 0,
    minutesBilled: 0,
    totalCoins: 0,
    finalized: true,
  });

  const token = generateAgoraToken(channel, 0, 'publisher');
  const callId = call._id.toString();

  const payloadForA = {
    callId,
    channel,
    type: a.type,
    token,
    initiatorId: a.userId,
    isInitiator: true,
    callSource: 'match',
    peer: {
      _id: String(userB._id),
      uid: userB.uid,
      nickname: userB.nickname,
      avatar: userB.avatar,
    },
    callee: {
      _id: String(userB._id),
      uid: userB.uid,
      nickname: userB.nickname,
      avatar: userB.avatar,
    },
    initiator: {
      _id: String(userA._id),
      uid: userA.uid,
      nickname: userA.nickname,
      avatar: userA.avatar,
    },
  };

  const payloadForB = {
    callId,
    channel,
    type: a.type,
    token,
    initiatorId: a.userId,
    isInitiator: false,
    callSource: 'match',
    peer: {
      _id: String(userA._id),
      uid: userA.uid,
      nickname: userA.nickname,
      avatar: userA.avatar,
    },
    callee: {
      _id: String(userA._id),
      uid: userA.uid,
      nickname: userA.nickname,
      avatar: userA.avatar,
    },
    initiator: {
      _id: String(userA._id),
      uid: userA.uid,
      nickname: userA.nickname,
      avatar: userA.avatar,
    },
  };

  try {
    const io = getIO();
    // Dispatch call:matched into per-user notification rooms
    io.to(`user:${a.userId}`).emit('call:matched', payloadForA);
    io.to(`user:${b.userId}`).emit('call:matched', payloadForB);
  } catch (err: any) {
    console.error('[match] Socket emit failed:', err?.message);
  }
}

/**
 * Pair the oldest compatible waiters according to type and gender filter.
 */
async function tryMatch(): Promise<void> {
  if (waiters.length < 2) return;

  // Filter out any stale waiters (> 5 minutes)
  const now = Date.now();
  waiters = waiters.filter((w) => now - w.joinedAt < 5 * 60 * 1000);

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

        // Consume both from queue immediately before async call creation
        removeWaiter(a.userId);
        removeWaiter(b.userId);

        try {
          await createAndDispatchMatchCall(a, b);
          matchedAny = true;
          break; // break loop to re-evaluate remaining waiters
        } catch (err: any) {
          console.error('[match] Match call creation failed:', err?.message);
        }
      }
    }
  }
}

export const matchService = {
  start(): void {
    if (started) return;
    started = true;
    interval = setInterval(() => {
      tryMatch().catch((err) => console.error('[match] pairing loop error:', err?.message));
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
      const u = await User.findById(userId).select('gender').lean() as any;
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

  /** Get number of active waiters in the pool. */
  getQueueLength(): number {
    return waiters.length;
  },
};
