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

// ─── Configuration (regulating conditions, mirrors Aviator) ──────────
const MIN_BET = 1; // min stake
const MAX_BET = 100000; // max stake (capped raise)
const BOOT = 5; // ante per player per round
const RAISE_MULT = 2; // a raise doubles the stake
const MAX_RAISES = 4; // max raises per round
const TURN_MS = 20000; // seconds per player turn (auto-fold on timeout)
const COUNTDOWN_MS = 5000; // pre-round countdown once 3+ players seated
const RESULT_MS = 6000; // result screen before next round
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 6;
const RTP = 0.97; // ~97% return to player → 3% house cut on the pot

type Currency = 'diamond' | 'coin';
type Action = 'fold' | 'call' | 'raise' | 'see';

interface Seat {
  userId: string;
  nickname: string;
  avatar: string;
  socketIds: Set<string>;
  seen: boolean; // saw cards (vs blind)
  folded: boolean;
  active: boolean; // still in this round
  cards: TPCard[];
  roundContributed: number; // contributed this round
  sessionContributed: number; // total staked at this table (for history chip display)
  connected: boolean;
  turnStartedAt: number;
}

interface Table {
  id: string;
  currency: Currency;
  seats: Seat[];
  phase: 'lobby' | 'countdown' | 'betting' | 'showdown';
  pot: number;
  stake: number; // current bet to match
  roundContributed: number; // highest contributed by any player this round
  raises: number;
  turnIndex: number; // index into seats of the player to act
  roundNumber: number;
  roundId: string | null;
  countdownTo: number;
  turnDeadline: number;
  result: any; // last round result for display
  timers: NodeJS.Timeout[];
  lock: Promise<any>;
}

// ─── Engine state ────────────────────────────────────────────────────
let running = false;
const tables = new Map<string, Table>();
const queues: Record<Currency, string[]> = { diamond: [], coin: [] };
let queueEmitTimer: NodeJS.Timeout | null = null;
const socketsByUser = new Map<string, Set<string>>(); // userId → socket ids
let nextTableId = 1;
let nextRoundNumber = 0;

const tableKey = (currency: Currency) => `tp:${currency}`;
const getRoom = (tableId: string) => `teenpatti:${tableId}`;
const getTable = (id: string) => tables.get(id);

function makeId(): string {
  return `t${Date.now().toString(36)}${(nextTableId++).toString(36)}`;
}

function broadcast(event: string, data: any) {
  try {
    getIO().emit(event, data);
    getIO().of('/teenpatti').emit(event, data);
  } catch {
    // socket not initialized yet
  }
}

function broadcastToTable(table: Table, event: string, data: any) {
  try {
    getIO().to(getRoom(table.id)).emit(event, data);
  } catch {
    // socket not initialized yet
  }
}

