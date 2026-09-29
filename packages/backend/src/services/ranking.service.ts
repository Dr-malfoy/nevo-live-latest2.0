import { Types } from 'mongoose';
import {
  Agency,
  LiveStream,
  Moment,
  RankingAward,
  RankingConfig,
  RankingSnapshot,
  Transaction,
  User,
} from '../models';
import { AppError } from '../middleware/errorHandler';
import { getIO } from '../socket';
import { getBangladeshDayBounds, getBangladeshMonthBounds, getRewardCycleBounds } from '../utils/date';

/**
 * Ranking service — BACKEND-GUIDE.md §4.5 (#28, #35–#38, #71).
 *
 * One endpoint, six screens. Rankings are aggregated on a schedule into
 * `RankingSnapshot` so opening the page never scans the transaction ledger;
 * the API reads the snapshot and only falls back to a live aggregation when a
 * snapshot for the requested window/filter does not exist yet.
 */

export type RankingBoard =
  | 'agent_count'
  | 'agent_income'
  | 'elite_agent'
  | 'host_daily'
  | 'rocket_host'
  | 'star_host'
  | 'esports_host'
  | 'earnings'
  | 'rich'
  | 'gift'
  | 'video';

export type RankingPeriod = 'today' | 'yesterday' | 'week' | 'month';

export type RankingScope = 'global' | 'friends';

/** Rows kept in a snapshot — deep enough for the board and for `me` lookups. */
const TOP_N = 100;
/** A global snapshot is recomputed once it is older than this. */
const SNAPSHOT_TTL_MS = 3 * 60 * 1000;
/** How often the scheduler refreshes every board/period. */
const ENGINE_INTERVAL_MS = 5 * 60 * 1000;
/** `agent_count`'s "effective host" rule: at least one hour live in the window. */
const MIN_HOST_SECONDS = 60 * 60;
/** Online dot — matches user.service.ts (#3). */
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

type Category = 'host' | 'agent' | 'earnings';

type MetricKind =
  | 'gold_received'
  | 'acu'
  | 'agent_count'
  | 'agent_income'
  | 'elite_agent'
  | 'diamonds_won'
  | 'diamonds_spent'
  | 'gift_count'
  | 'video_likes';

interface BoardDef {
  key: RankingBoard;
  category: Category;
  /** Shown in the row's small metric chip. */
  metricLabel: string;
  kind: MetricKind;
  /** Title shown on the top three for this board. */
  badge?: string;
  /** Coin prizes for ranks 1..3 — omitted for title-only boards. */
  prizes?: number[];
  poolTotal?: number;
  condition: string;
  countries?: string[];
  /** #37 — the prize is a 7-day title, never coins. */
  titlePrize?: boolean;
  /**
   * Which period's window the prizes belong to. Only that window settles, so a
   * daily board cannot pay its prizes out again on the weekly snapshot.
   */
  prizePeriod?: RankingPeriod;
}

