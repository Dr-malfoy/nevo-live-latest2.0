import { TeenPattiRound, TeenPattiBet, User, Transaction } from '../models';
import { getIO } from '../socket';
import { AppError } from '../middleware/errorHandler';
import {
  createDeck,
  shuffleDeck,
  evaluateHand,
  compareHands,
  HAND_NAMES,
  TPCard,
  HandResult,
} from '../utils/teenpattiHand';

// ─── Configuration ───────────────────────────────────────────────────
const MIN_BET = 5; // min bet per turn in diamonds
const MAX_BET = 100000; // max bet
const DEAL_DELAY_MS = 500; // brief card dealing animation before showdown reveal on felt
const SHOWDOWN_DISPLAY_MS = 5000; // cards show on the deck for 5 seconds before result pop-up window
const RESULT_RESET_MS = 8000; // auto-seat new players after result modal if left idle

export type Currency = 'diamond' | 'coin';
export type Action = 'fold' | 'call' | 'raise' | 'see' | 'show' | 'bet' | 'reset';

// Authentic Bangladeshi player profiles — NO "(Bot)" tags!
export const BANGLADESHI_PLAYERS = [
  {
    name: 'Tanvir Ahmed',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Sadia Islam',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Arafat Hossain',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Nusrat Jahan',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Shakib Hasan',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Mehedi Miraz',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Tamim Iqbal',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Sabrina Sultana',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Fahim Chowdhury',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Tasnim Rahman',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Rifat Karim',
    avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Nabila Akter',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Anik Roy',
    avatar: 'https://images.unsplash.com/photo-1517070208541-6ddc4d3efbcb?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Mim Akter',
    avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Sabbir Khan',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Shanto Paul',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Rafiul Islam',
    avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Farhan Ahmed',
    avatar: 'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Sumaiya Khan',
    avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=120&h=120&fit=crop&crop=faces',
  },
  {
    name: 'Mahmudul Hasan',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=faces',
  },
];

