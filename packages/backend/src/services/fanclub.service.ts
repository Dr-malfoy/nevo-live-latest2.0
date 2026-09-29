import { FanClub, FanGroup, User, Chat } from '../models';
import { AppError } from '../middleware/errorHandler';

export const fanclubService = {
  /** GET /api/fanclub/joined — all clubs the user has joined */
  async getJoined(userId: string) {
    const clubs = await FanClub.find({ userId })
      .populate('hostId', 'uid nickname avatar level isAgent role')
      .sort({ joinedAt: -1 })
      .lean();

    return clubs.map((club: any) => ({
      _id: club._id,
      host: club.hostId,
      clubName: club.clubName || (club.hostId?.nickname ? `${club.hostId.nickname}'s Club` : 'Fan Club'),
      fanPower: club.fanPower || (club.lighting * 10),
      tier: club.level || 1,
      frozen: false,
    }));
  },

  /** GET /api/fanclub/mine — host's own club info and fan power stats */
  async getMine(userId: string) {
    const user = await User.findById(userId).select('uid nickname avatar level isAgent role').lean();
    if (!user) throw new AppError('User not found', 404);

    const memberships = await FanClub.find({ hostId: userId }).lean();
    const totalFanPower = memberships.reduce((acc, m: any) => acc + (m.fanPower || (m.lighting * 10) || 0), 0);

    return {
      _id: `club_${userId}`,
      host: user,
      clubName: `${user.nickname || 'My'}'s Club`,
      fanPower: totalFanPower,
      tier: 1,
      memberCount: memberships.length,
      frozen: false,
    };
  },

  /**
   * POST /api/fanclub/:hostId/join
   * Creates a membership row if not already a member.
   * Idempotent via the unique index { hostId, userId }.
   */
  async joinFanClub(hostId: string, userId: string) {
    if (hostId === userId) throw new AppError('Cannot join your own fan club', 400);
    const host = await User.findById(hostId);
    if (!host) throw new AppError('Host not found', 404);

    const existing = await FanClub.findOne({ hostId, userId });
    if (existing) return { already: true, membership: existing };

    const membership = await FanClub.create({
      hostId,
      userId,
      clubName: `${host.nickname}'s Club`,
      fanPower: 10,
      level: 1,
      lighting: 1,
      joinedAt: new Date(),
    });
    return { already: false, membership };
  },

  /**
   * POST /api/fanclub/:hostId/light-up
   * Increments the fan's lighting counter (fan value score).
   */
  async lightUp(hostId: string, userId: string) {
    let membership = await FanClub.findOne({ hostId, userId });
    if (!membership) {
      // Auto-join on light up if host exists
      const host = await User.findById(hostId);
      if (!host) throw new AppError('Host not found', 404);
      membership = await FanClub.create({
        hostId,
        userId,
        clubName: `${host.nickname}'s Club`,
        fanPower: 10,
        level: 1,
        lighting: 1,
        joinedAt: new Date(),
      });
      return { lighting: 1, fanPower: 10 };
    }

    await FanClub.updateOne({ _id: membership._id }, { $inc: { lighting: 1, fanPower: 10 } });
    return { lighting: (membership.lighting || 0) + 1, fanPower: (membership.fanPower || 0) + 10 };
  },

  // ── Fan Groups ─────────────────────────────────────────────────────────────

  async getFanGroups(userId: string, scope: 'joined' | 'mine' = 'joined') {
    let filter: any = {};
    if (scope === 'mine') {
      filter.hostId = userId;
    } else {
      filter.$or = [{ memberIds: userId }, { hostId: userId }];
    }

    const groups = await FanGroup.find(filter)
      .populate('hostId', 'uid nickname avatar level')
      .sort({ createdAt: -1 })
      .lean();

    return groups.map((g: any) => ({
      _id: g._id,
      name: g.name,
      avatar: g.avatar || g.hostId?.avatar || '',
      memberCount: (g.memberIds?.length || 0) + 1, // members + host
      chatId: g.chatId?.toString() || undefined,
      announcement: g.announcement,
      hostId: g.hostId,
    }));
  },

  async createFanGroup(hostId: string, name: string, avatar = '', announcement = '') {
    if (!name?.trim()) throw new AppError('Group name is required', 400);

    const group = await FanGroup.create({
      hostId,
      name: name.trim(),
      avatar,
      announcement,
      memberIds: [],
    });

    // Create a group chat thread for this fan group
    const chat = await Chat.create({
      participants: [hostId],
      type: 'group',
      groupId: group._id,
      lastMessage: 'Group created',
      lastMessageAt: new Date(),
      lastMessageBy: hostId,
    });

    group.chatId = chat._id as any;
    await group.save();

    return {
      _id: group._id,
      name: group.name,
      avatar: group.avatar,
      memberCount: 1,
      chatId: chat._id.toString(),
      announcement: group.announcement,
    };
  },

  async joinFanGroup(groupId: string, userId: string) {
    const group = await FanGroup.findById(groupId);
    if (!group) throw new AppError('Group not found', 404);
    const alreadyIn = group.memberIds.some((m: any) => m.toString() === userId);
    if (!alreadyIn) {
      await FanGroup.updateOne({ _id: groupId }, { $push: { memberIds: userId } });
      if (group.chatId) {
        await Chat.updateOne({ _id: group.chatId }, { $addToSet: { participants: userId } });
      }
    }
    return { groupId, joined: !alreadyIn };
  },

  async getGroupMembers(groupId: string) {
    const group = await FanGroup.findById(groupId).populate('memberIds hostId', 'uid nickname avatar level isAgent role');
    if (!group) throw new AppError('Group not found', 404);
    const members: any[] = [];
    if (group.hostId) members.push(group.hostId);
    if (group.memberIds) members.push(...(group.memberIds as any[]));
    return members;
  },
};
