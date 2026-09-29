import { PkBattle, User } from '../models';
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

  /** Invite a user or group of users to a PK battle */
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
