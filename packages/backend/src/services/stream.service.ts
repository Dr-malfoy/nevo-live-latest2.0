import { LiveStream, User } from '../models';
import { AppError } from '../middleware/errorHandler';
import { generateAgoraToken, generateChannelName } from '../config/agora';
import { getSkip } from '../utils/pagination';
import crypto from 'crypto';

import { calculateWealthLevel, calculateLiveLevel } from '../utils/userLevels';

const HEARTBEAT_STALE_MS = 60_000;
const REAP_INTERVAL_MS = 30_000;

let reaperStarted = false;

/**
 * End any live sessions whose host app has gone silent (no heartbeat)
 * past the stale window. This is the self-healing guard that prevents
 * "still live after leaving" (#22) and duplicate cards (#23) when a host's
 * client dies without calling endStream.
 */
async function reapStaleStreams(filter: any = {}): Promise<void> {
  const staleBefore = new Date(Date.now() - HEARTBEAT_STALE_MS);
  const res = await LiveStream.updateMany(
    { ...filter, status: 'live', heartbeatAt: { $lt: staleBefore } },
    { $set: { status: 'ended', endedAt: new Date(), viewerCount: 0, viewers: [] } }
  );
  if (res.modifiedCount > 0) {
    console.log(`[stream] ended ${res.modifiedCount} stale live session(s)`);
  }
}

/** Bound stale-session cleanup even when no feed is being fetched. */
export function startStreamReaper(): void {
  if (reaperStarted) return;
  reaperStarted = true;
  setInterval(() => {
    reapStaleStreams().catch((err) => console.error('[stream] reaper error:', err?.message));
  }, REAP_INTERVAL_MS);
}

const staleBeforeDate = () => new Date(Date.now() - HEARTBEAT_STALE_MS);

/** Host fields every stream card needs, incl. country flag + presence dot + premium badges. */
const HOST_FIELDS =
  'uid nickname avatar level isAgent role sellerType coins diamonds wealthExp verification country lastActiveAt wealthLevel liveLevel isVip hasPurchasedDiamonds hostBadge hostBadgeType hostBadgeAssignedAt gender';

/**
 * Requirement #1 — country filter.
 *
 * `undefined` / empty / ['ALL'] means "All countries" and adds no constraint.
 * Codes are normalised to uppercase ISO alpha-2 and deduped, so
 * `?country=bd,IN,bd` filters on BD and IN.
 */
function buildCountryFilter(countries?: string[]): Record<string, unknown> {
  if (!countries || countries.length === 0) return {};
  const codes = [
    ...new Set(
      countries
        .map((c) => c.trim().toUpperCase())
        .filter((c) => /^[A-Z]{2}$/.test(c))
    ),
  ];
  if (codes.length === 0) return {};
  return { country: { $in: codes } };
}

/**
 * Map a populated LiveStream doc into a client-safe DTO:
 * - `thumbnail`: cover, else the host's avatar (so cards never render bare).
 * - `viewerCount`: clamped ≥ 0 (legacy negatives are never served).
 * - omits the `viewers` tracking array.
 */
const toStreamDTO = (doc: any) => {
  const host = doc.hostId && typeof doc.hostId === 'object' ? doc.hostId : null;
  const dto = doc.toObject ? doc.toObject() : { ...doc };
  if (host) {
    const rawHost = typeof host.toObject === 'function' ? host.toObject() : host;
    const wealthExp = Math.max(rawHost?.wealthExp || 0, rawHost?.diamonds || 0);
    const wealthLevel = rawHost?.wealthLevel && rawHost.wealthLevel > 1
      ? rawHost.wealthLevel
      : calculateWealthLevel(wealthExp, rawHost?.level).level;
    const liveLevel = rawHost?.liveLevel && rawHost.liveLevel > 1
      ? rawHost.liveLevel
      : calculateLiveLevel(rawHost?.coins, rawHost?.level).level;
    const level = rawHost?.level && rawHost.level > 1
      ? rawHost.level
      : Math.max(wealthLevel, liveLevel, 1);

    dto.hostId = {
      ...rawHost,
      wealthLevel,
      liveLevel,
      level,
      hostBadge: rawHost.hostBadge || 'none',
      hostBadgeType: rawHost.hostBadgeType || 'none',
      isVip: Boolean(rawHost.isVip || rawHost.hasPurchasedDiamonds || (rawHost.diamonds && rawHost.diamonds > 0)),
    };
  }
  dto.thumbnail = dto.cover || host?.avatar || '';
  dto.viewerCount = Math.max(0, dto.viewerCount ?? 0);
  delete dto.viewers;
  return dto;
};

