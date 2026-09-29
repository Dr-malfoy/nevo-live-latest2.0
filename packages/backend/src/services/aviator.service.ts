import { AviatorRound, AviatorBet, User, Transaction } from '../models';
import { getIO } from '../socket';
import { AppError } from '../middleware/errorHandler';

// ─── Configuration ────────────────────────────────────────────────────
const BET_PHASE_MS = 8000; // time to place bets
const TICK_MS = 50; // engine tick (multiplier updates at ~20fps)
const RESULT_PAUSE_MS = 3000; // pause between crash and next round
const MIN_BET = 1;
const MAX_BET = 100000;
const MIN_CRASH = 1.0;
const MAX_CRASH = 30.0;
const RTP = 0.97; // ~97% return to player (3% house edge)

type Currency = 'diamond' | 'coin';
type Phase = 'BET' | 'PLAYING' | 'CRASHED';

interface LiveBet {
  _id: string;
  userId: string;
  currency: Currency;
  betAmount: number;
  target: number;
}

// Exponential crash point distribution (mirrors real Aviator mechanics):
// ~30% chance < 2x, ~50% chance 2x-10x, ~20% chance 10x-30x.
// Uses the house-edge formula: crash = 0.99 / u (clamped to [1.0, 30.0]).
function generateCrashPoint(): number {
  // House edge: occasionally crash at 1x to maintain RTP
  if (Math.random() > RTP) return MIN_CRASH;
  const u = Math.random();
  // Exponential: low u → high multiplier, high u → low multiplier
  const crash = Math.max(MIN_CRASH, RTP / Math.max(u, 0.033)); // 0.033 ≈ RTP/MAX_CRASH
  return Math.round(Math.min(crash, MAX_CRASH) * 100) / 100;
}

// ─── Engine state (single shared flight, mirrors roulette.service.ts) ─
let running = false;
let phase: Phase = 'BET';
let phaseStartedAt = 0;
let multiplier = 0;
let currentRound: { roundId: string; roundNumber: number; crashPoint: number } | null = null;
let liveBets: LiveBet[] = [];
let roundNumber = 0;
let roundTimer: NodeJS.Timeout | null = null;

const getRoom = () => 'aviator:room';

function broadcast(event: string, data: any) {
  try {
    getIO().emit(event, data);
    getIO().of('/aviator').emit(event, data);
  } catch {
    // socket not initialized yet
  }
}

function pushBalance(userId: string, currency: Currency, amount: number) {
  try {
    getIO().to(`user:${userId}`).emit('balance:update', {
      coins: currency === 'coin' ? amount : undefined,
      diamonds: currency === 'diamond' ? amount : undefined,
    });
  } catch {
    // socket not initialized
  }
}

function gameState() {
  return {
    phase,
    roundNumber,
    multiplier: phase === 'PLAYING' ? multiplier : 0,
    crashPoint: phase === 'CRASHED' ? currentRound?.crashPoint ?? null : null,
    endsAt: phase === 'BET' ? phaseStartedAt + BET_PHASE_MS : phase === 'PLAYING' ? phaseStartedAt : 0,
    liveBetCount: liveBets.length,
  };
}

function broadcastState() {
  broadcast('aviator:state', gameState());
}

function getMultiplier(now: number): number {
  const t = (now - phaseStartedAt) / 1000;
  const m = 1 + 0.06 * t + Math.pow(0.06 * t, 2) - Math.pow(0.04 * t, 3) + Math.pow(0.04 * t, 4);
  return Math.round(m * 100) / 100;
}

// ─── Engine lifecycle ─────────────────────────────────────────────────

async function startRound() {
  const crashPoint = generateCrashPoint();

  // Bounded retry: read the DB max, insert, and on a unique-index race
  // (duplicate roundNumber from a competing instance/restart) re-read and
  // retry instead of wedging the engine forever.
  let attempts = 0;
  while (attempts < 5) {
    attempts += 1;
    try {
      const last = await AviatorRound.findOne().sort({ roundNumber: -1 }).select('roundNumber');
      roundNumber = (last?.roundNumber || 0) + 1;
      const round = await AviatorRound.create({
        roundNumber,
        crashPoint,
        status: 'waiting',
      });
      currentRound = { roundId: String(round._id), roundNumber, crashPoint };
      break;
    } catch (e: any) {
      const isDup = e?.code === 11000;
      if (!isDup || attempts >= 5) throw e;
      // Duplicate key — another instance grabbed the same number. Retry.
    }
  }

  // Mark the previous round's active bets as lost
  if (liveBets.length > 0) {
    await AviatorBet.updateMany(
      { _id: { $in: liveBets.filter((b) => b.target).map((b) => b._id) }, status: 'active' },
      { $set: { status: 'lost' } }
    );
  }
  liveBets = [];

  phase = 'BET';
  multiplier = 0;
  phaseStartedAt = Date.now();

  broadcast('aviator:history', await getHistoryNumbers());
  broadcastState();
}

