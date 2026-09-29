import { Agency, User } from '../models';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { auditService } from './audit.service';

const generateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// Resolve a user's existing agency reference. Returns:
//  - { agency, conflict: false }  — valid existing agency (same agent)
//  - { agency: null, conflict: true } — linked to a DIFFERENT valid agency
//  - { agency: null, conflict: false } — no link / stale / self / banned (auto-cleaned)
const resolveExistingAgency = async (user: any) => {
  if (!user.agencyId) return { agency: null, conflict: false };

  const agency = await Agency.findById(user.agencyId);

  // Stale reference — agency document no longer exists
  if (!agency) {
    console.warn(`[Agency] User ${user.uid} had stale agencyId ${user.agencyId} — clearing`);
    user.agencyId = undefined as any;
    if (user.role === 'host') user.role = 'user';
    await user.save();
    return { agency: null, conflict: false };
  }

  // Agent cannot be a host of their own agency — treat as invalid, clear
  if (agency.agentId.toString() === user._id.toString()) {
    console.warn(`[Agency] User ${user.uid} is the agent of their own agency — clearing link`);
    user.agencyId = undefined as any;
    if (user.role === 'host') user.role = 'user';
    await user.save();
    return { agency: null, conflict: false };
  }

  // Banned agency — clear so the user can link elsewhere
  if (agency.isBanned) {
    console.warn(`[Agency] User ${user.uid} linked to banned agency ${agency._id} — clearing`);
    user.agencyId = undefined as any;
    if (user.role === 'host') user.role = 'user';
    await user.save();
    return { agency: null, conflict: false };
  }

  return { agency, conflict: true };
};