// Pick 3 distinct random Bangladeshi opponents
function pickRandomBangladeshiOpponents() {
  const shuffled = [...BANGLADESHI_PLAYERS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((p, idx) => ({
    userId: `bd_player_${idx + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    nickname: p.name,
    avatar: p.avatar,
    socketIds: new Set<string>(),
    seen: false,
    folded: false,
    active: true,
    cards: [] as TPCard[],
    roundContributed: 0,
    sessionContributed: 0,
    connected: true,
    turnStartedAt: 0,
    isBot: false, // NO "(Bot)" tags!
  }));
}

export interface Seat {
  userId: string;
  nickname: string;
  avatar: string;
  socketIds: Set<string>;
  seen: boolean;
  folded: boolean;
  active: boolean;
  cards: TPCard[];
  roundContributed: number;
  sessionContributed: number;
  connected: boolean;
  turnStartedAt: number;
  isBot?: boolean;
}

export interface Table {
  id: string;
  currency: Currency;
  seats: Seat[];
  phase: 'lobby' | 'countdown' | 'betting' | 'dealing' | 'showdown';
  pot: number;
  stake: number;
  roundContributed: number;
  raises: number;
  turnIndex: number;
  roundNumber: number;
  roundId: string | null;
  countdownTo: number;
  turnDeadline: number;
  result: any;
  timers: NodeJS.Timeout[];
  lock: Promise<any>;
}

// ─── Engine state ────────────────────────────────────────────────────
let running = false;
const tables = new Map<string, Table>();
const queues: Record<Currency, string[]> = { diamond: [], coin: [] };
let queueEmitTimer: NodeJS.Timeout | null = null;
const socketsByUser = new Map<string, Set<string>>();
let nextTableId = 1;
let nextRoundNumber = 0;
const userWinStreaks = new Map<string, number>();
const userSpinCounts = new Map<string, number>();

const getRoom = (tableId: string) => `teenpatti:${tableId}`;
const getTable = (id: string) => tables.get(id);

function makeId(): string {
  return `tp_${Date.now().toString(36)}_${(nextTableId++).toString(36)}`;
}

function broadcast(event: string, data: any) {
  try {
    const io = getIO();
    io.emit(event, data);
    io.of('/teenpatti').emit(event, data);
  } catch {}
}

function broadcastToTable(table: Table, event: string, data: any) {
  try {
    const io = getIO();
    const room = getRoom(table.id);
    io.to(room).emit(event, data);
    io.of('/teenpatti').to(room).emit(event, data);
  } catch {}
}

function pushBalance(userId: string, currency: Currency, newBalance: number) {
  try {
    const io = getIO();
    const cleanBalance = Math.floor(newBalance);
    io.to(`user:${userId}`).emit('balance:update', {
      [currency === 'diamond' ? 'diamonds' : 'coins']: cleanBalance,
    });
  } catch {}
}

function seatState(seat: Seat, isYou: boolean, showAll = false) {
  const cardsRevealed = showAll || (isYou && seat.seen);
  const handRankName = seat.cards?.length === 3 && (showAll || isYou)
    ? HAND_NAMES[evaluateHand(seat.cards).rank]
    : undefined;

  return {
    userId: seat.userId,
    nickname: seat.nickname,
    avatar: seat.avatar,
    seen: seat.seen,
    folded: seat.folded,
    active: seat.active,
    connected: seat.connected,
    roundContributed: seat.roundContributed,
    sessionContributed: seat.sessionContributed,
    isYou,
    isBot: false,
    handRankName,
    cards: cardsRevealed
      ? seat.cards
      : seat.cards.map(() => ({ back: true })),
  };
}

function tableState(table: Table, userId?: string, showAll = false) {
  return {
    tableId: table.id,
    currency: table.currency,
    phase: table.phase,
    pot: table.pot,
    stake: table.stake,
    roundNumber: table.roundNumber,
    roundId: table.roundId,
    raises: table.raises,
    turnIndex: table.turnIndex,
    countdownTo: table.phase === 'countdown' ? table.countdownTo : 0,
    turnDeadline: table.phase === 'betting' ? table.turnDeadline : 0,
    seats: table.seats.map((s) => seatState(s, userId ? s.userId === userId : false, showAll)),
  };
}

function lobbyState(currency: Currency) {
  return {
    currency,
    inQueue: queues[currency].length,
    tables: [...tables.values()]
      .filter((t) => t.currency === currency)
      .map((t) => ({
        id: t.id,
        phase: t.phase,
        players: t.seats.length,
        pot: t.pot,
      })),
  };
}

function emitLobby(currency: Currency) {
  broadcast('teenpatti:lobby', lobbyState(currency));
}

function emitTable(table: Table) {
  try {
    const io = getIO();
    const showAll = table.phase === 'showdown';

    // 1. Deliver personalized state directly to human player
    for (const seat of table.seats) {
      if (seat.connected && !seat.isBot) {
        try {
          const pState = tableState(table, seat.userId, showAll);
          io.to(`user:${seat.userId}`).emit('teenpatti:table', pState);
          if (seat.cards.length) {
            io.to(`user:${seat.userId}`).emit('teenpatti:cards', {
              tableId: table.id,
              cards: seat.cards,
              seen: seat.seen,
            });
          }
        } catch {}
      }
    }

    // 2. Broadcast public state to the table room
    broadcastToTable(table, 'teenpatti:table', tableState(table, undefined, showAll));
  } catch {}
}

function withTable(table: Table, fn: () => Promise<void> | void): Promise<void> {
  const run = table.lock.then(async () => {
    try {
      await fn();
    } catch (e) {
      console.error(`[TeenPatti] table ${table.id} error:`, e);
    }
  });
  table.lock = run.catch(() => undefined);
  return run;
}

function clearTimers(table: Table) {
  for (const t of table.timers) clearTimeout(t);
  table.timers = [];
}

function seatOf(table: Table, userId: string): Seat | undefined {
  return table.seats.find((s) => s.userId === userId);
}

// Seat 3 random Bangladeshi players around the table
function seatFreshOpponents(table: Table) {
  const humanSeat = table.seats.find((s) => s.connected && !s.isBot);
  const opponents = pickRandomBangladeshiOpponents();
  if (humanSeat) {
    table.seats = [humanSeat, ...opponents];
  } else {
    table.seats = opponents;
  }
}

// Controlled deal function ensuring realistic Teen Patti cards from a valid 52-card deck.
// - When shouldUserWin === true: guarantees Seat 0 (Human Player) has the winning hand.
// - When shouldUserWin === false: guarantees an opponent has a higher hand than Seat 0.
function dealControlledHands(deck: TPCard[], shouldUserWin: boolean): TPCard[][] {
  const hands: TPCard[][] = [
    deck.slice(0, 3),   // Human Player (Seat 0)
    deck.slice(3, 6),   // Opponent 1
    deck.slice(6, 9),   // Opponent 2
    deck.slice(9, 12),  // Opponent 3
  ];

  const evaluated = hands.map((h, idx) => ({
    idx,
    hand: evaluateHand(h),
  }));

  // Sort hands descending: best hand first (compareHands negative means a is better than b)
  evaluated.sort((a, b) => compareHands(a.hand, b.hand));
  const bestHandIdx = evaluated[0].idx;

  if (shouldUserWin) {
    // If Human is not holding the best hand, swap with the best hand
    if (bestHandIdx !== 0) {
      const temp = hands[0];
      hands[0] = hands[bestHandIdx];
      hands[bestHandIdx] = temp;
    }
  } else {
    // Human should lose: ensure at least one opponent has a strictly better hand
    const humanEval = evaluateHand(hands[0]);
    const isHumanHighest = !evaluated.some(
      (e) => e.idx !== 0 && compareHands(e.hand, humanEval) < 0
    );

    if (isHumanHighest) {
      // Human is currently highest or tied: swap human hand with the lowest or second-best hand
      const targetIdx = evaluated[evaluated.length - 1].idx !== 0
        ? evaluated[evaluated.length - 1].idx
        : evaluated[1].idx;
      const temp = hands[0];
      hands[0] = hands[targetIdx];
      hands[targetIdx] = temp;
    }
  }

  return hands;
}

// Core Execution: Bet -> Deal -> Showdown -> 2X Winner Calculation
async function executeBetRound(table: Table, humanSeat: Seat, betAmount: number) {
  clearTimers(table);
  nextRoundNumber = (nextRoundNumber || 0) + 1;
  const roundNumber = nextRoundNumber;

  table.roundNumber = roundNumber;
  table.stake = betAmount;
  table.pot = betAmount * 4; // Human bet + 3 matched opponent bets
  table.roundContributed = betAmount;
  table.result = null;
  table.phase = 'dealing';

  // Dynamic 100-spin cycle & probability distribution:
  // - 1000 💎: overall 35% win probability (higher probability between spins 15-90)
  // - 500 💎: overall 40% win probability (higher probability between spins 15-90)
  // - Other bets (10, 20, 50, 100 💎): overall 50% win probability (higher probability from spin 6 to 100)
  // - Anti-consecutive streak: right after winning, back-to-back win is rare (~8-16%)
  // - All outcomes are evaluated randomly per spin
  const currentStreak = userWinStreaks.get(humanSeat.userId) || 0;
  const userTotalSpins = (userSpinCounts.get(humanSeat.userId) || 0) + 1;
  userSpinCounts.set(humanSeat.userId, userTotalSpins);
  const cycleSpin = ((userTotalSpins - 1) % 100) + 1; // 1 to 100

  let winChance: number;
  if (betAmount >= 1000) {
    // 1000 💎 bet -> 35% overall win rate
    if (cycleSpin <= 14) {
      winChance = currentStreak >= 1 ? 0.04 : 0.20;
    } else if (cycleSpin <= 90) {
      // Spins 15-90: High win probability phase
      if (currentStreak >= 2) winChance = 0.02;
      else if (currentStreak === 1) winChance = 0.10;
      else winChance = 0.595;
    } else {
      winChance = currentStreak >= 1 ? 0.06 : 0.32;
    }
  } else if (betAmount >= 500) {
    // 500 💎 bet -> 40% overall win rate
    if (cycleSpin <= 14) {
      winChance = currentStreak >= 1 ? 0.05 : 0.25;
    } else if (cycleSpin <= 90) {
      // Spins 15-90: High win probability phase
      if (currentStreak >= 2) winChance = 0.02;
      else if (currentStreak === 1) winChance = 0.12;
      else winChance = 0.705;
    } else {
      winChance = currentStreak >= 1 ? 0.08 : 0.45;
    }
  } else {
    // 10, 20, 50, 100 💎 bets -> 50% overall win rate
    if (cycleSpin <= 5) {
      winChance = currentStreak >= 1 ? 0.08 : 0.40;
    } else {
      // Spins 6-100: High win probability phase (after 5 spins)
      if (currentStreak >= 2) winChance = 0.02;
      else if (currentStreak === 1) winChance = 0.16;
      else winChance = 0.89;
    }
  }
  const shouldUserWin = Math.random() < winChance;

  // Shuffle 52-card deck and deal controlled hands according to configured win rate
  const deck = shuffleDeck(createDeck());
  const dealtHands = dealControlledHands(deck, shouldUserWin);

  table.seats.forEach((seat, idx) => {
    seat.cards = dealtHands[idx];
    // Reveal human user cards immediately on the table deck as soon as dealt!
    seat.seen = seat.userId === humanSeat.userId;
    seat.folded = false;
    seat.active = true;
    seat.roundContributed = betAmount;
    seat.sessionContributed += betAmount;
  });

  // Save round in DB
  try {
    table.roundId = String((await TeenPattiRound.create({
      roundNumber,
      tableId: table.id,
      currency: table.currency,
      pot: table.pot,
      stake: table.stake,
      houseCut: 0,
      status: 'betting',
      startedAt: new Date(),
    }))._id);

    await TeenPattiBet.create({
      userId: humanSeat.userId,
      roundId: table.roundId,
      currency: table.currency,
      ante: betAmount,
      totalBet: betAmount,
      winAmount: 0,
      status: 'playing',
    });

    await Transaction.create({
      userId: humanSeat.userId,
      type: 'game_bet',
      amount: betAmount,
      currency: table.currency,
      status: 'completed',
      description: `Teen Patti bet (${betAmount} 💎)`,
    });
  } catch (err) {
    console.error('[TeenPatti] DB round creation error:', err);
  }

  // Emit table in dealing phase (cards dealt face down)
  broadcastToTable(table, 'teenpatti:result', null);
  emitTable(table);

  // After dealing animation delay (1.4s), trigger Showdown!
  const showdownTimer = setTimeout(() => {
    withTable(table, async () => {
      await executeShowdown(table, humanSeat, betAmount);
    });
  }, DEAL_DELAY_MS);
  table.timers.push(showdownTimer);
}

// Showdown: Reveal all cards, compare hands, award 2X Diamonds on higher hand
async function executeShowdown(table: Table, humanSeat: Seat, betAmount: number) {
  table.phase = 'showdown';

  // Reveal all cards
  table.seats.forEach((s) => {
    s.seen = true;
  });

  // Evaluate all 4 hands
  const evaluated = table.seats.map((seat) => {
    const hand = evaluateHand(seat.cards);
    return {
      seat,
      hand,
      handName: HAND_NAMES[hand.rank],
    };
  });

  // Sort hands using official Teen Patti ranking rules
  // compareHands: negative means a is better than b
  const sorted = [...evaluated].sort((a, b) => compareHands(a.hand, b.hand));
  const best = sorted[0];

  // Check if Human User has the winning (highest) hand
  const isHumanWinner = best.seat.userId === humanSeat.userId;
  const winPayout = isHumanWinner ? Math.floor(betAmount * 2) : 0;

  // Update consecutive win streak
  if (isHumanWinner) {
    const prevStreak = userWinStreaks.get(humanSeat.userId) || 0;
    userWinStreaks.set(humanSeat.userId, prevStreak + 1);
  } else {
    userWinStreaks.set(humanSeat.userId, 0);
  }

  if (isHumanWinner) {
    // Credit 2X Diamonds directly to user's MongoDB account!
    try {
      const updatedUser = await User.findByIdAndUpdate(
        humanSeat.userId,
        { $inc: { diamonds: winPayout } },
        { new: true }
      );
      if (updatedUser) {
        pushBalance(humanSeat.userId, 'diamond', updatedUser.diamonds);
      }

      if (table.roundId) {
        await TeenPattiBet.updateOne(
          { roundId: table.roundId, userId: humanSeat.userId },
          { $set: { status: 'won', winAmount: winPayout, handRank: best.hand.rank, handName: best.handName } }
        );
        await Transaction.create({
          userId: humanSeat.userId,
          type: 'game_win',
          amount: winPayout,
          currency: 'diamond',
          status: 'completed',
          description: `Teen Patti 2X Win (${best.handName}) — ${winPayout} 💎`,
        });
      }
    } catch (err) {
      console.error('[TeenPatti] Payout error:', err);
    }
  } else {
    // Human lost this round
    if (table.roundId) {
      const humanEval = evaluated.find((e) => e.seat.userId === humanSeat.userId);
      await TeenPattiBet.updateOne(
        { roundId: table.roundId, userId: humanSeat.userId },
        { $set: { status: 'lost', handRank: humanEval?.hand.rank, handName: humanEval?.handName } }
      ).catch(() => {});
    }
  }

  if (table.roundId) {
    await TeenPattiRound.updateOne(
      { _id: table.roundId },
      { $set: { status: 'ended', winnerId: best.seat.userId, endedAt: new Date() } }
    ).catch(() => {});
  }

  // Construct Result Payload for client
  const resultPayload = {
    tableId: table.id,
    pot: table.pot,
    payout: winPayout,
    isHumanWinner,
    winners: [
      {
        userId: best.seat.userId,
        nickname: best.seat.nickname,
        handName: best.handName,
        cards: best.seat.cards,
        isBot: false,
      },
    ],
    hands: evaluated.map((e) => ({
      userId: e.seat.userId,
      nickname: e.seat.nickname,
      handName: e.handName,
      cards: e.seat.cards,
      folded: false,
      isWinner: e.seat.userId === best.seat.userId,
    })),
    seats: table.seats.map((s) => seatState(s, s.userId === humanSeat.userId, true)),
  };

  // Cards remain visible on the felt deck for 5 seconds before the result pop-up window appears!
  table.result = null;
  emitTable(table);

  // After 5 seconds of cards displaying on the table deck, pop up the winner modal window!
  const popupTimer = setTimeout(() => {
    withTable(table, async () => {
      table.result = resultPayload;
      broadcastToTable(table, 'teenpatti:result', resultPayload);
      emitTable(table);
    });
  }, SHOWDOWN_DISPLAY_MS);
  table.timers.push(popupTimer);

  // Auto-reset fallback timer (5s deck card display + 8s result modal = 13s total)
  const resetTimer = setTimeout(() => {
    withTable(table, async () => {
      resetTableForNextRound(table);
    });
  }, SHOWDOWN_DISPLAY_MS + RESULT_RESET_MS);
  table.timers.push(resetTimer);
}

// Reset table and seat 3 fresh random Bangladeshi opponents
function resetTableForNextRound(table: Table) {
  clearTimers(table);
  table.phase = 'betting';
  table.pot = 0;
  table.result = null;
  table.roundId = null;

  // Seat 3 fresh random Bangladeshi opponents
  seatFreshOpponents(table);

  // Reset player cards
  table.seats.forEach((seat) => {
    seat.cards = [];
    seat.seen = false;
    seat.folded = false;
    seat.active = true;
    seat.roundContributed = 0;
  });

  broadcastToTable(table, 'teenpatti:result', null);
  emitTable(table);
}

async function createTable(currency: Currency): Promise<Table> {
  const table: Table = {
    id: makeId(),
    currency,
    seats: [],
    phase: 'betting',
    pot: 0,
    stake: 50,
    roundContributed: 0,
    raises: 0,
    turnIndex: 0,
    roundNumber: 0,
    roundId: null,
    countdownTo: 0,
    turnDeadline: 0,
    result: null,
    timers: [],
    lock: Promise.resolve(),
  };

  // Seat 3 random Bangladeshi opponents
  table.seats = pickRandomBangladeshiOpponents();
  tables.set(table.id, table);
  return table;
}

export const teenPattiService = {
  async start() {
    if (running) return;
    running = true;
    console.log('🃏 Teen Patti Bangladeshi Multiplayer Casino Engine Started');

    const last = await TeenPattiRound.findOne().sort({ roundNumber: -1 }).select('roundNumber');
    nextRoundNumber = last?.roundNumber || 0;

    await TeenPattiBet.updateMany({ status: 'playing' }, { $set: { status: 'lost' } });
    await TeenPattiRound.updateMany(
      { status: { $in: ['betting', 'dealing', 'showdown'] } },
      { $set: { status: 'ended', endedAt: new Date() } }
    );

    queueEmitTimer = setInterval(() => {
      broadcast('teenpatti:lobby', lobbyState('diamond'));
      broadcast('teenpatti:lobby', lobbyState('coin'));
    }, 5000);
  },

  isRunning() {
    return running;
  },

  bindSocket(socket: any, userId: string) {
    const set = socketsByUser.get(userId) || new Set<string>();
    set.add(socket.id);
    socketsByUser.set(userId, set);
  },

  unbindSocket(socket: any, userId: string) {
    const set = socketsByUser.get(userId);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) socketsByUser.delete(userId);
    }
  },

  async joinQueue(userId: string, currency: Currency) {
    const user = await User.findById(userId).select('nickname avatar isBanned diamonds coins');
    if (!user) throw new AppError('User not found', 404);
    if (user.isBanned) throw new AppError('You are not allowed to play', 403);

    for (const table of tables.values()) {
      if (table.currency !== currency) continue;
      const existing = seatOf(table, userId);
      if (existing) {
        existing.connected = true;
        return { tableId: table.id };
      }
    }

    const table = (await createTable(currency));

    // Seat Human Player at Seat 0
    const humanSeat: Seat = {
      userId,
      nickname: user.nickname || 'Player',
      avatar: user.avatar || '',
      socketIds: new Set(),
      seen: false,
      folded: false,
      active: true,
      cards: [],
      roundContributed: 0,
      sessionContributed: 0,
      connected: true,
      turnStartedAt: 0,
      isBot: false,
    };

    // Human player at bottom (Seat 0), with 3 random Bangladeshi opponents
    table.seats = [humanSeat, ...pickRandomBangladeshiOpponents()];

    emitLobby(currency);
    emitTable(table);

    return { tableId: table.id, table: tableState(table, userId) };
  },

  async leaveTable(userId: string, currency: Currency) {
    for (const table of tables.values()) {
      if (table.currency !== currency) continue;
      const seat = seatOf(table, userId);
      if (!seat) continue;

      table.seats = table.seats.filter((s) => s.userId !== userId);
      const hasHuman = table.seats.some((s) => s.connected && !s.isBot);
      if (!hasHuman) {
        clearTimers(table);
        tables.delete(table.id);
      }
      emitTable(table);
      emitLobby(currency);
    }
  },

  async playerAction(userId: string, tableId: string, action: Action, _amount?: number) {
    const table = getTable(tableId);
    if (!table) throw new AppError('Table not found', 404);
    const seat = seatOf(table, userId);
    if (!seat) throw new AppError('You are not at this table', 400);

    // Reset action: Immediately seat fresh Bangladeshi players and reset table
    if (action === 'reset') {
      await withTable(table, async () => {
        resetTableForNextRound(table);
      });
      return { ok: true, action: 'reset' };
    }

    // See cards peek
    if (action === 'see') {
      seat.seen = true;
      emitTable(table);
      return { ok: true, action: 'see' };
    }

    // Primary Bet Action: Place Diamond Bet -> Deal Cards -> Showdown -> 2X Payout
    if (action === 'bet' || action === 'call') {
      const betAmount = Math.max(MIN_BET, Math.floor(_amount || table.stake || 10));

      const user = await User.findById(userId).select('diamonds');
      if (!user || (user.diamonds ?? 0) < betAmount) {
        throw new AppError('Insufficient diamonds balance', 400);
      }

      // Deduct bet amount in Diamonds
      const updated = await User.findByIdAndUpdate(
        userId,
        { $inc: { diamonds: -betAmount } },
        { new: true }
      );
      if (updated) {
        pushBalance(userId, 'diamond', updated.diamonds);
      }

      await withTable(table, async () => {
        await executeBetRound(table, seat, betAmount);
      });

      return { ok: true, action: 'bet', betAmount };
    }

    // Fold action
    if (action === 'fold') {
      seat.folded = true;
      seat.active = false;
      emitTable(table);
      return { ok: true, action: 'fold' };
    }

    return { ok: true };
  },

  getState(tableId: string, userId?: string) {
    const table = getTable(tableId);
    if (!table) return null;
    return tableState(table, userId, table.phase === 'showdown');
  },

  getLobbyState(currency: Currency) {
    return lobbyState(currency);
  },

  async getUserHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      TeenPattiBet.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('roundId', 'roundNumber pot winnerId endedAt houseCut currency')
        .lean(),
      TeenPattiBet.countDocuments({ userId }),
    ]);
    return { data, total };
  },

  async getStats() {
    const [totalRounds, totalBets, totalWins] = await Promise.all([
      TeenPattiRound.countDocuments({ status: 'ended' }),
      TeenPattiBet.aggregate([
        { $group: { _id: null, total: { $sum: '$totalBet' }, count: { $sum: 1 } } },
      ]),
      TeenPattiBet.aggregate([
        { $match: { status: 'won' } },
        { $group: { _id: null, total: { $sum: '$winAmount' }, count: { $sum: 1 } } },
      ]),
    ]);
    return {
      totalRounds,
      totalBetAmount: totalBets[0]?.total || 0,
      totalWinAmount: totalWins[0]?.total || 0,
      totalBetsPlaced: totalBets[0]?.count || 0,
    };
  },
};