async function emitPrivate(table: Table, userId: string, event: string, data: any) {
  try {
    const io = getIO();
    const socketIds = socketsByUser.get(userId) || new Set<string>();
    for (const sid of socketIds) {
      const socket = io.sockets.sockets.get(sid);
      if (socket) socket.emit(event, data);
    }
  } catch {
    // socket not initialized
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

function seatState(s: Seat, self: boolean) {
  return {
    userId: s.userId,
    nickname: s.nickname,
    avatar: s.avatar,
    seen: s.seen,
    folded: s.folded,
    active: s.active,
    connected: s.connected,
    roundContributed: s.roundContributed,
    sessionContributed: s.sessionContributed,
    cards: self ? s.cards : s.cards.map(() => ({ back: true })),
    isYou: self,
  };
}

function tableState(table: Table, userId?: string) {
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
    seats: table.seats.map((s) => seatState(s, userId ? s.userId === userId : false)),
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
  broadcastToTable(table, 'teenpatti:table', tableState(table));
  // Private card delivery
  for (const seat of table.seats) {
    if (seat.cards.length) emitPrivate(table, seat.userId, 'teenpatti:cards', {
      tableId: table.id,
      cards: seat.cards,
      seen: seat.seen,
    });
  }
}

// Lock every table-mutating step so simultaneous socket actions can't interleave
function withTable(table: Table, fn: () => Promise<void> | void): Promise<void> {
  const run = table.lock.then(async () => {
    try {
      await fn();
    } catch (e) {
      console.error(`[TeenPatti] table ${table.id} step error:`, e);
    }
  });
  table.lock = run.catch(() => undefined);
  return run;
}

function clearTimers(table: Table) {
  for (const t of table.timers) clearTimeout(t);
  table.timers = [];
}

function clearTurnTimer(table: Table) {
  for (const t of table.timers) clearTimeout(t);
  table.timers = [];
}

function seatOf(table: Table, userId: string): Seat | undefined {
  return table.seats.find((s) => s.userId === userId);
}

function activeSeats(table: Table): Seat[] {
  return table.seats.filter((s) => s.active && !s.folded);
}

function nextTurnIndex(table: Table, from = table.turnIndex): number | null {
  const n = table.seats.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    const s = table.seats[idx];
    if (s.active && !s.folded) return idx;
  }
  return null;
}

function setTurn(table: Table, index: number) {
  table.turnIndex = index;
  table.turnDeadline = Date.now() + TURN_MS;
  const seat = table.seats[index];
  if (seat) seat.turnStartedAt = Date.now();
}

function scheduleTurnTimeout(table: Table) {
  const t = setTimeout(() => {
    withTable(table, async () => {
      if (table.phase !== 'betting') return;
      const idx = table.turnIndex;
      const seat = table.seats[idx];
      if (!seat || !seat.active || seat.folded) return;
      // Auto-fold on timeout
      seat.folded = true;
      seat.active = false;
      await persistFolded(table, seat);
      await afterAction(table, idx, 'fold');
    });
  }, TURN_MS + 300);
  table.timers.push(t);
}

async function startRound(table: Table) {
  clearTurnTimer(table);
  nextRoundNumber = (nextRoundNumber || 0) + 1;
  const roundNumber = nextRoundNumber;

  table.roundNumber = roundNumber;
  table.phase = 'betting';
  table.stake = MIN_BET;
  table.roundContributed = 0;
  table.raises = 0;
  table.pot = 0;
  table.result = null;
  table.roundId = null;

  // Deal cards
  const deck = shuffleDeck(createDeck());
  const seatOrder = [...table.seats];
  let ci = 0;
  for (const seat of seatOrder) {
    seat.cards = deck.slice(ci, ci + 3);
    ci += 3;
    seat.seen = false;
    seat.folded = false;
    seat.active = true;
    seat.roundContributed = 0;
  }

  // Ante (boot) — atomic deduction per player
  for (const seat of seatOrder) {
    const query = table.currency === 'diamond'
      ? { _id: seat.userId, diamonds: { $gte: BOOT } }
      : { _id: seat.userId, coins: { $gte: BOOT } };
    const inc = table.currency === 'diamond' ? { diamonds: -BOOT } : { coins: -BOOT };
    const updated = await User.findOneAndUpdate(query, { $inc: inc }, { new: true });
    if (!updated) {
      // Can't pay the boot → drop from the round (and stay seated)
      seat.active = false;
      seat.folded = true;
      seat.cards = [];
      continue;
    }
    seat.roundContributed = BOOT;
    seat.sessionContributed += BOOT;
    table.pot += BOOT;
    pushBalance(seat.userId, table.currency, table.currency === 'diamond' ? updated.diamonds : updated.coins);
  }

  // Persist round + bets
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

  for (const seat of table.seats) {
    if (!seat.cards.length) continue;
    await TeenPattiBet.create({
      userId: seat.userId,
      roundId: table.roundId,
      currency: table.currency,
      ante: BOOT,
      totalBet: seat.roundContributed,
      winAmount: 0,
      status: 'playing',
    });
  }

  await Transaction.create(
    table.seats
      .filter((s) => s.cards.length)
      .map((s) => ({
        userId: s.userId,
        type: 'game_bet' as const,
        amount: BOOT,
        currency: table.currency,
        status: 'completed' as const,
        description: `Teen Patti boot (${BOOT} ${table.currency})`,
      }))
  );

  // If fewer than 2 players can play, bail out
  if (activeSeats(table).length < 2) {
    await endRoundEarly(table, 'not enough players');
    return;
  }

  const firstIdx = table.seats.findIndex((s) => s.active && !s.folded);
  if (firstIdx >= 0) {
    setTurn(table, firstIdx);
    scheduleTurnTimeout(table);
  }

  emitTable(table);
  broadcast('teenpatti:history', await getHistoryNumbers(table.currency));
}

async function persistContribution(table: Table, seat: Seat, amount: number) {
  if (!table.roundId || amount <= 0) return;
  await TeenPattiBet.updateOne(
    { roundId: table.roundId, userId: seat.userId },
    { $inc: { totalBet: amount } }
  );
  await Transaction.create({
    userId: seat.userId,
    type: 'game_bet',
    amount,
    currency: table.currency,
    status: 'completed',
    description: `Teen Patti bet (${amount} ${table.currency})`,
  });
}

async function persistFolded(table: Table, seat: Seat) {
  if (!table.roundId) return;
  await TeenPattiBet.updateOne(
    { roundId: table.roundId, userId: seat.userId },
    { $set: { status: 'folded' } }
  );
}

// After an action: check win-by-default, showdown, or advance turn
async function afterAction(table: Table, fromIdx: number, _action: Action) {
  const active = activeSeats(table);

  if (active.length === 0) {
    // Everyone folded (edge) — return the pot? Keep the house edge simple: roll back
    await endRoundEarly(table, 'all folded');
    return;
  }

  if (active.length === 1) {
    // Single player left → they win the pot immediately
    await showdown(table, [active[0]]);
    return;
  }

  // Everyone active matched the stake → showdown
  const allMatched = active.every((s) => s.roundContributed === table.roundContributed);
  if (allMatched && table.roundContributed >= table.stake) {
    await showdown(table, active);
    return;
  }

  const next = nextTurnIndex(table, fromIdx);
  if (next === null) {
    await showdown(table, active);
    return;
  }
  setTurn(table, next);
  scheduleTurnTimeout(table);
  emitTable(table);
}

async function endRoundEarly(table: Table, reason: string) {
  // Refund contributions when there is no winner
  for (const seat of table.seats) {
    if (seat.roundContributed > 0) {
      await User.updateOne({ _id: seat.userId }, { $inc: { [table.currency]: seat.roundContributed } });
      pushBalance(seat.userId, table.currency, 0);
    }
    seat.roundContributed = 0;
  }
  if (table.roundId) {
    await TeenPattiRound.updateOne({ _id: table.roundId }, { $set: { status: 'ended', endedAt: new Date() } });
  }
  table.result = { reason, seats: table.seats.map((s) => seatState(s, false)) };
  table.phase = 'lobby';
  clearTurnTimer(table);
  broadcastToTable(table, 'teenpatti:result', table.result);
  table.roundId = null;
  emitTable(table);
  emitLobby(table.currency);
  table.countdownTo = Date.now() + COUNTDOWN_MS;
  const t = setTimeout(() => {
    withTable(table, async () => {
      if (table.seats.length >= MIN_PLAYERS && table.phase === 'lobby') {
        table.phase = 'countdown';
        table.countdownTo = Date.now() + COUNTDOWN_MS;
        emitTable(table);
        const t2 = setTimeout(() => {
          withTable(table, async () => {
            if (table.seats.length >= MIN_PLAYERS && table.phase === 'countdown') {
              await startRound(table);
            }
          });
        }, COUNTDOWN_MS);
        table.timers.push(t2);
      }
    });
  }, RESULT_MS);
  table.timers.push(t);
}

async function showdown(table: Table, contenders: Seat[]) {
  clearTurnTimer(table);
  table.phase = 'showdown';

  const evaluated: { seat: Seat; hand: HandResult; name: string }[] = contenders.map((seat) => {
    const hand = evaluateHand(seat.cards);
    return { seat, hand, name: HAND_NAMES[hand.rank] };
  });

  // Find best (ties split)
  const best = evaluated.reduce((acc, e) => {
    const c = compareHands(e.hand, acc.hand);
    return c < 0 ? e : acc;
  }, evaluated[0]);
  const winners = evaluated.filter((e) => compareHands(e.hand, best.hand) === 0);

  const houseCut = Math.round(table.pot * (1 - RTP));
  const netPot = table.pot - houseCut;
  const perWinner = Math.floor(netPot / winners.length);

  for (const w of winners) {
    const seat = w.seat;
    await User.updateOne({ _id: seat.userId }, { $inc: { [table.currency]: perWinner } });
    await TeenPattiBet.updateOne(
      { roundId: table.roundId, userId: seat.userId },
      { $set: { status: 'won', winAmount: perWinner, handRank: w.hand.rank, handName: w.name } }
    );
    await Transaction.create({
      userId: seat.userId,
      type: 'game_win',
      amount: perWinner,
      currency: table.currency,
      status: 'completed',
      description: `Teen Patti win (${w.name}) — ${perWinner} ${table.currency}`,
    });
    pushBalance(seat.userId, table.currency, 0);
  }

  // Mark losers
  for (const seat of table.seats) {
    if (!seat.cards.length) continue;
    const isWinner = winners.some((w) => w.seat.userId === seat.userId);
    if (!isWinner && seat.active && !seat.folded) {
      await TeenPattiBet.updateOne(
        { roundId: table.roundId, userId: seat.userId },
        { $set: { status: 'lost', handRank: seat.cards.length ? evaluateHand(seat.cards).rank : undefined, handName: seat.cards.length ? HAND_NAMES[evaluateHand(seat.cards).rank] : undefined } }
      );
    }
  }

  await TeenPattiRound.updateOne(
    { _id: table.roundId },
    {
      $set: {
        status: 'ended',
        endedAt: new Date(),
        pot: table.pot,
        houseCut,
        winnerId: winners.length === 1 ? winners[0].seat.userId : undefined,
      },
    }
  );

  table.result = {
    tableId: table.id,
    winners: winners.map((w) => ({
      userId: w.seat.userId,
      nickname: w.seat.nickname,
      handName: w.name,
      cards: w.seat.cards,
    })),
    houseCut,
    pot: table.pot,
    payout: perWinner,
    split: winners.length > 1,
    hands: table.seats.filter((s) => s.cards.length).map((s) => ({
      userId: s.userId,
      nickname: s.nickname,
      handName: s.cards.length ? HAND_NAMES[evaluateHand(s.cards).rank] : '—',
      cards: s.cards,
      folded: s.folded,
    })),
  };

  // Reset for next round
  for (const seat of table.seats) {
    seat.roundContributed = 0;
  }
  table.pot = 0;
  table.stake = MIN_BET;
  table.roundContributed = 0;
  table.raises = 0;
  table.roundId = null;
  table.phase = 'lobby';

  broadcastToTable(table, 'teenpatti:result', table.result);
  emitTable(table);
  emitLobby(table.currency);
  broadcast('teenpatti:history', await getHistoryNumbers(table.currency));

  // Start next round after result window
  const t = setTimeout(() => {
    withTable(table, async () => {
      if (table.seats.length >= MIN_PLAYERS && table.phase === 'lobby') {
        table.phase = 'countdown';
        table.countdownTo = Date.now() + COUNTDOWN_MS;
        emitTable(table);
        const t2 = setTimeout(() => {
          withTable(table, async () => {
            if (table.seats.length >= MIN_PLAYERS && table.phase === 'countdown') {
              await startRound(table);
            }
          });
        }, COUNTDOWN_MS);
        table.timers.push(t2);
      }
    });
  }, RESULT_MS);
  table.timers.push(t);
}

async function getHistoryNumbers(currency: Currency) {
  const rounds = await TeenPattiRound.find({ currency })
    .sort({ roundNumber: -1 })
    .limit(15)
    .select('roundNumber pot winnerId endedAt houseCut');
  return rounds;
}

async function createTable(currency: Currency): Promise<Table> {
  const table: Table = {
    id: makeId(),
    currency,
    seats: [],
    phase: 'lobby',
    pot: 0,
    stake: MIN_BET,
    roundContributed: 0,
    raises: 0,
    turnIndex: -1,
    roundNumber: 0,
    roundId: null,
    countdownTo: 0,
    turnDeadline: 0,
    result: null,
    timers: [],
    lock: Promise.resolve(),
  };
  tables.set(table.id, table);
  return table;
}

// ─── Public API ──────────────────────────────────────────────────────

export const teenPattiService = {
  async start() {
    if (running) return;
    running = true;
    console.log('🃏 Teen Patti game engine started');

    // Seed the next round number from the DB (max + 1, like Aviator)
    const last = await TeenPattiRound.findOne().sort({ roundNumber: -1 }).select('roundNumber');
    nextRoundNumber = last?.roundNumber || 0;

    // Reconcile orphaned bets from a previous run (same semantics as Aviator)
    await TeenPattiBet.updateMany(
      { status: 'playing' },
      { $set: { status: 'lost' } }
    );
    await TeenPattiRound.updateMany(
      { status: { $in: ['betting', 'showdown'] } },
      { $set: { status: 'ended', endedAt: new Date() } }
    );

    // Re-emit lobby state on a slow interval so a late-joining client syncs
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
    // Disconnect mid-game → fold their active seat(s)
    for (const table of tables.values()) {
      const seat = seatOf(table, userId);
      if (!seat || !seat.active || seat.folded || table.phase !== 'betting') continue;
      withTable(table, async () => {
        if (table.phase !== 'betting') return;
        const idx = table.seats.indexOf(seat);
        seat.folded = true;
        seat.active = false;
        await persistFolded(table, seat);
        await afterAction(table, idx, 'fold');
      });
    }
  },

  async joinQueue(userId: string, currency: Currency) {
    const user = await User.findById(userId).select('nickname avatar isBanned diamonds coins');
    if (!user) throw new AppError('User not found', 404);
    if (user.isBanned) throw new AppError('You are not allowed to play', 403);

    // Already seated somewhere → return that table
    for (const table of tables.values()) {
      if (table.currency !== currency) continue;
      if (seatOf(table, userId)) return { tableId: table.id };
    }

    // Remove from the other currency's queue if present
    const other: Currency = currency === 'diamond' ? 'coin' : 'diamond';
    queues[other] = queues[other].filter((id) => id !== userId);
    if (!queues[currency].includes(userId)) queues[currency].push(userId);

    // Find an open lobby table
    const candidates = [...tables.values()].filter(
      (t) => t.currency === currency && t.phase === 'lobby' && t.seats.length < MAX_PLAYERS
    );
    const table = candidates[0] || (await createTable(currency));

    // Seat them (they may already be a member of this table from a previous round)
    let seat = seatOf(table, userId);
    if (!seat) {
      seat = {
        userId,
        nickname: user.nickname || 'Player',
        avatar: user.avatar || '',
        socketIds: new Set(),
        seen: false,
        folded: false,
        active: false,
        cards: [],
        roundContributed: 0,
        sessionContributed: 0,
        connected: true,
        turnStartedAt: 0,
      };
      table.seats.push(seat);
    } else {
      seat.connected = true;
      seat.nickname = user.nickname || seat.nickname;
      seat.avatar = user.avatar || seat.avatar;
    }
    queues[currency] = queues[currency].filter((id) => id !== userId);

    emitLobby(currency);
    emitTable(table);

    // Start countdown when enough players
    if (table.phase === 'lobby' && table.seats.length >= MIN_PLAYERS) {
      table.phase = 'countdown';
      table.countdownTo = Date.now() + COUNTDOWN_MS;
      emitTable(table);
      const t = setTimeout(() => {
        withTable(table, async () => {
          if (table.seats.length >= MIN_PLAYERS && table.phase === 'countdown') {
            await startRound(table);
          }
        });
      }, COUNTDOWN_MS);
      table.timers.push(t);
    }

    return { tableId: table.id, table: tableState(table, userId) };
  },

  async leaveTable(userId: string, currency: Currency) {
    queues[currency] = queues[currency].filter((id) => id !== userId);
    for (const table of tables.values()) {
      if (table.currency !== currency) continue;
      const seat = seatOf(table, userId);
      if (!seat) continue;

      if (table.phase === 'betting' && seat.active && !seat.folded) {
        // Fold before leaving mid-round
        const idx = table.seats.indexOf(seat);
        seat.folded = true;
        seat.active = false;
        await persistFolded(table, seat);
        await afterAction(table, idx, 'fold');
      } else if (table.phase === 'betting' && seat.roundContributed > 0 && seat.folded) {
        // Already folded this round — they leave after contribution is locked
      } else {
        // Lobby/countdown → remove seat and refund nothing owed (no money committed yet)
        table.seats = table.seats.filter((s) => s.userId !== userId);
        if (table.seats.length === 0) {
          clearTimers(table);
          tables.delete(table.id);
        }
        emitTable(table);
        emitLobby(currency);
      }
    }
  },

  async playerAction(userId: string, tableId: string, action: Action, amount?: number) {
    const table = getTable(tableId);
    if (!table) throw new AppError('Table not found', 404);
    const seat = seatOf(table, userId);
    if (!seat) throw new AppError('You are not at this table', 400);

    if (table.phase === 'lobby') {
      // They sat but round hasn't started — nothing to do
      return { ok: true };
    }
    if (table.phase === 'countdown') {
      return { ok: true };
    }
    if (table.phase !== 'betting') throw new AppError('Betting is closed for this round', 400);
    if (!seat.active || seat.folded) throw new AppError('You are no longer in this hand', 400);
    if (table.turnIndex !== table.seats.indexOf(seat)) throw new AppError('It is not your turn', 400);

    let result: any = { ok: true };

    await withTable(table, async () => {
      if (table.phase !== 'betting') return;
      if (!seat.active || seat.folded) return;
      if (table.turnIndex !== table.seats.indexOf(seat)) return;

      clearTurnTimer(table);

      switch (action) {
        case 'fold': {
          seat.folded = true;
          seat.active = false;
          await persistFolded(table, seat);
          result = { action: 'fold', contributed: seat.roundContributed };
          break;
        }
        case 'see': {
          if (seat.seen) throw new AppError('You already saw your cards', 400);
          seat.seen = true;
          // Blind → now plays at full stake
          result = { action: 'see' };
          break;
        }
        case 'call': {
          const toPay = table.stake - seat.roundContributed;
          if (toPay <= 0) {
            result = { action: 'call', paid: 0 };
            break;
          }
          const callQuery = table.currency === 'diamond'
            ? { _id: userId, diamonds: { $gte: toPay } }
            : { _id: userId, coins: { $gte: toPay } };
          const callInc = table.currency === 'diamond' ? { diamonds: -toPay } : { coins: -toPay };
          const updated = await User.findOneAndUpdate(callQuery, { $inc: callInc }, { new: true });
          if (!updated) throw new AppError('Your balance is not enough', 400);
          seat.roundContributed += toPay;
          seat.sessionContributed += toPay;
          table.pot += toPay;
          table.roundContributed = Math.max(table.roundContributed, seat.roundContributed);
          await persistContribution(table, seat, toPay);
          pushBalance(userId, table.currency, table.currency === 'diamond' ? updated.diamonds : updated.coins);
          result = { action: 'call', paid: toPay, contributed: seat.roundContributed };
          break;
        }
        case 'raise': {
          const target = Math.min(seat.seen ? table.stake * RAISE_MULT : Math.ceil(table.stake * RAISE_MULT / 2) * 2, MAX_BET);
          const toPay = target - seat.roundContributed;
          if (toPay <= 0) throw new AppError('Raise is too small', 400);
          if (table.raises >= MAX_RAISES) throw new AppError('Maximum raises reached for this round', 400);
          const raiseQuery = table.currency === 'diamond'
            ? { _id: userId, diamonds: { $gte: toPay } }
            : { _id: userId, coins: { $gte: toPay } };
          const raiseInc = table.currency === 'diamond' ? { diamonds: -toPay } : { coins: -toPay };
          const updated = await User.findOneAndUpdate(raiseQuery, { $inc: raiseInc }, { new: true });
          if (!updated) throw new AppError('Your balance is not enough', 400);
          seat.roundContributed += toPay;
          seat.sessionContributed += toPay;
          table.pot += toPay;
          table.stake = target;
          table.roundContributed = seat.roundContributed;
          table.raises += 1;
          await persistContribution(table, seat, toPay);
          pushBalance(userId, table.currency, table.currency === 'diamond' ? updated.diamonds : updated.coins);
          result = { action: 'raise', paid: toPay, stake: table.stake, contributed: seat.roundContributed };
          break;
        }
        default:
          throw new AppError('Invalid action', 400);
      }

      await afterAction(table, table.seats.indexOf(seat), action);
      emitTable(table);
    });

    return result;
  },

  getLobbyState(currency: Currency) {
    return lobbyState(currency);
  },

  getState(tableId: string, userId?: string) {
    const table = getTable(tableId);
    if (!table) return null;
    return tableState(table, userId);
  },

  async getUserHistory(userId: string, page: number, limit: number) {
    const total = await TeenPattiBet.countDocuments({ userId });
    const data = await TeenPattiBet.find({ userId })
      .populate('roundId', 'roundNumber pot winnerId endedAt houseCut currency')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return { data, total };
  },

  async getStats() {
    const [totalBets, totalWins, rounds] = await Promise.all([
      TeenPattiBet.countDocuments(),
      TeenPattiBet.countDocuments({ status: 'won' }),
      TeenPattiRound.countDocuments(),
    ]);
    return { totalBets, totalWins, rounds };
  },
};