const BOARD_LIST: BoardDef[] = [
  {
    key: 'host_daily',
    category: 'host',
    metricLabel: 'Host',
    kind: 'gold_received',
    badge: 'DAILY HOST',
    prizes: [2000000, 800000, 500000],
    poolTotal: 3300000,
    prizePeriod: 'today',
    condition: 'Live Duration ≥ 1 hour, no violations',
    countries: ['IN', 'NP', 'BD', 'BT'],
  },
  {
    key: 'rocket_host',
    category: 'host',
    metricLabel: 'Rocket',
    kind: 'gold_received',
    badge: 'ROCKET HOST',
    prizes: [500000, 200000, 100000],
    poolTotal: 800000,
    prizePeriod: 'week',
    condition: 'Live Duration ≥ 3 hours this week, no violations',
    countries: ['IN', 'NP', 'BD', 'BT'],
  },
  {
    key: 'star_host',
    category: 'host',
    metricLabel: 'Star',
    kind: 'gold_received',
    badge: 'STAR HOST',
    // #37 — the weekly prize is a 7-day title, so no coin prizes.
    titlePrize: true,
    prizePeriod: 'week',
    condition: 'Weekly top host — prize is a 7-day Star Host title',
    countries: ['IN', 'NP', 'BD', 'BT'],
  },
  {
    key: 'esports_host',
    category: 'host',
    metricLabel: 'ACU',
    kind: 'acu',
    badge: 'ESPORTS HOST',
    prizes: [300000, 150000, 75000],
    poolTotal: 525000,
    prizePeriod: 'today',
    condition: 'Ranked by average concurrent viewers',
    countries: ['IN', 'NP', 'BD', 'BT'],
  },
  {
    key: 'agent_count',
    category: 'agent',
    metricLabel: 'Hosts',
    kind: 'agent_count',
    condition: 'Effective hosts — live ≥ 1 hour in the last 7 days',
  },
  {
    key: 'agent_income',
    category: 'agent',
    metricLabel: 'Income',
    kind: 'agent_income',
    condition: 'Commission earned in the selected period',
  },
  {
    key: 'elite_agent',
    category: 'agent',
    metricLabel: 'Elite',
    kind: 'elite_agent',
    badge: 'ELITE AGENT',
    condition: 'Agency gold received in the selected period',
  },
  {
    key: 'earnings',
    category: 'earnings',
    metricLabel: 'Earnings',
    kind: 'diamonds_won',
    prizes: [3000000, 1500000, 500000],
    poolTotal: 5000000,
    prizePeriod: 'today',
    condition: 'Diamonds won from gifts',
  },
  { key: 'rich', category: 'earnings', metricLabel: 'Rich', kind: 'diamonds_spent', condition: 'Diamonds spent on gifts' },
  { key: 'gift', category: 'earnings', metricLabel: 'Gifts', kind: 'gift_count', condition: 'Gifts received' },
  { key: 'video', category: 'earnings', metricLabel: 'Video', kind: 'video_likes', condition: 'Short-video engagement (#57)' },
];

const BOARDS: Record<string, BoardDef> = BOARD_LIST.reduce((acc, def) => {
  acc[def.key] = def;
  return acc;
}, {} as Record<string, BoardDef>);

/** Transaction-backed metrics: which actor the metric belongs to and how to sum it. */
const TX_SPEC: Partial<Record<MetricKind, { type: string; field: string; count?: boolean; earningsFactor?: number }>> = {
  gold_received: { type: 'gift_receive', field: 'userId' },
  gift_count: { type: 'gift_receive', field: 'userId', count: true },
  // "Diamonds won" = the diamond value of gifts received, i.e. gift_send rows targeting the user.
  diamonds_won: { type: 'gift_send', field: 'targetId', earningsFactor: 0.7 },
  diamonds_spent: { type: 'gift_send', field: 'userId' },
  agent_income: { type: 'commission', field: 'userId' },
};

interface Window {
  start: Date;
  end: Date;
  dateKey: string;
  resetsAt: Date;
}

interface MetricRow {
  userId: string;
  metric: number;
  earnings?: number;
}

interface AggregateOpts {
  userIds?: string[];
  countryCodes?: string[];
}