async function fly() {
  // Guard: only the first BET→PLAYING transition broadcasts.
  if (phase === 'PLAYING' || phase === 'CRASHED') return;

  phase = 'PLAYING';
  multiplier = 1;
  phaseStartedAt = Date.now();
  if (currentRound) {
    await AviatorRound.updateOne(
      { _id: currentRound.roundId },
      { $set: { status: 'flying', startedAt: new Date() } }
    );
  }
  broadcastState();
}

// Settle a bet at a given multiplier (atomic win credit)
async function settleBet(bet: LiveBet, at: number) {
  const win = Number((bet.betAmount * at).toFixed(2));
  await AviatorBet.updateOne(
    { _id: bet._id },
    { $set: { status: 'cashed_out', cashOutAt: at, winAmount: win } }
  );
  await User.updateOne({ _id: bet.userId }, { $inc: { [bet.currency]: win } });
  await Transaction.create({
    userId: bet.userId,
    type: 'game_win',
    amount: win,
    currency: bet.currency,
    status: 'completed',
    description: `Aviator cash-out at ${at}x (bet ${bet.betAmount} ${bet.currency})`,
  });
  pushBalance(bet.userId, bet.currency, 0);
}

// Auto cash-out when the multiplier reaches each bet's target
async function processAutoCashOuts() {
  const toCashOut = liveBets.filter(
    (b) => b.target > 0 && multiplier >= b.target
  );
  for (const bet of toCashOut) {
    await settleBet(bet, multiplier);
    liveBets = liveBets.filter((b) => b._id !== bet._id);
  }
  if (toCashOut.length > 0) broadcastState();
}

async function crash() {
  // Guard + set the phase synchronously BEFORE any await so a second tick
  // racing in cannot double-broadcast the result.
  if (phase === 'CRASHED') return;
  phase = 'CRASHED';

  if (currentRound) {
    await AviatorRound.updateOne(
      { _id: currentRound.roundId },
      { $set: { status: 'crashed', crashedAt: new Date() } }
    );
  }
  multiplier = currentRound?.crashPoint ?? MIN_CRASH;

  // Remaining active bets lose
  const losers = liveBets.filter((b) => b.target > 0);
  if (losers.length > 0) {
    await AviatorBet.updateMany(
      { _id: { $in: losers.map((b) => b._id) }, status: 'active' },
      { $set: { status: 'lost' } }
    );
  }
  liveBets = [];

  const hist = await getHistoryNumbers();

  broadcast('aviator:result', {
    roundNumber: currentRound?.roundNumber ?? 0,
    crashPoint: multiplier,
    results: losers.map((b) => ({ betId: b._id, userId: b.userId, betAmount: b.betAmount, status: 'lost' })),
  });

  // Broadcast fresh history AFTER the round has crashed and saved to history
  broadcast('aviator:history', hist);

  broadcastState();

  roundTimer = setTimeout(() => {
    startRound().catch((e) => console.error('[Aviator] startRound failed:', e?.message));
  }, RESULT_PAUSE_MS);
}

// Main loop
async function tick() {
  if (!running) return;

  try {
    if (phase === 'BET') {
      if (Date.now() - phaseStartedAt >= BET_PHASE_MS) {
        await fly();
      }
    } else if (phase === 'PLAYING') {
      multiplier = getMultiplier(Date.now());
      await processAutoCashOuts();
      broadcastState();

      const crashPoint = currentRound?.crashPoint ?? MIN_CRASH;
      if (multiplier >= crashPoint) {
        multiplier = crashPoint;
        await crash();
      }
    }
  } catch (e) {
    console.error('[Aviator] tick error:', e);
  }
}