export const agencyService = {
  generateCode,

  async getByAgent(agentId: string) {
    return Agency.findOne({ agentId });
  },

  // Public agent lookup for "Link Agent" — search by uid, phone, nickname, or agency name/code
  async searchAgents(query: string) {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim();
    const qRegex = { $regex: q, $options: 'i' };

    // Find agencies matching name/code first
    const agencies = await Agency.find({
      $or: [{ name: qRegex }, { code: { $regex: q.toUpperCase(), $options: 'i' } }],
    }).select('agentId name code');

    // Collect matching agent IDs from agencies + direct user matches
    const agencyAgentIds = agencies.map((a) => a.agentId);
    const users = await User.find({
      role: 'agent',
      $or: [
        { _id: { $in: agencyAgentIds } },
        { uid: qRegex },
        { phone: qRegex },
        { nickname: qRegex },
      ],
    })
      .select('uid nickname avatar phone level')
      .limit(10);

    return users;
  },

  // Bind a user to an agent's agency directly (by agent user ID)
  async linkByAgentId(userId: string, agentId: string) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const agent = await User.findById(agentId);
    if (!agent || agent.role !== 'agent') {
      throw new AppError('Agent not found', 404);
    }

    // Resolve existing link — stale/banned/self references are auto-cleared
    const existing = await resolveExistingAgency(user);

    if (existing.conflict && existing.agency) {
      if (existing.agency.agentId.toString() === agentId) {
        // Already linked to THIS agent — idempotent success
        return {
          alreadyLinked: true,
          agency: { _id: existing.agency._id, name: existing.agency.name, code: existing.agency.code },
          agent: { _id: agent._id, uid: agent.uid, nickname: agent.nickname, avatar: agent.avatar },
        };
      }
      throw new AppError('You are already linked to another agent. Leave that agency first.', 400);
    }

    let agency = await Agency.findOne({ agentId });
    if (!agency) {
      // Create agency on the fly with a generated code
      let code = generateCode();
      for (let i = 0; i < 10; i++) {
        const exists = await Agency.exists({ code });
        if (!exists) break;
        code = generateCode();
      }
      agency = await Agency.create({
        agentId,
        name: `${agent.nickname}'s Agency`,
        code,
        commission: 10,
      });
    }
    if (agency.isBanned) throw new AppError('This agency is banned', 403);

    user.agencyId = agency._id as any;
    user.role = 'host';
    if (!agency.hosts.some((h) => h.toString() === userId)) {
      agency.hosts.push(user._id as any);
    }
    await user.save();
    await agency.save();

    await notificationService.createNotification(
      agentId,
      'agent_linked',
      'New host linked',
      `${user.nickname} linked to your agency via Agent ID`,
      { userId }
    );
    await notificationService.createNotification(
      userId,
      'agent_linked',
      'Agent linked',
      `You are now linked to ${agent.nickname}'s agency. Withdrawals are now available.`,
      { agentId }
    );
    await auditService.logAudit(userId, 'agent_linked', 'User', agentId, { agencyId: agency._id });

    return {
      agency: { _id: agency._id, name: agency.name, code: agency.code },
      agent: { _id: agent._id, uid: agent.uid, nickname: agent.nickname, avatar: agent.avatar },
    };
  },

  async joinByCode(userId: string, code: string) {
    const normalized = code.trim().toUpperCase();
    if (!normalized) throw new AppError('Agency code is required', 400);

    const agency = await Agency.findOne({ code: normalized });
    if (!agency) throw new AppError('Invalid agency code. Check the code and try again.', 400);
    if (agency.isBanned) throw new AppError('This agency is banned', 403);

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // Agent cannot join their own agency as a host
    if (agency.agentId.toString() === userId) {
      throw new AppError('Agents cannot join their own agency as hosts', 400);
    }

    // Resolve existing link — stale/banned/self references are auto-cleared
    const existing = await resolveExistingAgency(user);

    if (existing.conflict && existing.agency) {
      if (existing.agency._id.toString() === agency._id.toString()) {
        // Already in THIS agency — idempotent success
        return { alreadyLinked: true, agency: { _id: agency._id, name: agency.name, code: agency.code } };
      }
      throw new AppError('You are already a member of another agency. Leave that agency first.', 400);
    }

    user.agencyId = agency._id as any;
    user.role = 'host';
    if (!agency.hosts.some((h) => h.toString() === userId)) {
      agency.hosts.push(user._id as any);
    }
    await user.save();
    await agency.save();

    await notificationService.createNotification(
      userId,
      'agent_linked',
      'Agency joined',
      `You joined ${agency.name}. Withdrawals are now available through your agent.`,
      { agencyId: agency._id }
    );

    return { agency: { _id: agency._id, name: agency.name, code: agency.code } };
  },

  async leaveAgency(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (!user.agencyId) throw new AppError('You are not a member of any agency', 400);

    const agencyId = user.agencyId;
    user.agencyId = undefined as any;
    if (user.role === 'host') user.role = 'user';
    await user.save();

    await Agency.findByIdAndUpdate(agencyId, { $pull: { hosts: userId } });
    return { left: true };
  },

  async getMyAgency(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (!user.agencyId) return null;

    const agency = await Agency.findById(user.agencyId)
      .populate('agentId', 'uid nickname avatar')
      .populate('hosts', 'uid nickname avatar level');

    // Stale reference cleanup — agency no longer exists
    if (!agency) {
      console.warn(`[Agency] User ${user.uid} had stale agencyId ${user.agencyId} — clearing on getMyAgency`);
      user.agencyId = undefined as any;
      if (user.role === 'host') user.role = 'user';
      await user.save();
      return null;
    }

    return agency?.toObject() || null;
  },

  async getMembers(agencyId: string, page: number, limit: number) {
    const agency = await Agency.findById(agencyId);
    if (!agency) throw new AppError('Agency not found', 404);

    const total = agency.hosts.length;
    const skip = (page - 1) * limit;
    const hostIds = agency.hosts.slice(skip, skip + limit);
    const hosts = await User.find({ _id: { $in: hostIds } })
      .select('uid nickname avatar level diamonds coins')
      .sort({ createdAt: -1 });

    return { data: hosts, total };
  },

  /**
   * Suggested agencies for a user with no agency link yet.
   * Ranks active, non-banned agencies by host count (desc), then commission.
   * Excludes the requester's own agency and agencies whose agent is the requester.
   */
  async suggestAgencies(userId: string, limit: number = 5) {
    const user = await User.findById(userId).select('_id role');
    if (!user) throw new AppError('User not found', 404);

    const agencies = await Agency.find({ isBanned: false })
      .populate('agentId', 'uid nickname avatar')
      .sort({ 'hosts.length': -1, commission: 1 })
      .limit(limit);

    // The agent of an agency can never join their own agency as a host.
    const results = [];
    for (const agency of agencies) {
      const populated = agency.toObject ? agency.toObject() : { ...agency };
      const agentRef: any = populated.agentId;
      const agentId = agentRef?._id?.toString();
      if (agentId === userId) continue;

      const agent = agentRef && typeof agentRef === 'object' ? agentRef : null;

      results.push({
        _id: populated._id,
        name: populated.name,
        code: populated.code,
        commission: populated.commission,
        memberCount: populated.hosts?.length || 0,
        agent: agent
          ? { _id: agent._id, uid: agent.uid, nickname: agent.nickname, avatar: agent.avatar }
          : null,
      });
    }

    return results;
  },
};