/** Resolve a named period into absolute Bangladesh-time window bounds. */
function resolveWindow(period: RankingPeriod, now: Date = new Date()): Window {
  if (period === 'yesterday') {
    const day = getBangladeshDayBounds(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    return { start: day.start, end: day.end, dateKey: day.dateKey, resetsAt: day.end };
  }
  if (period === 'week') {
    const week = getRewardCycleBounds(now);
    return { start: week.start, end: week.end, dateKey: week.dateKey, resetsAt: week.end };
  }
  if (period === 'month') {
    const month = getBangladeshMonthBounds(now);
    return { start: month.start, end: month.end, dateKey: month.dateKey, resetsAt: month.end };
  }
  const day = getBangladeshDayBounds(now);
  return { start: day.start, end: day.end, dateKey: day.dateKey, resetsAt: day.end };
}

const toObjectIds = (ids: string[]): Types.ObjectId[] => ids.map((id) => new Types.ObjectId(id));

const normalizeCountries = (raw?: string[] | string): string[] => {
  const list = Array.isArray(raw) ? raw : String(raw ?? '').split(',');
  return [
    ...new Set(
      list
        .map((c) => String(c).trim().toUpperCase())
        .filter((c) => /^[A-Z]{2}$/.test(c))
    ),
  ];
};

const isOnline = (lastActiveAt?: Date | null): boolean =>
  !!lastActiveAt && Date.now() - new Date(lastActiveAt).getTime() < ONLINE_WINDOW_MS;

/**
 * Build the aggregation stages that reduce a window to one `{ _id, metric }`
 * row per actor. The country filter runs after the group via a `users` lookup,
 * so a country-scoped board never needs a per-request user id list.
 */
function buildStages(def: BoardDef, window: Window, opts: AggregateOpts): any[] {
  const stages: any[] = [];

  if (def.kind === 'video_likes') {
    stages.push({ $match: { createdAt: { $gte: window.start, $lt: window.end } } });
    if (opts.userIds?.length) stages.push({ $match: { userId: { $in: toObjectIds(opts.userIds) } } });
    stages.push({ $project: { userId: 1, likes: { $size: { $ifNull: ['$likes', []] } } } });
    stages.push({ $group: { _id: '$userId', metric: { $sum: '$likes' } } });
  } else if (def.kind === 'acu') {
    stages.push({ $match: { startedAt: { $gte: window.start, $lt: window.end } } });
    if (opts.userIds?.length) stages.push({ $match: { hostId: { $in: toObjectIds(opts.userIds) } } });
    // We do not store a viewer time series, so ACU is the average audience per
    // session in the window (`totalViewers` is the distinct-viewer total).
    stages.push({ $group: { _id: '$hostId', metric: { $avg: '$totalViewers' } } });
  } else {
    const spec = TX_SPEC[def.kind]!;
    const match: any = {
      type: spec.type,
      status: 'completed',
      createdAt: { $gte: window.start, $lt: window.end },
      [spec.field]: { $nin: [null] },
    };
    if (opts.userIds?.length) match[spec.field] = { $in: toObjectIds(opts.userIds) };
    stages.push({ $match: match });
    stages.push({
      $group: { _id: `$${spec.field}`, metric: spec.count ? { $sum: 1 } : { $sum: '$amount' } },
    });
  }

  if (opts.countryCodes?.length) {
    stages.push({
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'u',
        pipeline: [{ $project: { country: 1 } }],
      },
    });
    stages.push({ $unwind: '$u' });
    stages.push({ $match: { 'u.country': { $in: opts.countryCodes } } });
  }

  return stages;
}

const sourceModel = (def: BoardDef) => {
  if (def.kind === 'video_likes') return Moment;
  if (def.kind === 'acu') return LiveStream;
  return Transaction;
};

const applyEarnings = (def: BoardDef, rows: MetricRow[]): MetricRow[] => {
  const spec = TX_SPEC[def.kind];
  const factor = spec?.earningsFactor;
  return rows.map((row) => ({
    ...row,
    metric: Math.round(row.metric),
    ...(factor ? { earnings: Math.floor(row.metric * factor) } : {}),
  }));
};

/** Ranked metric rows for a board over a window (highest first). */
async function aggregateBoard(
  def: BoardDef,
  window: Window,
  opts: AggregateOpts = {},
  limit = TOP_N
): Promise<MetricRow[]> {
  if (def.kind === 'agent_count' || def.kind === 'elite_agent') {
    return applyEarnings(def, await agentBoardRows(def, window, opts)).slice(0, limit);
  }

  const stages = buildStages(def, window, opts);
  const rows = await (sourceModel(def) as any).aggregate([
    ...stages,
    { $sort: { metric: -1, _id: 1 } },
    { $limit: limit },
  ]);

  return applyEarnings(
    def,
    rows.map((r: any) => ({ userId: String(r._id), metric: Number(r.metric) || 0 }))
  );
}

/**
 * Agent boards are not a `$sum` over a single field — `agent_count` counts the
 * agent's hosts that stayed live past the threshold, `elite_agent` sums those
 * hosts' gold. Both need the agency roster, so they are assembled in memory.
 */
