import { RouletteRound, RouletteBet, User, Transaction, IRouletteRoundDocument } from '../models';
import { getIO } from '../socket';
import { AppError } from '../middleware/errorHandler';
import {
  BET_PAYOUTS,
  BET_LABELS,
  BET_TYPES,
  BetType,
  generateRoundSeed,
  hashSeed,
  seedToIndex,
  validateSelection,
  wheelNumberLabel,
  WHEEL,
} from '../utils/roulette';

// ─── Configuration ────────────────────────────────────────────────────
const BET_MS = 10000; // betting window per round
const SPIN_MS = 8000; // spin animation + result window
const MIN_BET = 1;
const MAX_BET = 100000;

type Currency = 'diamond' | 'coin';
type Phase = 'betting' | 'spinning';

interface LiveBet {
  _id: string;
  userId: string;
  currency: Currency;
  betType: BetType;
  numbers: number[];
  betAmount: number;
}

// ─── Engine state (single shared wheel) ───────────────────────────────
let running = false;
let phase: Phase = 'betting';
let phaseStartedAt = 0;
let currentRound: { roundId: string; roundNumber: number; winningIndex: number; seed: string; hash: string } | null = null;
let liveBets: LiveBet[] = [];
let roundNumber = 0;
let bettingTimer: NodeJS.Timeout | null = null;
let resultWindowTimer: NodeJS.Timeout | null = null;

const getRoom = () => 'roulette:room';

function broadcast(event: string, data: any) {
  try {
    getIO().emit(event, data);
    getIO().of('/roulette').emit(event, data);
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
    winningIndex: phase === 'spinning' && currentRound ? currentRound.winningIndex : null,
    endsAt: phase === 'betting' ? phaseStartedAt + BET_MS : phaseStartedAt + SPIN_MS,
    liveBetCount: liveBets.length,
    hash: currentRound?.hash ?? null,
  };
}

function broadcastState() {
  broadcast('roulette:state', gameState());
}

// ─── Engine lifecycle ─────────────────────────────────────────────────

async function startRound() {
  roundNumber += 1;
  const seed = generateRoundSeed();
  const hash = hashSeed(seed);

  // Bounded retry on the unique roundNumber index (a competing instance may
  // have grabbed the same number between our read and insert).
  let attempts = 0;
  let round: IRouletteRoundDocument | null = null;
  while (attempts < 5) {
    attempts += 1;
    try {
      const last = await RouletteRound.findOne().sort({ roundNumber: -1 }).select('roundNumber');
      roundNumber = (last?.roundNumber || 0) + 1;
      round = await RouletteRound.create({
        roundNumber,
        winningNumber: -1,
        status: 'betting',
        startedAt: new Date(),
      });
      break;
    } catch (e: any) {
      const isDup = e?.code === 11000;
      if (!isDup || attempts >= 5) throw e;
    }
  }
  if (!round) throw new Error('Failed to create roulette round after retries');

  currentRound = { roundId: String(round._id), roundNumber, winningIndex: -1, seed, hash };
  phase = 'betting';
  phaseStartedAt = Date.now();
  liveBets = [];
  broadcastState();
  broadcast('roulette:history', await getHistoryNumbers());

  bettingTimer = setTimeout(() => {
    settleRound().catch((e) => console.error('[Roulette] settle error:', e));
  }, BET_MS);
}

async function settleRound() {
  if (!currentRound) return;
  const winningPocketIndex = seedToIndex(currentRound.seed);
  const winningNumber = WHEEL[winningPocketIndex];
  currentRound.winningIndex = winningPocketIndex;
  phase = 'spinning';
  phaseStartedAt = Date.now();
  broadcastState();

  const winLabel = String(winningNumber);
  const roundId = currentRound.roundId;
  const settled: any[] = [];

  for (const bet of liveBets) {
    const won = bet.numbers.includes(winningNumber);
    const payout = won ? Math.floor(bet.betAmount * BET_PAYOUTS[bet.betType]) : 0;

    if (won && payout > 0) {
      await User.updateOne({ _id: bet.userId }, { $inc: { [bet.currency]: payout } });
      await RouletteBet.updateOne({ _id: bet._id }, { $set: { status: 'won', winAmount: payout } });
      await Transaction.create({
        userId: bet.userId,
        type: 'game_win',
        amount: payout,
        currency: bet.currency,
        status: 'completed',
        description: `Roulette win (${BET_LABELS[bet.betType]} on ${winLabel}) — ${payout} ${bet.currency}`,
      });
      // Push the real updated balance (avoids briefly zeroing the client display).
      const field = bet.currency === 'diamond' ? 'diamonds' : 'coins';
      const updated = await User.findById(bet.userId).select(field).lean();
      pushBalance(bet.userId, bet.currency, updated ? (updated as any)[field] : 0);
    } else {
      await RouletteBet.updateOne({ _id: bet._id }, { $set: { status: 'lost', winAmount: 0 } });
    }

    settled.push({
      betId: String(bet._id),
      betType: bet.betType,
      numbers: bet.numbers,
      betAmount: bet.betAmount,
      winAmount: payout,
      status: won ? 'won' : 'lost',
      userId: bet.userId,
      currency: bet.currency,
    });
  }

  await RouletteRound.updateOne(
    { _id: roundId },
    { $set: { status: 'ended', winningNumber: winningNumber, endedAt: new Date() } }
  );

  broadcast('roulette:result', {
    roundNumber: currentRound.roundNumber,
    winningIndex: winningPocketIndex,
    winningNumber: winLabel,
    results: settled,
    seed: currentRound.seed,
    hash: currentRound.hash,
  });

  broadcast('roulette:history', await getHistoryNumbers());

  resultWindowTimer = setTimeout(() => {
    startRound().catch((e) => console.error('[Roulette] next round error:', e));
  }, SPIN_MS);
}

