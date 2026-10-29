import { PkBattle, User, LiveStream } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getIO } from '../socket';

export const pkService = {
  /** Available PK type configs — aligned with PkTypeCard */
  async getPkTypes() {
    return [
      { type: 'friend', title: 'Friend PK', subtitle: 'Invite a friend to battle', emoji: '⚔️', isDefault: true },
      { type: 'random', title: 'Random PK', subtitle: 'Quick match with a random host', emoji: '🎲' },
      { type: 'team', title: 'Team PK', subtitle: '3 vs 3 Team Battle', emoji: '🛡️' },
    ];
  },

  /** PK Rank info — aligned with PkRank */
  async getPkRank(userId?: string) {
    let rank = 1;
    let points = 5000;
    if (userId) {
      const me = await User.findById(userId).select('exp').lean();
      points = me?.exp || 0;
      const higher = await User.countDocuments({ exp: { $gt: points } });
      rank = higher + 1;
    }
    const tier = points >= 50000 ? 'Master' : points >= 20000 ? 'Diamond' : points >= 5000 ? 'Platinum' : 'Gold';
    return { rank, tier, points };
  },

  /**
   * Daily PK Ranking Leaderboard.
   * Aggregates total PK score across all battles conducted today.
   * Host with the highest total score is #1.
   */
  async getDailyPkRank(currentUserId?: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Find all battles conducted today (or active)
    let battles = await PkBattle.find({
      createdAt: { $gte: startOfDay },
      status: { $in: ['active', 'ended'] },
    }).lean();

    // Fallback: If no battles today yet, show recent battles for a populated leaderboard
    if (battles.length === 0) {
      battles = await PkBattle.find({
        status: { $in: ['active', 'ended'] },
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    }

    const hostStatsMap = new Map<
      string,
      { userId: string; totalScore: number; wins: number; battlesCount: number }
    >();

    for (const b of battles) {
      const teamAIds = (b.teamA || []).map((id: any) => id.toString());
      const teamBIds = (b.teamB || []).map((id: any) => id.toString());
      const scoreA = Number(b.scoreA) || 0;
      const scoreB = Number(b.scoreB) || 0;

      for (const uId of teamAIds) {
        const stats = hostStatsMap.get(uId) || { userId: uId, totalScore: 0, wins: 0, battlesCount: 0 };
        stats.totalScore += scoreA;
        stats.battlesCount += 1;
        if (b.winnerSide === 'A') stats.wins += 1;
        hostStatsMap.set(uId, stats);
      }

      for (const uId of teamBIds) {
        const stats = hostStatsMap.get(uId) || { userId: uId, totalScore: 0, wins: 0, battlesCount: 0 };
        stats.totalScore += scoreB;
        stats.battlesCount += 1;
        if (b.winnerSide === 'B') stats.wins += 1;
        hostStatsMap.set(uId, stats);
      }
    }

    const sortedStats = Array.from(hostStatsMap.values()).sort((a, b) => b.totalScore - a.totalScore);
    const userIds = sortedStats.map((s) => s.userId);

    const users = await User.find({ _id: { $in: userIds } })
      .select('nickname avatar level uid gender liveLevel')
      .lean();
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    const leaderboard = sortedStats.slice(0, 50).map((stat, idx) => {
      const u: any = userMap.get(stat.userId) || {};
      return {
        rank: idx + 1,
        userId: stat.userId,
        nickname: u.nickname || 'Host',
        avatar: u.avatar || '',
        uid: u.uid || '1000',
        level: u.level || u.liveLevel || 1,
        gender: u.gender,
        totalScore: stat.totalScore,
        wins: stat.wins,
        battlesCount: stat.battlesCount,
        winRate: stat.battlesCount > 0 ? Math.round((stat.wins / stat.battlesCount) * 100) : 0,
      };
    });

    let myRankInfo = null;
    if (currentUserId) {
      const myIdx = sortedStats.findIndex((s) => s.userId === currentUserId);
      if (myIdx >= 0) {
        const myStat = sortedStats[myIdx];
        const me: any = userMap.get(currentUserId) || (await User.findById(currentUserId).select('nickname avatar level uid').lean());
        myRankInfo = {
          rank: myIdx + 1,
          userId: currentUserId,
          nickname: me?.nickname || 'Me',
          avatar: me?.avatar || '',
          level: me?.level || 1,
          totalScore: myStat.totalScore,
          wins: myStat.wins,
          battlesCount: myStat.battlesCount,
        };
      }
    }

    return { leaderboard, myRankInfo, totalParticipants: sortedStats.length };
  },

  /**
   * Find available live hosts for PK Battle.
   * Separates into `friends` (followed hosts currently live) and `random` (other live hosts).
   */
  async getLiveOpponents(userId: string) {
    const me = await User.findById(userId).select('following').lean();
    const followingIds = (me?.following || []).map((id: any) => id.toString());

    // Find all active live streams except self
    const activeStreams = await LiveStream.find({
      status: 'live',
      hostId: { $ne: userId as any },
    })
      .populate('hostId', 'nickname avatar level uid gender isVip')
      .sort({ viewerCount: -1 })
      .limit(30)
      .lean();

    const friends: any[] = [];
    const random: any[] = [];

    for (const stream of activeStreams) {
      if (!stream.hostId) continue;
      const host: any = stream.hostId;
      const hId = host._id.toString();
      const item = {
        streamId: stream._id,
        hostId: hId,
        nickname: host.nickname || 'Host',
        avatar: host.avatar || '',
        level: host.level || 1,
        uid: host.uid || '',
        title: stream.title || '',
        cover: stream.cover || host.avatar || '',
        viewerCount: stream.viewerCount || 0,
      };

      if (followingIds.includes(hId)) {
        friends.push(item);
      } else {
        random.push(item);
      }
    }

    return { friends, random, totalAvailable: activeStreams.length };
  },

  /** Look up a host by their UID to invite for Custom PK */
  async searchHostByUid(uid: string) {
    const cleanUid = String(uid || '').trim();
    if (!cleanUid) throw new AppError('UID is required', 400);

    const user = await User.findOne({ uid: cleanUid })
      .select('nickname avatar level uid gender')
      .lean();
    if (!user) throw new AppError('Host not found with this UID', 404);

    const activeStream = await LiveStream.findOne({
      hostId: user._id,
      status: 'live',
    }).select('_id title cover viewerCount').lean();

    return {
      host: user,
      isLive: Boolean(activeStream),
      streamId: activeStream?._id || null,
      streamTitle: activeStream?.title || null,
    };
  },

  /** Send a live PK invitation from one stream host to another */
  async inviteLivePk({
    inviterId,
    inviterStreamId,
    targetHostId,
    targetStreamId,
    durationMinutes = 3,
  }: {
    inviterId: string;
    inviterStreamId: string;
    targetHostId: string;
    targetStreamId?: string;
    durationMinutes?: number;
  }) {
    let streamBId = targetStreamId;
    if (!streamBId) {
      const active = await LiveStream.findOne({ hostId: targetHostId, status: 'live' }).select('_id').lean();
      if (!active) throw new AppError('The target host is not currently live', 400);
      streamBId = active._id.toString();
    }

    const durationSeconds = Math.max(60, Math.min(600, durationMinutes * 60));
    const endsAt = new Date(Date.now() + durationSeconds * 1000);

    const inviter = await User.findById(inviterId).select('nickname avatar level uid').lean();

    const battle = await PkBattle.create({
      type: 'friend',
      streamIdA: inviterStreamId,
      streamIdB: streamBId,
      teamA: [inviterId as any],
      teamB: [targetHostId as any],
      scoreA: 0,
      scoreB: 0,
      durationSeconds,
      status: 'pending',
      endsAt,
    });

    const invitePayload = {
      battleId: battle._id,
      inviterId,
      inviterNickname: inviter?.nickname || 'Host',
      inviterAvatar: inviter?.avatar || '',
      inviterLevel: inviter?.level || 1,
      inviterStreamId,
      durationSeconds,
      durationMinutes,
    };

    // Emit to target host's personal socket room and target live stream room
    const io = getIO();
    io.to(targetHostId.toString()).emit('pk:live:invite', invitePayload);
    io.to(`stream:${streamBId}`).emit('pk:live:invite', invitePayload);

    return battle;
  },

  /** Respond to an incoming live PK invitation (Accept / Decline) */
  async respondLivePk({
    battleId,
    responderId,
    accept,
  }: {
    battleId: string;
    responderId: string;
    accept: boolean;
  }) {
    const battle = await PkBattle.findById(battleId);
    if (!battle) throw new AppError('PK invitation not found', 404);
    if (battle.status !== 'pending') throw new AppError('PK invitation is no longer pending', 400);

    const io = getIO();
    const streamA = battle.streamIdA?.toString();
    const streamB = battle.streamIdB?.toString();

    if (!accept) {
      battle.status = 'ended';
      battle.winnerSide = null;
      await battle.save();

      const declinePayload = { battleId, message: 'Host declined the PK invitation' };
      if (streamA) io.to(`stream:${streamA}`).emit('pk:live:declined', declinePayload);
      return { success: true, accepted: false };
    }

    // Accept battle -> make active!
    const durationSeconds = battle.durationSeconds || 180;
    battle.status = 'active';
    battle.startedAt = new Date();
    battle.endsAt = new Date(Date.now() + durationSeconds * 1000);
    await battle.save();

    const hostA = await User.findById(battle.teamA[0]).select('nickname avatar level uid').lean();
    const hostB = await User.findById(battle.teamB[0]).select('nickname avatar level uid').lean();

    const startPayload = {
      battleId: battle._id,
      streamIdA: streamA,
      streamIdB: streamB,
      durationSeconds,
      endsAt: battle.endsAt,
      scoreA: battle.scoreA,
      scoreB: battle.scoreB,
      hostA: {
        _id: hostA?._id,
        nickname: hostA?.nickname || 'Host A',
        avatar: hostA?.avatar || '',
        level: hostA?.level || 1,
        uid: hostA?.uid || '',
      },
      hostB: {
        _id: hostB?._id,
        nickname: hostB?.nickname || 'Host B',
        avatar: hostB?.avatar || '',
        level: hostB?.level || 1,
        uid: hostB?.uid || '',
      },
    };

    if (streamA) io.to(`stream:${streamA}`).emit('pk:live:start', startPayload);
    if (streamB) io.to(`stream:${streamB}`).emit('pk:live:start', startPayload);

    return { success: true, accepted: true, battle: startPayload };
  },

  /** Add score when a gift is sent during active live PK */
  async addLivePkScore({
    battleId,
    targetSide,
    amount,
    senderName,
    senderAvatar,
    giftName,
    giftIcon,
  }: {
    battleId: string;
    targetSide: 'A' | 'B';
    amount: number;
    senderName?: string;
    senderAvatar?: string;
    giftName?: string;
    giftIcon?: string;
  }) {
    const battle = await PkBattle.findById(battleId);
    if (!battle || battle.status !== 'active') return null;

    if (targetSide === 'A') {
      battle.scoreA += amount;
    } else {
      battle.scoreB += amount;
    }
    await battle.save();

    const leadDiff = Math.abs(battle.scoreA - battle.scoreB);
    const leadSide = battle.scoreA > battle.scoreB ? 'A' : battle.scoreB > battle.scoreA ? 'B' : 'draw';

    const scorePayload = {
      battleId,
      scoreA: battle.scoreA,
      scoreB: battle.scoreB,
      leadSide,
      leadDiff,
      recentGift: {
        senderName: senderName || 'Audience',
        senderAvatar: senderAvatar || '',
        giftName: giftName || 'Gift',
        giftIcon: giftIcon || '🎁',
        points: amount,
        targetSide,
      },
    };

    const io = getIO();
    const streamA = battle.streamIdA?.toString();
    const streamB = battle.streamIdB?.toString();
    if (streamA) io.to(`stream:${streamA}`).emit('pk:live:score', scorePayload);
    if (streamB) io.to(`stream:${streamB}`).emit('pk:live:score', scorePayload);

    return scorePayload;
  },

  /** End a live PK battle and emit settlement to both rooms */
  async endLivePk(battleId: string) {
    const battle = await PkBattle.findById(battleId);
    if (!battle || battle.status === 'ended') return null;

    const winnerSide: 'A' | 'B' | 'draw' =
      battle.scoreA > battle.scoreB ? 'A'
      : battle.scoreB > battle.scoreA ? 'B'
      : 'draw';

    battle.status = 'ended';
    battle.winnerSide = winnerSide;
    battle.settledAt = new Date();
    await battle.save();

    const endPayload = {
      battleId,
      winnerSide,
      scoreA: battle.scoreA,
      scoreB: battle.scoreB,
    };

    const io = getIO();
    const streamA = battle.streamIdA?.toString();
    const streamB = battle.streamIdB?.toString();
    if (streamA) io.to(`stream:${streamA}`).emit('pk:live:end', endPayload);
    if (streamB) io.to(`stream:${streamB}`).emit('pk:live:end', endPayload);

    return endPayload;
  },

  /** Invite a user or group of users to a PK battle (general) */
  async invitePk(inviterId: string, targetUserId?: string, invitees?: string[], pkType: 'friend' | 'random' | 'team' = 'friend') {
    const targets = invitees && invitees.length > 0 ? invitees : targetUserId ? [targetUserId] : [];
    if (targets.length === 0) throw new AppError('Target user or invitees required', 400);

    const durationMs = pkType === 'team' ? 10 * 60_000 : 5 * 60_000;
    const endsAt = new Date(Date.now() + durationMs);

    const battle = await PkBattle.create({
      type: pkType,
      teamA: [inviterId],
      teamB: targets,
      scoreA: 0,
      scoreB: 0,
      status: 'pending',
      endsAt,
    });

    const io = getIO();
    for (const uid of targets) {
      io.to(uid).emit('pk:invite', { battleId: battle._id, from: inviterId, pkType });
    }
    return battle;
  },

  /** Quick match or accept match */
  async matchPk(userId: string, type: 'friend' | 'random' | 'team' = 'random', battleId?: string) {
    if (battleId) {
      const battle = await PkBattle.findOne({ _id: battleId, teamB: userId, status: 'pending' });
      if (!battle) throw new AppError('Invitation not found or expired', 404);
      battle.status = 'active';
      battle.startedAt = new Date();
      await battle.save();
      getIO().emit(`pk:${battleId}:start`, { battleId, endsAt: battle.endsAt });
      return battle;
    }

    // Quick match: find a pending random battle
    let battle = await PkBattle.findOne({
      type,
      status: 'pending',
      teamA: { $ne: userId as any },
    });

    if (battle) {
      battle.teamB = [userId as any];
      battle.status = 'active';
      battle.startedAt = new Date();
      await battle.save();
      getIO().emit(`pk:${battle._id}:start`, { battleId: battle._id, endsAt: battle.endsAt });
      return battle;
    }

    // Create a new pending battle looking for opponent
    const durationMs = 5 * 60_000;
    battle = await PkBattle.create({
      type,
      teamA: [userId as any],
      teamB: [],
      scoreA: 0,
      scoreB: 0,
      status: 'pending',
      endsAt: new Date(Date.now() + durationMs),
    });
    return battle;
  },

  /** Join or create a team PK */
  async teamPk(userId: string, memberIds?: string[], battleId?: string, team: 'A' | 'B' = 'A') {
    if (battleId) {
      const battle = await PkBattle.findById(battleId);
      if (!battle || battle.status !== 'active') throw new AppError('Battle not active', 400);
      const field = team === 'A' ? 'teamA' : 'teamB';
      const alreadyIn = (battle[field] as any[]).some((p: any) => p.toString() === userId);
      if (!alreadyIn) {
        await PkBattle.updateOne({ _id: battleId }, { $push: { [field]: userId } });
      }
      return battle;
    }

    const durationMs = 10 * 60_000;
    const teamA = [userId, ...(memberIds || [])].slice(0, 3);
    const battle = await PkBattle.create({
      type: 'team',
      teamA,
      teamB: [],
      scoreA: 0,
      scoreB: 0,
      status: 'pending',
      endsAt: new Date(Date.now() + durationMs),
    });
    return battle;
  },

  /** Get PK history for a user */
  async getPkHistory(userId: string, page: number, limit: number) {
    const filter = { $or: [{ teamA: userId }, { teamB: userId }], status: 'ended' };
    const total = await PkBattle.countDocuments(filter);
    const battles = await PkBattle.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { data: battles, total };
  },

  /** End a PK battle and settle results */
  async endPk(battleId: string) {
    const battle = await PkBattle.findById(battleId);
    if (!battle || battle.status === 'ended') throw new AppError('Battle not found or already ended', 400);

    const winnerSide: 'A' | 'B' | 'draw' =
      battle.scoreA > battle.scoreB ? 'A'
      : battle.scoreB > battle.scoreA ? 'B'
      : 'draw';

    battle.status = 'ended';
    battle.winnerSide = winnerSide;
    battle.settledAt = new Date();
    await battle.save();

    getIO().emit(`pk:${battleId}:end`, { battleId, winnerSide, scoreA: battle.scoreA, scoreB: battle.scoreB });
    return battle;
  },

  /** Add score to side during active PK */
  async addScore(battleId: string, side: 'A' | 'B', amount: number) {
    const field = side === 'A' ? 'scoreA' : 'scoreB';
    await PkBattle.updateOne({ _id: battleId, status: 'active' }, { $inc: { [field]: amount } });
  },
};