async function agentBoardRows(def: BoardDef, window: Window, opts: AggregateOpts): Promise<MetricRow[]> {
  const agencies = await Agency.find().select('agentId hosts');
  if (agencies.length === 0) return [];

  const agentIds = agencies.map((a) => String(a.agentId));
  const hostIds = [...new Set(agencies.flatMap((a) => (a.hosts || []).map((h: any) => String(h))))];

  // The country/scope filter applies to the agent (the ranked user).
  let allowed: Set<string> | null = opts.userIds ? new Set(opts.userIds) : null;
  if (opts.countryCodes?.length) {
    const matched = await User.find({ _id: { $in: toObjectIds(agentIds) }, country: { $in: opts.countryCodes } }).select('_id');
    const countrySet = new Set(matched.map((u) => String(u._id)));
    allowed = allowed ? new Set([...allowed].filter((id) => countrySet.has(id))) : countrySet;
  }

  const rows: MetricRow[] = [];

  if (def.kind === 'agent_count') {
    // Guide's rule is a trailing 7-day window, independent of the period toggle.
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const durations = hostIds.length
      ? await LiveStream.aggregate([
          { $match: { hostId: { $in: toObjectIds(hostIds) }, startedAt: { $gte: since } } },
          {
            $group: {
              _id: '$hostId',
              seconds: {
                $sum: {
                  $divide: [{ $subtract: [{ $ifNull: ['$endedAt', new Date()] }, '$startedAt'] }, 1000],
                },
              },
            },
          },
        ])
      : [];
    const secondsByHost = new Map<string, number>(durations.map((d: any) => [String(d._id), d.seconds || 0]));

    for (const agency of agencies) {
      const key = String(agency.agentId);
      if (allowed && !allowed.has(key)) continue;
      const count = (agency.hosts || []).filter(
        (h: any) => (secondsByHost.get(String(h)) || 0) >= MIN_HOST_SECONDS
      ).length;
      rows.push({ userId: key, metric: count });
    }
  } else {
    const gold = hostIds.length
      ? await Transaction.aggregate([
          {
            $match: {
              userId: { $in: toObjectIds(hostIds) },
              type: 'gift_receive',
              status: 'completed',
              createdAt: { $gte: window.start, $lt: window.end },
            },
          },
          { $group: { _id: '$userId', total: { $sum: '$amount' } } },
        ])
      : [];
    const goldByHost = new Map<string, number>(gold.map((g: any) => [String(g._id), g.total || 0]));

    for (const agency of agencies) {
      const key = String(agency.agentId);
      if (allowed && !allowed.has(key)) continue;
      const total = (agency.hosts || []).reduce(
        (sum: number, h: any) => sum + (goldByHost.get(String(h)) || 0),
        0
      );
      rows.push({ userId: key, metric: total });
    }
  }

  return rows.sort((a, b) => b.metric - a.metric || a.userId.localeCompare(b.userId));
}

const isAgentBoard = (def: BoardDef) => def.kind === 'agent_count' || def.kind === 'elite_agent';

/** A single user's metric for the window, plus how many are ahead of them. */
async function ownMetric(def: BoardDef, window: Window, userId: string, countryCodes?: string[]): Promise<number> {
  const opts: AggregateOpts = { userIds: [userId], countryCodes };
  if (isAgentBoard(def)) {
    const rows = await agentBoardRows(def, window, opts);
    return rows.find((r) => r.userId === userId)?.metric || 0;
  }
  const stages = buildStages(def, window, opts);
  const rows = await (sourceModel(def) as any).aggregate([
    ...stages,
    { $sort: { metric: -1 } },
    { $limit: 1 },
  ]);
  return Math.round(Number(rows[0]?.metric) || 0);
}