export const streamService = {
  async getFeed(
    tab: string = 'newest',
    type?: string,
    category?: string,
    page: number = 1,
    limit: number = 20,
    countries?: string[],
    hostBadge?: string
  ) {
    const countryFilter = buildCountryFilter(countries);

    const filter: any = { status: 'live', heartbeatAt: { $gte: staleBeforeDate() }, ...countryFilter };

    if (type) filter.type = type;
    if (category) filter.category = category;

    // Safety layer: one active session per host — keep only the most recent per hostId.
    const match: any = { status: 'live', heartbeatAt: { $gte: staleBeforeDate() }, ...countryFilter };
    if (type) match.type = type;
    if (category) match.category = category;

    // End sessions whose host went silent (crashed / closed without ending) so
    // they no longer appear as "live".
    await reapStaleStreams(match);

    const dedupedIds = await LiveStream.aggregate([
      { $match: match },
      { $sort: { startedAt: -1 } },
      { $group: { _id: '$hostId', latest: { $first: '$_id' } } },
      { $project: { _id: 0, latest: 1 } },
    ]);
    const idSet = new Set(dedupedIds.map((d) => d.latest.toString()));

    let sort: any = { startedAt: -1 };
    if (tab === 'popular') sort = { viewerCount: -1, startedAt: -1 };

    // Fetch all active live streams to allow badge filtering & priority sorting
    const all = await LiveStream.find({ _id: { $in: [...idSet] }, ...filter })
      .populate('hostId', HOST_FIELDS)
      .sort(sort);

    // Filter by hostBadge if requested (e.g. 'alpha' or 'aurora')
    const filtered = (hostBadge && hostBadge !== 'all')
      ? all.filter((s: any) => {
          const hBadge = (s.hostId as any)?.hostBadge;
          return hBadge === hostBadge;
        })
      : all;

    // Premium search / feed priority: Alpha and Aurora hosts get a priority score
    const getPriorityScore = (s: any): number => {
      const badge = (s.hostId as any)?.hostBadge;
      if (badge === 'alpha' || badge === 'aurora') return 2;
      return 0;
    };

    const sorted = filtered.sort((a: any, b: any) => {
      const pDiff = getPriorityScore(b) - getPriorityScore(a);
      if (pDiff !== 0 && !hostBadge) return pDiff; // Boost premium hosts to the top
      if (tab === 'popular') {
        return (Math.max(0, b.viewerCount) - Math.max(0, a.viewerCount)) || (b.startedAt.getTime() - a.startedAt.getTime());
      }
      return b.startedAt.getTime() - a.startedAt.getTime();
    });

    const total = sorted.length;
    const data = sorted.slice(getSkip(page, limit), getSkip(page, limit) + limit).map(toStreamDTO);

    return { data, total };
  },

  /**
   * Distinct countries with a live host right now, each with its stream count,
   * ordered busiest first — so the filter bar only ever offers chips that
   * return results.
   */
  async getLiveCountries() {
    try {
      const rows = await LiveStream.aggregate([
        { $match: { status: 'live', heartbeatAt: { $gte: staleBeforeDate() }, country: { $nin: ['', null] } } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]);
      return rows.map((r) => ({ code: r._id as string, count: r.count as number }));
    } catch (err) {
      console.error('[stream] getLiveCountries error:', err);
      return [];
    }
  },

  async getFollowFeed(userId: string, page: number, limit: number, countries?: string[]) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const match: any = {
      status: 'live',
      heartbeatAt: { $gte: staleBeforeDate() },
      hostId: { $in: user.following },
      ...buildCountryFilter(countries),
    };

    // End stale followed streams so they drop out of the feed.
    await reapStaleStreams(match);

    // Dedupe by host — one card per followed host, keep the most recent live.
    const deduped = await LiveStream.aggregate([
      { $match: match },
      { $sort: { startedAt: -1 } },
      { $group: { _id: '$hostId', latest: { $first: '$_id' } } },
      { $project: { _id: 0, latest: 1 } },
    ]);
    const idSet = deduped.map((d) => d.latest.toString());

    const total = idSet.length;

    const streams = await LiveStream.find({
      _id: { $in: idSet },
      status: 'live',
      heartbeatAt: { $gte: staleBeforeDate() },
      ...buildCountryFilter(countries),
    })
      .populate('hostId', HOST_FIELDS)
      .sort({ startedAt: -1 })
      .skip(getSkip(page, limit))
      .limit(limit);

    return { data: streams.map(toStreamDTO), total };
  },

  /** The current user's active live session (if any) — for the FAB/Go Live guard. */
  async getMyActiveStream(hostId: string) {
    const stream = await LiveStream.findOne({ hostId, status: 'live' }).populate('hostId', HOST_FIELDS);
    return stream ? toStreamDTO(stream) : null;
  },

  async createStream(hostId: string, data: { title: string; cover?: string; type: 'video' | 'voice' | 'game'; category: string }) {
    // One host = one live session. End any previous live stream for this host
    // (including stale ones) so duplicates never accumulate (#22/#23).
    await LiveStream.updateMany(
      { hostId, status: 'live' },
      { $set: { status: 'ended', endedAt: new Date(), viewerCount: 0, viewers: [] } }
    );

    const agoraChannel = generateChannelName(hostId);
    // Wildcard publisher token (uid 0) — valid for whatever uid the host's client joins with.
    const agoraToken = generateAgoraToken(agoraChannel, 0, 'publisher');

    // Denormalise the host's country so the feed filter stays a single
    // indexed match instead of a per-request join.
    const host = await User.findById(hostId).select('country');

    const stream = await LiveStream.create({
      hostId,
      title: data.title,
      cover: data.cover || '',
      type: data.type,
      category: data.category || 'talk',
      country: host?.country || '',
      sessionId: crypto.randomUUID(),
      agoraChannel,
      agoraToken,
      heartbeatAt: new Date(),
    });

    const populated = await stream.populate('hostId', HOST_FIELDS);
    return toStreamDTO(populated);
  },

  /** Host heartbeat — keeps the session fresh while the host app is alive. */
  async heartbeat(streamId: string, userId: string) {
    const stream = await LiveStream.findOne({ _id: streamId, hostId: userId, status: 'live' });
    if (!stream) throw new AppError('Stream not found or not authorized', 404);
    stream.heartbeatAt = new Date();
    await stream.save();
    return stream;
  },

  async getStream(streamId: string) {
    const stream = await LiveStream.findById(streamId)
      .populate('hostId', HOST_FIELDS);
    if (!stream) throw new AppError('Stream not found', 404);
    return toStreamDTO(stream);
  },

  async getViewers(streamId: string) {
    const { calculateWealthLevel, calculateLiveLevel } = await import('../utils/userLevels');
    const stream = await LiveStream.findById(streamId)
      .populate('viewers', 'uid nickname avatar level wealthLevel liveLevel wealthExp isVip hasPurchasedDiamonds noble diamonds coins exp')
      .lean();
    if (!stream) throw new AppError('Stream not found', 404);
    return (stream.viewers || []).map((v: any) => {
      const isVip = Boolean(v.isVip || v.hasPurchasedDiamonds || v.noble || (v.diamonds && v.diamonds > 0));
      const wealthExp = Math.max(v.wealthExp || 0, v.diamonds || 0);
      const wealthLevel = v.wealthLevel && v.wealthLevel > 1 ? v.wealthLevel : calculateWealthLevel(wealthExp, v.level).level;
      const liveLevel = v.liveLevel && v.liveLevel > 1 ? v.liveLevel : calculateLiveLevel(v.coins, v.level).level;
      const level = v.level && v.level > 1 ? v.level : Math.max(wealthLevel, liveLevel, 1);
      return {
        userId: v._id?.toString() || v.uid,
        nickname: v.nickname || 'Viewer',
        avatar: v.avatar || '',
        level,
        wealthLevel,
        liveLevel,
        isVip,
        noble: v.noble,
        diamonds: v.diamonds || 0,
        coins: v.coins || 0,
      };
    });
  },

  async joinStream(streamId: string, userId: string) {
    const stream = await LiveStream.findById(streamId);
    if (!stream) throw new AppError('Stream not found', 404);
    if (stream.status !== 'live') throw new AppError('Stream has ended', 400);

    // Self-heal: if the host app vanished (no heartbeat), refresh the flag so the
    // session is not treated as dead the instant the host returns.
    if (stream.hostId.toString() === userId && Date.now() - new Date(stream.heartbeatAt).getTime() > HEARTBEAT_STALE_MS) {
      stream.heartbeatAt = new Date();
      await stream.save();
    }

    // Don't count host as a viewer when joining their own stream
    const isHost = stream.hostId.toString() === userId;
    if (!isHost) {
      // Idempotent: a viewer is counted only once (re-joins / retries don't inflate).
      await LiveStream.updateOne(
        { _id: streamId, viewers: { $ne: userId } },
        { $addToSet: { viewers: userId }, $inc: { viewerCount: 1, totalViewers: 1 } }
      );
    }

    // Host needs publisher token to publish video/audio; viewers get subscriber token.
    // uid 0 = wildcard token: valid for any client uid (a uid-bound token would be
    // rejected by Agora whenever the client joins with a different uid).
    const uid = Math.floor(Math.random() * 0xfffffffe) + 1; // 1..4294967294
    const role = isHost ? 'publisher' : 'subscriber';
    const token = generateAgoraToken(stream.agoraChannel, 0, role);
    const updated = await LiveStream.findById(streamId).select('viewerCount');
    const viewerCount = Math.max(0, updated?.viewerCount ?? 0);

    try {
      const { getIO } = await import('../socket');
      getIO()?.to(`stream:${streamId}`).emit('stream:viewer-count', { count: viewerCount });
    } catch {}

    return { token, channel: stream.agoraChannel, isHost, uid, viewerCount };
  },

  async leaveStream(streamId: string, userId?: string) {
    if (userId) {
      // Idempotent per-viewer decrement — remove from the set and decrement
      // only when the count is above zero so it can never go negative.
      await LiveStream.updateOne(
        { _id: streamId, viewers: userId, viewerCount: { $gt: 0 } },
        { $pull: { viewers: userId }, $inc: { viewerCount: -1 } }
      );
    } else {
      // Legacy path (no viewer id) — guarded decrement.
      await LiveStream.updateOne(
        { _id: streamId, viewerCount: { $gt: 0 } },
        { $inc: { viewerCount: -1 } }
      );
    }

    try {
      const currentStream = await LiveStream.findById(streamId).select('viewerCount').lean();
      const count = Math.max(0, currentStream?.viewerCount ?? 0);
      const { getIO } = await import('../socket');
      getIO()?.to(`stream:${streamId}`).emit('stream:viewer-count', { count });
    } catch {}
  },

  async endStream(streamId: string, hostId: string) {
    const stream = await LiveStream.findOne({ _id: streamId, hostId });
    if (!stream) throw new AppError('Stream not found or not authorized', 404);

    stream.status = 'ended';
    stream.endedAt = new Date();
    stream.viewerCount = 0;
    stream.viewers = [];
    await stream.save();

    return toStreamDTO(stream);
  },

  /** §4.11 — host earnings for a specific stream session */
  async getHostEarning(streamId: string, hostId: string) {
    const stream = await LiveStream.findById(streamId).lean();
    if (!stream) throw new AppError('Stream not found', 404);
    if ((stream.hostId as any).toString() !== hostId) {
      throw new AppError('Not authorised', 403);
    }

    // Pull all gift transactions credited to this host during the session window
    const { Transaction } = await import('../models');
    const start = stream.startedAt;
    const end = stream.endedAt || new Date();

    const txns = await (Transaction as any).find({
      userId: hostId,
      type: 'credit',
      sourceType: 'live',
      createdAt: { $gte: start, $lte: end },
    }).lean();

    const totalDiamonds = txns.reduce((s: number, t: any) => s + (t.amount || 0), 0);

    return {
      streamId,
      totalViewers: stream.totalViewers,
      totalDiamonds,
      transactions: txns,
      startedAt: stream.startedAt,
      endedAt: stream.endedAt,
    };
  },
};