async function getHistoryNumbers() {
  const rounds = await AviatorRound.find({ status: 'crashed' })
    .sort({ roundNumber: -1 })
    .limit(15)
    .select('roundNumber crashPoint');
  return rounds.map((r) => ({
    roundNumber: r.roundNumber,
    crashPoint: r.crashPoint,
  }));
}

// ─── Public API ───────────────────────────────────────────────────────

export const aviatorService = {
  async start() {
    if (running) return;
    running = true;
    console.log('✈️ Aviator game engine started');

    // Seed the next round number from the DB (max + 1)
    const last = await AviatorRound.findOne().sort({ roundNumber: -1 }).select('roundNumber');
    roundNumber = last?.roundNumber || 0;

    // Reconcile orphaned bets/rounds from a previous run
    await AviatorBet.updateMany({ status: 'active' }, { $set: { status: 'lost' } });
    await AviatorRound.updateMany(
      { status: { $in: ['waiting', 'flying'] } },
      { $set: { status: 'crashed', crashedAt: new Date() } }
    );

    await startRound();
    setInterval(tick, TICK_MS);
  },

  isRunning() {
    return running;
  },

  getState() {
    return gameState();
  },

  getHistoryNumbers() {
    return getHistoryNumbers();
  },

  async placeBet(userId: string, data: { betAmount?: number; target?: number; currency?: Currency }) {
    const { betAmount: rawAmount, target: rawTarget, currency = 'diamond' } = data;

    if (phase !== 'BET' || !currentRound) {
      throw new AppError('Bets are closed for this round', 400);
    }
    const betAmount = Number(rawAmount);
    if (!betAmount || betAmount < MIN_BET || betAmount > MAX_BET) {
      throw new AppError(`Bet must be between ${MIN_BET} and ${MAX_BET}`, 400);
    }
    let target = Number(rawTarget);
    if (!target || target < 1.01) target = 1.01;
    if (target > MAX_CRASH) target = MAX_CRASH; // max 30x
    if (currency !== 'diamond' && currency !== 'coin') {
      throw new AppError('Invalid currency', 400);
    }

    // Atomic balance check + deduct (race-safe, mirrors Roulette/TeenPatti)
    const field = currency === 'diamond' ? 'diamonds' : 'coins';
    const updated = await User.findOneAndUpdate(
      { _id: userId, [field]: { $gte: betAmount } },
      { $inc: { [field]: -betAmount } },
      { new: true }
    );
    if (!updated) {
      throw new AppError('Your balance is not enough', 400);
    }

    await Transaction.create({
      userId,
      type: 'game_bet',
      amount: betAmount,
      currency,
      status: 'completed',
      description: `Aviator bet (${betAmount} ${currency})`,
    });

    const bet = await AviatorBet.create({
      userId,
      roundId: currentRound.roundId,
      currency,
      betAmount,
      target,
      status: 'active',
      winAmount: 0,
    });
    liveBets.push({
      _id: String(bet._id),
      userId,
      currency,
      betAmount,
      target,
    });
    pushBalance(userId, currency, field === 'diamonds' ? updated.diamonds : updated.coins);

    return { success: true, betId: String(bet._id), balance: field === 'diamonds' ? updated.diamonds : updated.coins };
  },

  async cashOut(userId: string) {
    if (phase !== 'PLAYING') {
      throw new AppError('Game is not flying', 400);
    }

    const bet = liveBets.find(
      (b) => b.userId === userId && b.target > 0
    );
    if (!bet) throw new AppError('No active bet found', 404);

    const at = multiplier;
    await settleBet(bet, at);
    liveBets = liveBets.filter((b) => b._id !== bet._id);
    broadcastState();

    return { betId: bet._id, cashOutAt: at, winAmount: Number((bet.betAmount * at).toFixed(2)) };
  },

  async getUserHistory(userId: string, page: number, limit: number) {
    const total = await AviatorBet.countDocuments({ userId });
    const data = await AviatorBet.find({ userId })
      .populate('roundId', 'crashPoint roundNumber')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return { data, total };
  },

  async getStats() {
    const [totalBets, totalWins, rounds] = await Promise.all([
      AviatorBet.countDocuments(),
      AviatorBet.countDocuments({ status: 'cashed_out' }),
      AviatorRound.countDocuments(),
    ]);
    return { totalBets, totalWins, rounds };
  },
};