/** Count of users strictly ahead of `metric`, and the smallest metric above it. */
async function aboveStats(
  def: BoardDef,
  window: Window,
  metric: number,
  countryCodes?: string[]
): Promise<{ count: number; min: number }> {
  if (isAgentBoard(def)) {
    const rows = await agentBoardRows(def, window, { countryCodes });
    const ahead = rows.filter((r) => r.metric > metric);
    return {
      count: ahead.length,
      min: ahead.length ? Math.min(...ahead.map((r) => r.metric)) : 0,
    };
  }

  const stages = buildStages(def, window, { countryCodes });
  const rows = await (sourceModel(def) as any).aggregate([
    ...stages,
    { $match: { metric: { $gt: metric } } },
    { $group: { _id: null, count: { $sum: 1 }, min: { $min: '$metric' } } },
  ]);
  return { count: rows[0]?.count || 0, min: rows[0]?.min || 0 };
}

/**
 * Read a board's prize config, seeding it from the code defaults on first use
 * so prizes and the condition line can be retuned in the DB without a release.
 */
async function loadConfig(board: string) {
  const def = BOARDS[board];
  if (!def) throw new AppError('Unknown ranking board', 400);

  let config = await RankingConfig.findOne({ board: def.key });
  if (!config) {
    try {
      config = await RankingConfig.create({
        board: def.key,
        poolTotal: def.poolTotal ?? 0,
        prizes: def.prizes ?? [],
        condition: def.condition,
        countries: def.countries ?? [],
      });
    } catch (err: any) {
      // Concurrent seeding — the other writer's row is equally valid.
      if (err?.code !== 11000) throw err;
      config = await RankingConfig.findOne({ board: def.key });
    }
  }
  if (!config) throw new AppError('Ranking config unavailable', 500);

  return {
    poolTotal: config.poolTotal,
    prizes: config.prizes,
    condition: config.condition,
    countries: config.countries,
  };
}

/** Load a snapshot, recomputing and persisting it when missing or stale. */
async function readSnapshot(
  def: BoardDef,
  period: RankingPeriod,
  window: Window,
  countryKey: string,
  force = false
): Promise<MetricRow[]> {
  const countryCodes = countryKey ? countryKey.split(',') : undefined;
  const existing = await RankingSnapshot.findOne({
    board: def.key,
    period,
    dateKey: window.dateKey,
    country: countryKey,
  });

  // A finished window is final: reuse it however old it is. An open one is
  // reusable only inside the TTL, so the page still tracks the live period.
  const windowEnded = window.resetsAt.getTime() <= Date.now();
  const fresh =
    !force && existing && (windowEnded || Date.now() - new Date(existing.computedAt).getTime() < SNAPSHOT_TTL_MS);
  if (fresh && existing) {
    return existing.rows.map((r: any) => ({
      userId: String(r.userId),
      metric: r.metric,
      ...(r.earnings != null ? { earnings: r.earnings } : {}),
    }));
  }

  const rows = await aggregateBoard(def, window, { countryCodes }, TOP_N);
  const config = await loadConfig(def.key);
  const stored = rows.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    metric: row.metric,
    ...(row.earnings != null ? { earnings: row.earnings } : {}),
    ...(config.prizes?.[index] != null && !def.titlePrize ? { prize: config.prizes[index] } : {}),
    badge: def.badge && index < 3 ? def.badge : null,
    frame: index < 3 ? 'gold' : null,
  }));

  try {
    await RankingSnapshot.findOneAndUpdate(
      { board: def.key, period, dateKey: window.dateKey, country: countryKey },
      { $set: { rows: stored, resetsAt: window.resetsAt, computedAt: new Date() } },
      { upsert: true }
    );
  } catch (err: any) {
    // Two requests for an uncached filter can upsert at once; the loser just
    // serves its freshly computed rows.
    if (err?.code !== 11000) throw err;
  }

  return rows;
}