// ─── Public API ───────────────────────────────────────────────────────

export const rouletteService = {
  async start() {
    if (running) return;
    running = true;
    console.log('🎰 Roulette game engine started');

    // Seed the next round number from the DB (max + 1, like Aviator/TeenPatti)
    const last = await RouletteRound.findOne().sort({ roundNumber: -1 }).select('roundNumber');
    roundNumber = last?.roundNumber || 0;

    // Reconcile orphaned bets/rounds from a previous run
    await RouletteBet.updateMany({ status: 'active' }, { $set: { status: 'lost' } });
    await RouletteRound.updateMany(
      { status: { $in: ['betting', 'spinning'] } },
      { $set: { status: 'ended', endedAt: new Date() } }
    );

    await startRound();
  },

  stop() {
    if (bettingTimer) clearTimeout(bettingTimer);
    if (resultWindowTimer) clearTimeout(resultWindowTimer);
    bettingTimer = null;
    resultWindowTimer = null;
    running = false;
    console.log('🎰 Roulette game engine stopped');
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

  async placeBet(userId: string, data: { currency?: Currency; betType?: BetType; numbers?: number[]; amount?: number }) {
    const { currency = 'diamond', betType, numbers, amount } = data;

    if (phase !== 'betting' || !currentRound) {
      throw new AppError('Bets are closed for this round', 400);
    }
    if (!betType || !BET_TYPES.includes(betType)) {
      throw new AppError('Invalid bet type', 400);
    }
    const betAmount = Number(amount);
    if (!betAmount || betAmount < MIN_BET || betAmount > MAX_BET) {
      throw new AppError(`Bet must be between ${MIN_BET} and ${MAX_BET}`, 400);
    }
    if (currency !== 'diamond' && currency !== 'coin') {
      throw new AppError('Invalid currency', 400);
    }

    const selection = validateSelection(betType, numbers);
    if (!selection.ok) {
      throw new AppError(selection.error, 400);
    }

    // Atomic balance check + deduct (race-safe, mirrors TeenPatti)
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
      description: `Roulette bet (${BET_LABELS[betType]} — ${betAmount} ${currency})`,
    });

    const bet = await RouletteBet.create({
      userId,
      roundId: currentRound.roundId,
      currency,
      betType,
      numbers: selection.numbers,
      betAmount,
      winAmount: 0,
      status: 'active',
    });
    liveBets.push({
      _id: String(bet._id),
      userId,
      currency,
      betType,
      numbers: selection.numbers,
      betAmount,
    });
    pushBalance(userId, currency, field === 'diamonds' ? updated.diamonds : updated.coins);

    return { success: true, betId: String(bet._id), balance: field === 'diamonds' ? updated.diamonds : updated.coins };
  },

  async getUserHistory(userId: string, page: number, limit: number) {
    const total = await RouletteBet.countDocuments({ userId });
    const data = await RouletteBet.find({ userId })
      .populate('roundId', 'roundNumber winningNumber endedAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return { data, total };
  },

  async getStats() {
    const [totalBets, totalWins, rounds] = await Promise.all([
      RouletteBet.countDocuments(),
      RouletteBet.countDocuments({ status: 'won' }),
      RouletteRound.countDocuments(),
    ]);
    return { totalBets, totalWins, rounds };
  },
};

async function getHistoryNumbers() {
  const rounds = await RouletteRound.find()
    .sort({ roundNumber: -1 })
    .limit(15)
    .select('roundNumber winningNumber endedAt');
  return rounds.map((r) => ({
    roundNumber: r.roundNumber,
    winningNumber: r.winningNumber,
    winningLabel: r.winningNumber >= 0 && r.winningNumber <= 36 ? wheelNumberLabel(r.winningNumber) : '—',
    endedAt: r.endedAt,
  }));
}
