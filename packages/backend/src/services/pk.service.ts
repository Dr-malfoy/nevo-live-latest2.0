import mongoose from 'mongoose';
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
    const battles = await PkBattle.find({
      createdAt: { $gte: startOfDay },
      status: { $in: ['active', 'ended'] },
    }).lean();

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

    const sortedStats = Array.from(hostStatsMap.values())
      .filter((s) => s.totalScore > 0)
      .sort((a, b) => b.totalScore - a.totalScore);
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
   * Separates into `friends` (followed hosts currently live/online) and `random` (other live/online hosts).
   */
  async getLiveOpponents(userId: string) {
    const me = await User.findById(userId).select('following').lean();
    const followingIds = (me?.following || []).map((id: any) => id.toString());

    // 1. Find all active live streams except self
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
    const addedHostIds = new Set<string>();
    addedHostIds.add(userId.toString());

    for (const stream of activeStreams) {
      if (!stream.hostId) continue;
      const host: any = stream.hostId;
      const hId = host._id.toString();
      addedHostIds.add(hId);

      const item = {
        userId: hId,
        hostId: hId,
        streamId: stream._id ? stream._id.toString() : '',
        nickname: host.nickname || 'Host',
        avatar: host.avatar || '',
        level: host.level || 1,
        uid: host.uid || '',
        streamTitle: stream.title || 'Live Stream',
        title: stream.title || 'Live Stream',
        cover: stream.cover || host.avatar || '',
        viewerCount: stream.viewerCount || 0,
        isLive: true,
      };

      if (followingIds.includes(hId)) {
        friends.push(item);
      } else {
        random.push(item);
      }
    }

    // 2. If random opponents are fewer than 5, ensure online/test hosts have active LiveStreams for seamless testing
    if (random.length < 5) {
      try {
        const candidateUsers = await User.find({
          _id: { $nin: Array.from(addedHostIds) as any },
        })
          .select('nickname avatar level uid gender isVip')
          .limit(8)
          .lean();

        for (const u of candidateUsers) {
          const uId = u._id.toString();
          // STRICT RULE: Candidates NEVER go into friends! Only into random for testing.
          addedHostIds.add(uId);

          let streamDoc: any = await LiveStream.findOne({ hostId: u._id, status: 'live' }).select('_id title cover viewerCount').lean();
          if (!streamDoc) {
            streamDoc = await LiveStream.create({
              hostId: u._id,
              title: `${u.nickname || 'Host'}'s PK Stream`,
              status: 'live',
              agoraChannel: `stream_${uId}_${Date.now()}`,
              viewerCount: Math.floor(Math.random() * 20) + 1,
              heartbeatAt: new Date(),
            });
          }

          random.push({
            userId: uId,
            hostId: uId,
            streamId: streamDoc._id.toString(),
            nickname: u.nickname || 'Host',
            avatar: u.avatar || '',
            level: u.level || 1,
            uid: u.uid || '',
            streamTitle: streamDoc.title || 'Live Stream',
            title: streamDoc.title || 'Live Stream',
            cover: streamDoc.cover || u.avatar || '',
            viewerCount: streamDoc.viewerCount || 5,
            isLive: true,
          });
        }
      } catch (err) {
        console.warn('[getLiveOpponents] candidate fetch error:', err);
      }
    }

    return { friends, random, totalAvailable: friends.length + random.length };
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
      userId: user._id.toString(),
      hostId: user._id.toString(),
      host: user,
      nickname: user.nickname || 'Host',
      avatar: user.avatar || '',
      level: user.level || 1,
      uid: user.uid || cleanUid,
      isLive: true,
      streamId: activeStream?._id ? activeStream._id.toString() : '',
      streamTitle: activeStream?.title || '1v1 Battle',
      title: activeStream?.title || '1v1 Battle',
      cover: activeStream?.cover || user.avatar || '',
      viewerCount: activeStream?.viewerCount || 0,
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
    // 1. Ensure Inviter Stream ID is a valid ObjectId
    let streamAId = inviterStreamId;
    if (!streamAId || !mongoose.Types.ObjectId.isValid(streamAId)) {
      let activeA: any = await LiveStream.findOne({ hostId: inviterId, status: 'live' }).select('_id').lean();
      if (!activeA) {
        activeA = await LiveStream.create({
          hostId: inviterId,
          title: 'PK Live Stream',
          status: 'live',
          agoraChannel: `stream_${inviterId}_${Date.now()}`,
          heartbeatAt: new Date(),
        });
      }
      streamAId = activeA._id.toString();
    }

    // 2. Ensure Target Stream ID is a valid ObjectId
    let streamBId = targetStreamId;
    if (!streamBId || !mongoose.Types.ObjectId.isValid(streamBId)) {
      let activeB: any = await LiveStream.findOne({ hostId: targetHostId, status: 'live' }).select('_id').lean();
      if (!activeB) {
        // Link or create live stream session for target host so they can battle
        const latest = await LiveStream.findOne({ hostId: targetHostId }).sort({ createdAt: -1 });
        if (latest) {
          latest.status = 'live';
          latest.heartbeatAt = new Date();
          await latest.save();
          activeB = latest;
        } else {
          activeB = await LiveStream.create({
            hostId: targetHostId,
            title: 'PK Live Battle',
            status: 'live',
            agoraChannel: `stream_${targetHostId}_${Date.now()}`,
            heartbeatAt: new Date(),
          });
        }
      }
      streamBId = activeB?._id ? activeB._id.toString() : '';
    }

    const durationSeconds = Math.max(60, Math.min(600, durationMinutes * 60));
    const endsAt = new Date(Date.now() + durationSeconds * 1000);

    const inviter = await User.findById(inviterId).select('nickname avatar level uid').lean();

    const battle = await PkBattle.create({
      type: 'friend',
      streamIdA: streamAId,
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
      inviterStreamId: streamAId,
      durationSeconds,
      durationMinutes,
    };

    // Emit to target host's personal socket room and target live stream room
    const io = getIO();
    io.to(targetHostId.toString()).emit('pk:live:invite', invitePayload);
    io.to(`user:${targetHostId}`).emit('pk:live:invite', invitePayload);
    if (streamBId) io.to(`stream:${streamBId}`).emit('pk:live:invite', invitePayload);

    // Auto-accept for test/automated seed hosts so random 1v1 matchmaking works seamlessly
    const targetUser = await User.findById(targetHostId).select('nickname role').lean();
    const isAutomated = targetUser && (
      targetUser.nickname?.startsWith('Host_') ||
      targetUser.nickname?.startsWith('Test') ||
      targetUser.nickname?.startsWith('CoolUser')
    );

    if (isAutomated) {
      setTimeout(async () => {
        try {
          await pkService.respondLivePk({
            battleId: battle._id.toString(),
            responderId: targetHostId,
            accept: true,
          });
        } catch (e) {
          console.warn('[auto-accept PK error]:', e);
        }
      }, 2000);
    }

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

      const declinePayload = {
        battleId,
        message: 'Host declined the PK invitation',
        targetHostId: responderId,
      };
      if (streamA) io.to(`stream:${streamA}`).emit('pk:live:declined', declinePayload);
      const hostAId = battle.teamA[0]?.toString();
      if (hostAId) {
        io.to(hostAId).emit('pk:live:declined', declinePayload);
        io.to(`user:${hostAId}`).emit('pk:live:declined', declinePayload);
      }
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

    const streamADoc = streamA ? await LiveStream.findById(streamA).select('viewerCount').lean() : null;
    const streamBDoc = streamB ? await LiveStream.findById(streamB).select('viewerCount').lean() : null;

    const startPayload = {
      battleId: battle._id,
      streamIdA: streamA,
      streamIdB: streamB,
      durationSeconds,
      endsAt: battle.endsAt,
      scoreA: battle.scoreA,
      scoreB: battle.scoreB,
      hostA: {
        _id: hostA?._id?.toString(),
        userId: hostA?._id?.toString(),
        nickname: hostA?.nickname || 'Host A',
        avatar: hostA?.avatar || '',
        level: hostA?.level || 1,
        uid: hostA?.uid || '',
        viewerCount: streamADoc?.viewerCount || 0,
      },
      hostB: {
        _id: hostB?._id?.toString(),
        userId: hostB?._id?.toString(),
        nickname: hostB?.nickname || 'Host B',
        avatar: hostB?.avatar || '',
        level: hostB?.level || 1,
        uid: hostB?.uid || '',
        viewerCount: streamBDoc?.viewerCount || 0,
      },
    };

    if (streamA) io.to(`stream:${streamA}`).emit('pk:live:start', startPayload);
    if (streamB) io.to(`stream:${streamB}`).emit('pk:live:start', startPayload);

    // Also broadcast directly to each host's personal socket room so neither host is ever stuck waiting
    const userA = battle.teamA[0]?.toString();
    const userB = battle.teamB[0]?.toString();
    if (userA) {
      io.to(userA).emit('pk:live:start', startPayload);
      io.to(`user:${userA}`).emit('pk:live:start', startPayload);
    }
    if (userB) {
      io.to(userB).emit('pk:live:start', startPayload);
      io.to(`user:${userB}`).emit('pk:live:start', startPayload);
    }

    // Guaranteed backend auto-end when time expires
    setTimeout(async () => {
      try {
        await pkService.endLivePk(battle._id.toString());
      } catch (err) {
        console.warn('[pk auto-end error]:', err);
      }
    }, (durationSeconds + 1) * 1000);

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