export const rankingService = {
  boardList: BOARD_LIST,

  /** `GET /api/rankings/:board/config` */
  getConfig(board: string) {
    return loadConfig(board);
  },

  /** `GET /api/rankings` */
  async getRanking(params: {
    board: string;
    period: RankingPeriod;
    scope: RankingScope;
    country?: string[] | string;
    /**
     * Accepted for the #71 contract. Transactions do not carry a game key yet,
     * so it is currently a no-op rather than a silently wrong filter.
     */
    gameKey?: string;
    viewerId?: string;
    /** Set by the history endpoint to address a specific, past day. */
    window?: Window;
  }) {
    const def = BOARDS[params.board];
    if (!def) throw new AppError('Unknown ranking board', 400);

    const period = params.period;
    const window = params.window ?? resolveWindow(period);
    const countryCodes = normalizeCountries(params.country);
    const countryKey = [...countryCodes].sort().join(',');

    let rows: MetricRow[];

    if (params.scope === 'friends' && params.viewerId) {
      // #71 — the friends board is a small set, so it is computed live rather
      // than stored, and never mixes in the global top-N.
      const viewer = await User.findById(params.viewerId).select('following');
      const friendIds = (viewer?.following || []).map((id: any) => String(id));
      rows = friendIds.length ? await aggregateBoard(def, window, { userIds: friendIds }, TOP_N) : [];
    } else {
      rows = await readSnapshot(def, period, window, countryKey);
    }

    const users = await User.find({ _id: { $in: toObjectIds(rows.map((r) => r.userId)) } }).select(
      'uid nickname avatar level country isAgent role noble lastActiveAt'
    );
    const usersById = new Map(users.map((u) => [String(u._id), u]));

    const config = await this.getConfig(def.key);
    const clientRows = rows
      .map((row) => {
        const user = usersById.get(row.userId);
        if (!user) return null; // deleted account — drops out rather than rendering blank
        return {
          user: {
            _id: String(user._id),
            uid: user.uid,
            nickname: user.nickname,
            avatar: user.avatar,
            level: user.level,
            country: user.country,
            isAgent: user.isAgent,
            role: user.role,
            noble: user.noble,
            online: isOnline(user.lastActiveAt),
          },
          metric: row.metric,
          metricLabel: def.metricLabel,
          ...(row.earnings != null ? { earnings: row.earnings } : {}),
        };
      })
      .filter(Boolean)
      .map((row: any, index) => ({
        ...row,
        rank: index + 1,
        ...(config.prizes?.[index] != null && !def.titlePrize ? { prize: config.prizes[index] } : {}),
        badge: def.badge && index < 3 ? def.badge : null,
        frame: index < 3 ? 'gold' : null,
      }));

    // `me` — the viewer's own standing and distance to the rank above.
    let me: { rank: number | null; distanceToNext: number; metricLabel: string } | null = null;
    if (params.viewerId) {
      const index = clientRows.findIndex((row: any) => row.user._id === params.viewerId);
      if (index >= 0) {
        me = {
          rank: clientRows[index].rank,
          distanceToNext: index > 0 ? Math.max(0, clientRows[index - 1].metric - clientRows[index].metric) : 0,
          metricLabel: def.metricLabel,
        };
      } else {
        const metric = await ownMetric(def, window, params.viewerId, countryCodes);
        if (metric > 0) {
          const above = await aboveStats(def, window, metric, countryCodes);
          me = {
            rank: above.count + 1,
            distanceToNext: above.count > 0 ? Math.max(0, Math.round(above.min) - metric) : 0,
            metricLabel: def.metricLabel,
          };
        }
      }
    }

    return { resetsAt: window.resetsAt.toISOString(), me, rows: clientRows };
  },

  /** `GET /api/rankings/:board/history?date=YYYY-MM-DD` */
  async getHistory(board: string, date?: string) {
    const def = BOARDS[board];
    if (!def) throw new AppError('Unknown ranking board', 400);
    if (!date) throw new AppError('A date is required', 400);

    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) throw new AppError('Invalid date', 400);

    const day = getBangladeshDayBounds(parsed);
    const window: Window = { start: day.start, end: day.end, dateKey: day.dateKey, resetsAt: day.end };

    return this.getRanking({ board: def.key, period: 'today', scope: 'global', window });
  },

  /**
   * Refresh every global board/period. Runs on a schedule (and once at boot) so
   * the API never aggregates the ledger on a page open.
   */
  async refreshAll(): Promise<number> {
    const periods: RankingPeriod[] = ['today', 'yesterday', 'week', 'month'];
    let computed = 0;

    for (const def of BOARD_LIST) {
      for (const period of periods) {
        try {
          await readSnapshot(def, period, resolveWindow(period), '', true);
          computed += 1;
        } catch (err: any) {
          console.error(`[ranking] ${def.key}/${period} refresh failed:`, err?.message);
        }
      }
    }

    return computed;
  },

  /**
   * Grant prizes for windows that have closed. Idempotent twice over: the
   * snapshot is claimed with a `settledAt: null` guard, and the award's unique
   * `{ board, dateKey, userId }` index makes a replay a no-op.
   */
  async settleFinishedWindows(): Promise<number> {
    const finished = await RankingSnapshot.find({
      country: '',
      resetsAt: { $lt: new Date() },
      settledAt: null,
    }).limit(50);

    let granted = 0;

    for (const snapshot of finished) {
      const claimed = await RankingSnapshot.updateOne(
        { _id: snapshot._id, settledAt: null },
        { $set: { settledAt: new Date() } }
      );
      if (claimed.modifiedCount !== 1) continue;

      // Only pay for windows we actually tracked while they were open. A
      // snapshot computed after its window closed (e.g. a boot-time backfill of
      // "yesterday") is history, not a prize round.
      if (new Date(snapshot.computedAt).getTime() >= new Date(snapshot.resetsAt).getTime()) continue;

      const def = BOARDS[snapshot.board];
      if (!def || (!def.prizes?.length && !def.titlePrize)) continue;
      // Prizes belong to exactly one window (e.g. rocket/star are weekly), so
      // the other periods' snapshots for the same board are never paid out.
      if (snapshot.period !== (def.prizePeriod ?? 'today')) continue;

      for (const row of snapshot.rows) {
        const isTitle = !!def.titlePrize;
        // A title board has no coin prize to test against, so cap it at the podium.
        if (isTitle && row.rank > 3) continue;
        if (!isTitle && !row.prize) continue;

        let award;
        try {
          award = await RankingAward.create({
            board: def.key,
            period: snapshot.period,
            dateKey: snapshot.dateKey,
            userId: row.userId,
            rank: row.rank,
            prize: isTitle ? 0 : row.prize,
            currency: isTitle ? 'title' : 'coin',
            badge: def.badge || null,
            // #37 — a 7-day title, not coins.
            expiresAt: isTitle ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
            status: 'granted',
          });
        } catch (err: any) {
          if (err?.code === 11000) continue; // already settled
          throw err;
        }

        granted += 1;

        if (!isTitle && row.prize) {
          const updated = await User.findOneAndUpdate(
            { _id: row.userId },
            { $inc: { coins: row.prize } },
            { new: true }
          );
          await Transaction.create({
            userId: row.userId,
            type: 'ranking_prize',
            amount: row.prize,
            currency: 'coin',
            status: 'completed',
            description: `${def.badge || def.key} rank #${row.rank} prize`,
          });
          try {
            getIO().to(`user:${row.userId}`).emit('balance:update', {
              coins: updated?.coins,
              diamonds: updated?.diamonds,
            });
          } catch {
            // Socket not initialized — the credit is already persisted.
          }
        }
      }
    }

    return granted;
  },
};

let engineStarted = false;
let engineTimer: NodeJS.Timeout | null = null;

/** Start the scheduled snapshot refresh + prize settlement. */
export function startRankingEngine(): void {
  if (engineStarted) return;
  engineStarted = true;

  const tick = async () => {
    try {
      await rankingService.refreshAll();
      await rankingService.settleFinishedWindows();
    } catch (err: any) {
      console.error('[ranking] engine tick failed:', err?.message);
    }
  };

  tick();
  engineTimer = setInterval(tick, ENGINE_INTERVAL_MS);
  engineTimer.unref?.();
}

export function stopRankingEngine(): void {
  if (engineTimer) clearInterval(engineTimer);
  engineTimer = null;
  engineStarted = false;
}
