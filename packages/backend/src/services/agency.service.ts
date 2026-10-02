import mongoose from 'mongoose';
import { Agency, User, AgencyLeaveRequest, AgencyJoinRequest, LiveStream, Transaction, PaymentConfig, getFormattedTxId } from '../models';
import { AppError } from '../middleware/errorHandler';
import { notificationService } from './notification.service';
import { auditService } from './audit.service';
import { getIO } from '../socket';

export function calculateAgencyLevel(totalContribution: number, totalLiveHours: number = 0) {
  const score = (totalContribution || 0) + Math.floor((totalLiveHours || 0) * 1000);
  const thresholds = [
    { level: 1, min: 0, next: 10000 },
    { level: 2, min: 10000, next: 50000 },
    { level: 3, min: 50000, next: 150000 },
    { level: 4, min: 150000, next: 500000 },
    { level: 5, min: 500000, next: 1500000 },
    { level: 6, min: 1500000, next: 5000000 },
    { level: 7, min: 5000000, next: 15000000 },
    { level: 8, min: 15000000, next: 50000000 },
    { level: 9, min: 50000000, next: 150000000 },
    { level: 10, min: 150000000, next: 500000000 },
  ];

  let currentLevel = 1;
  let nextThreshold = thresholds[0].next;
  let currentMin = 0;

  for (const t of thresholds) {
    if (score >= t.min) {
      currentLevel = t.level;
      nextThreshold = t.next;
      currentMin = t.min;
    } else {
      break;
    }
  }

  const progress = nextThreshold > currentMin
    ? Math.min(100, Math.round(((score - currentMin) / (nextThreshold - currentMin)) * 100))
    : 100;

  return {
    level: currentLevel,
    score,
    currentMin,
    nextThreshold,
    progress,
  };
}

const generateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'AGY';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const emitSafe = (event: string, target: string, payload: unknown) => {
  try {
    getIO().to(target).emit(event, payload);
  } catch {
    // socket not initialized
  }
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
    return { agency, conflict: false, isOwner: true };
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

let inactivityWorkerStarted = false;

export const agencyService = {
  generateCode,

  async getByAgent(agentId: string) {
    return Agency.findOne({ agentId });
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. AGENCY CREATION
  // ─────────────────────────────────────────────────────────────────────────────
  async createAgency(
    userId: string,
    data: {
      name: string;
      description?: string;
      avatar?: string;
      cover?: string;
      type?: 'public' | 'private';
      commission?: number;
      customCode?: string;
    }
  ) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // Check if user already owns an agency
    const existingOwned = await Agency.findOne({ agentId: userId });
    if (existingOwned) {
      if (user.role !== 'agent' || !user.isAgent || !user.agencyId) {
        user.role = 'agent';
        user.isAgent = true;
        user.agencyId = existingOwned._id as any;
        await user.save();
      }
      throw new AppError(`You already own the agency "${existingOwned.name}" (Code: ${existingOwned.code}). You can manage it from your dashboard.`, 400);
    }

    // Check if user is currently host in another agency
    if (user.agencyId) {
      const currentAgency = await Agency.findById(user.agencyId);
      if (currentAgency && currentAgency.agentId.toString() !== userId) {
        throw new AppError('You are currently a member of another agency. Please leave that agency before creating your own.', 400);
      }
    }

    const cleanName = data.name?.trim();
    if (!cleanName || cleanName.length < 2) {
      throw new AppError('Agency name must be at least 2 characters', 400);
    }

    // Generate unique code or validate custom code
    let code = (data.customCode?.trim().toUpperCase()) || generateCode();
    if (data.customCode) {
      if (code.length < 4 || code.length > 12) {
        throw new AppError('Agency code must be between 4 and 12 characters', 400);
      }
      const codeExists = await Agency.exists({ code });
      if (codeExists) {
        throw new AppError('Agency code is already in use. Please pick another code.', 400);
      }
    } else {
      let attempts = 0;
      while (attempts < 10) {
        const exists = await Agency.exists({ code });
        if (!exists) break;
        code = generateCode();
        attempts++;
      }
    }

    const agencyType = data.type === 'private' ? 'private' : 'public';
    const commission = typeof data.commission === 'number' && data.commission >= 0 && data.commission <= 100
      ? data.commission
      : 10;

    const agency = await Agency.create({
      agentId: user._id,
      name: cleanName,
      code,
      avatar: data.avatar || user.avatar || '',
      cover: data.cover || '',
      description: data.description?.trim() || '',
      type: agencyType,
      commission,
      level: 1,
      hosts: [],
      totalContribution: 0,
      totalLiveHours: 0,
    });

    // Make user Agency Owner & Agent
    user.role = 'agent';
    user.isAgent = true;
    user.agencyId = agency._id as any;
    await user.save();

    await auditService.logAudit(userId, 'agency_created', 'Agency', agency._id.toString(), {
      agencyName: agency.name,
      code: agency.code,
      type: agency.type,
    });

    await notificationService.createNotification(
      userId,
      'system',
      'Agency Created Successfully',
      `Congratulations! Your agency "${agency.name}" has been created with code ${agency.code}. You are now the Agency Owner / Agent.`,
      { agencyId: agency._id.toString(), code: agency.code }
    );

    return {
      _id: agency._id,
      name: agency.name,
      code: agency.code,
      avatar: agency.avatar,
      cover: agency.cover,
      description: agency.description,
      type: agency.type,
      commission: agency.commission,
      level: agency.level,
      hostsCount: 0,
      agent: {
        _id: user._id,
        uid: user.uid,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
      },
    };
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. AGENCY DISCOVERY & LIST (FILTERS & SEARCH)
  // ─────────────────────────────────────────────────────────────────────────────
  async getAgencies(params: {
    filter?: 'all' | 'public' | 'private' | 'popular' | 'level';
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const query: any = { isBanned: false };

    // Filter handling
    if (params.filter === 'public') {
      query.type = 'public';
    } else if (params.filter === 'private') {
      query.type = 'private';
    }

    // Search by code or name
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      const qRegex = { $regex: q, $options: 'i' };
      query.$or = [
        { code: { $regex: q.toUpperCase(), $options: 'i' } },
        { name: qRegex },
      ];
    }

    // Sort criteria
    let sort: any = { createdAt: -1 };
    if (params.filter === 'popular') {
      sort = { totalContribution: -1, 'hosts.length': -1, createdAt: -1 };
    } else if (params.filter === 'level') {
      sort = { level: -1, totalContribution: -1, createdAt: -1 };
    }

    const [total, agencies] = await Promise.all([
      Agency.countDocuments(query),
      Agency.find(query)
        .populate('agentId', 'uid nickname avatar level isAgent role')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const data = agencies.map((a: any) => {
      const agent = a.agentId || {};
      const memberCount = (a.hosts && Array.isArray(a.hosts)) ? a.hosts.length : 0;
      const levelInfo = calculateAgencyLevel(a.totalContribution || 0, a.totalLiveHours || 0);

      return {
        _id: a._id.toString(),
        name: a.name,
        code: a.code,
        avatar: a.avatar || agent.avatar || '',
        cover: a.cover || '',
        description: a.description || '',
        type: a.type || 'public',
        level: Math.max(a.level || 1, levelInfo.level),
        levelProgress: levelInfo.progress,
        nextThreshold: levelInfo.nextThreshold,
        memberCount,
        commission: a.commission ?? 10,
        totalContribution: a.totalContribution || 0,
        totalLiveHours: Math.round((a.totalLiveHours || 0) * 10) / 10,
        agent: {
          _id: agent._id ? agent._id.toString() : '',
          uid: agent.uid || '',
          nickname: agent.nickname || 'Agent Owner',
          avatar: agent.avatar || '',
          level: agent.level || 1,
        },
        createdAt: a.createdAt,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. AGENCY DETAILS & PROFILE
  // ─────────────────────────────────────────────────────────────────────────────
  async getAgencyDetails(agencyIdOrCode: string, currentUserId?: string) {
    const clean = (agencyIdOrCode || '').trim();
    let agency: any = null;
    if (mongoose.isValidObjectId(clean)) {
      agency = await Agency.findById(clean)
        .populate('agentId', 'uid nickname avatar level phone country bio isAgent role diamonds coins')
        .populate('hosts', 'uid nickname avatar level lastActiveAt coins diamonds wealthLevel liveLevel')
        .lean();
      if (!agency) {
        agency = await Agency.findOne({ agentId: clean })
          .populate('agentId', 'uid nickname avatar level phone country bio isAgent role diamonds coins')
          .populate('hosts', 'uid nickname avatar level lastActiveAt coins diamonds wealthLevel liveLevel')
          .lean();
      }
    }
    if (!agency) {
      agency = await Agency.findOne({ code: clean.toUpperCase() })
        .populate('agentId', 'uid nickname avatar level phone country bio isAgent role diamonds coins')
        .populate('hosts', 'uid nickname avatar level lastActiveAt coins diamonds wealthLevel liveLevel')
        .lean();
    }
    if (!agency) {
      const agentUser = await User.findOne({ uid: clean });
      if (agentUser) {
        agency = await Agency.findOne({ agentId: agentUser._id })
          .populate('agentId', 'uid nickname avatar level phone country bio isAgent role diamonds coins')
          .populate('hosts', 'uid nickname avatar level lastActiveAt coins diamonds wealthLevel liveLevel')
          .lean();
      }
    }
    if (!agency) {
      throw new AppError('Agency not found with given ID or Code', 404);
    }
    if (agency.isBanned) {
      throw new AppError('This agency has been banned or suspended', 403);
    }

    const agent = agency.agentId || {};
    const hosts = agency.hosts || [];
    const hostIds = hosts.map((h: any) => h._id);

    // Calculate aggregated live hours & earnings from members
    let memberContributions: any[] = [];
    let calculatedLiveHours = 0;
    let calculatedContribution = 0;

    if (hostIds.length > 0) {
      // Aggregate completed streams duration for members
      const streamStats = await LiveStream.aggregate([
        { $match: { hostId: { $in: hostIds }, status: 'ended', endedAt: { $exists: true } } },
        {
          $group: {
            _id: '$hostId',
            totalSeconds: { $sum: { $divide: [{ $subtract: ['$endedAt', '$startedAt'] }, 1000] } },
          },
        },
      ]);
      const streamMap = new Map(streamStats.map((s) => [s._id.toString(), s.totalSeconds]));

      // Aggregate gift receive transactions for members
      const txStats = await Transaction.aggregate([
        { $match: { userId: { $in: hostIds }, type: 'gift_receive', status: 'completed' } },
        {
          $group: {
            _id: '$userId',
            totalPoints: { $sum: '$amount' },
          },
        },
      ]);
      const txMap = new Map(txStats.map((t) => [t._id.toString(), t.totalPoints]));

      memberContributions = hosts.map((h: any) => {
        const idStr = h._id.toString();
        const durationSec = streamMap.get(idStr) || 0;
        const liveHours = Math.round((durationSec / 3600) * 10) / 10;
        const contribution = txMap.get(idStr) || (h.coins || 0);

        calculatedLiveHours += liveHours;
        calculatedContribution += contribution;

        return {
          _id: idStr,
          uid: h.uid,
          nickname: h.nickname,
          avatar: h.avatar,
          level: h.level || 1,
          liveHours,
          contribution,
          coins: h.coins || 0,
          diamonds: h.diamonds || 0,
          lastActiveAt: h.lastActiveAt,
        };
      });
    }

    const totalContribution = Math.max(agency.totalContribution || 0, calculatedContribution);
    const totalLiveHours = Math.max(agency.totalLiveHours || 0, Math.round(calculatedLiveHours * 10) / 10);
    const levelInfo = calculateAgencyLevel(totalContribution, totalLiveHours);

    // Check relationship for the requesting user
    let userRelationship = {
      isOwner: false,
      isMember: false,
      hasPendingJoinRequest: false,
      hasPendingLeaveRequest: false,
      joinRequestId: undefined as string | undefined,
    };

    if (currentUserId) {
      const isOwner = agent._id?.toString() === currentUserId;
      const isMember = hosts.some((h: any) => h._id.toString() === currentUserId);
      userRelationship.isOwner = isOwner;
      userRelationship.isMember = isMember;

      if (!isOwner && !isMember) {
        const pendingJoin = await AgencyJoinRequest.findOne({
          agencyId: agency._id,
          userId: currentUserId,
          status: 'pending',
        });
        if (pendingJoin) {
          userRelationship.hasPendingJoinRequest = true;
          userRelationship.joinRequestId = pendingJoin._id.toString();
        }
      }

      if (isMember) {
        const pendingLeave = await AgencyLeaveRequest.findOne({
          agencyId: agency._id,
          userId: currentUserId,
          status: 'pending',
        });
        if (pendingLeave) {
          userRelationship.hasPendingLeaveRequest = true;
        }
      }
    }

    return {
      _id: agency._id.toString(),
      name: agency.name,
      code: agency.code,
      avatar: agency.avatar || agent.avatar || '',
      cover: agency.cover || '',
      description: agency.description || 'Welcome to our agency family!',
      type: agency.type || 'public',
      level: Math.max(agency.level || 1, levelInfo.level),
      levelProgress: levelInfo.progress,
      nextThreshold: levelInfo.nextThreshold,
      score: levelInfo.score,
      commission: agency.commission ?? 10,
      memberCount: hosts.length,
      totalContribution,
      totalLiveHours,
      agent: {
        _id: agent._id ? agent._id.toString() : '',
        uid: agent.uid || '',
        nickname: agent.nickname || 'Agent Owner',
        avatar: agent.avatar || '',
        level: agent.level || 1,
        phone: agent.phone || '',
        country: agent.country || '',
        bio: agent.bio || '',
      },
      members: memberContributions,
      userRelationship,
      createdAt: agency.createdAt,
    };
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. PUBLIC AGENCY JOIN & PRIVATE AGENCY JOIN REQUESTS
  // ─────────────────────────────────────────────────────────────────────────────
  async joinAgency(userId: string, agencyIdOrCode: string) {
    const clean = (agencyIdOrCode || '').trim();
    let agency: any = null;
    if (mongoose.isValidObjectId(clean)) {
      agency = await Agency.findById(clean);
      if (!agency) {
        agency = await Agency.findOne({ agentId: clean });
      }
    }
    if (!agency) {
      agency = await Agency.findOne({ code: clean.toUpperCase() });
    }
    if (!agency) {
      const agentUser = await User.findOne({ uid: clean });
      if (agentUser) {
        agency = await Agency.findOne({ agentId: agentUser._id });
      }
    }
    if (!agency) throw new AppError('Agency not found. Please check agency code or ID.', 404);
    if (agency.isBanned) throw new AppError('This agency is banned', 403);

    const user = await User.findById(userId);
    if (!user) throw new AppError('User session expired or user not found. Please log in again.', 401);

    if (agency.agentId.toString() === userId) {
      throw new AppError('You are the owner of this agency.', 400);
    }

    const existing = await resolveExistingAgency(user);
    if (existing.conflict && existing.agency) {
      if (existing.agency._id.toString() === agency._id.toString()) {
        return {
          alreadyLinked: true,
          agency: { _id: agency._id, name: agency.name, code: agency.code },
          message: 'You are already a member of this agency.',
        };
      }
      throw new AppError('You are already a member of another agency. Please leave that agency first.', 400);
    }

    // If agency is PRIVATE, prompt to use join-request
    if (agency.type === 'private') {
      throw new AppError('This is a private agency. You must submit a join request for owner approval.', 400);
    }

    // Public agency -> instant join
    user.agencyId = agency._id as any;
    user.role = 'host';
    if (!agency.hosts.some((h: any) => h.toString() === userId)) {
      agency.hosts.push(user._id as any);
    }
    await user.save();
    await agency.save();

    await notificationService.createNotification(
      agency.agentId.toString(),
      'agent_linked',
      'New Member Joined Agency',
      `${user.nickname} (ID: ${user.uid}) joined your public agency "${agency.name}".`,
      { userId, agencyId: agency._id.toString() }
    );

    await notificationService.createNotification(
      userId,
      'agent_linked',
      'Joined Agency Successfully',
      `You are now an Agency Member in "${agency.name}".`,
      { agencyId: agency._id.toString(), agentId: agency.agentId.toString() }
    );

    return {
      success: true,
      agency: { _id: agency._id, name: agency.name, code: agency.code, type: agency.type },
      message: `Successfully joined ${agency.name}!`,
    };
  },

  async requestJoinPrivateAgency(userId: string, agencyIdOrCode: string, message?: string) {
    const clean = (agencyIdOrCode || '').trim();
    let agency: any = null;
    if (mongoose.isValidObjectId(clean)) {
      agency = await Agency.findById(clean);
      if (!agency) {
        agency = await Agency.findOne({ agentId: clean });
      }
    }
    if (!agency) {
      agency = await Agency.findOne({ code: clean.toUpperCase() });
    }
    if (!agency) {
      const agentUser = await User.findOne({ uid: clean });
      if (agentUser) {
        agency = await Agency.findOne({ agentId: agentUser._id });
      }
    }
    if (!agency) throw new AppError('Agency not found', 404);
    if (agency.isBanned) throw new AppError('This agency is banned', 403);

    const user = await User.findById(userId);
    if (!user) throw new AppError('User session expired or user not found. Please log in again.', 401);

    if (agency.agentId.toString() === userId) {
      throw new AppError('You are the owner of this agency.', 400);
    }

    const existing = await resolveExistingAgency(user);
    if (existing.conflict && existing.agency) {
      if (existing.agency._id.toString() === agency._id.toString()) {
        throw new AppError('You are already a member of this agency.', 400);
      }
      throw new AppError('You are already a member of another agency. Please leave that agency first.', 400);
    }

    // Check if user already has a pending join request
    const existingPending = await AgencyJoinRequest.findOne({
      agencyId: agency._id,
      userId: user._id,
      status: 'pending',
    });

    if (existingPending) {
      throw new AppError('You already have a pending join request for this agency. Please wait for owner approval.', 400);
    }

    const joinRequest = await AgencyJoinRequest.create({
      agencyId: agency._id,
      userId: user._id,
      agentId: agency.agentId,
      message: message?.trim() || 'Requesting to join your agency as a streamer.',
      status: 'pending',
    });

    const agentIdStr = agency.agentId.toString();

    await notificationService.createNotification(
      agentIdStr,
      'system',
      'New Agency Join Request',
      `${user.nickname} (ID: ${user.uid}) requested to join your private agency "${agency.name}".`,
      { requestId: joinRequest._id.toString(), userId: user._id.toString(), agencyId: agency._id.toString() }
    );

    emitSafe('agency:join-request', `user:${agentIdStr}`, {
      requestId: joinRequest._id.toString(),
      user: {
        _id: user._id.toString(),
        uid: user.uid,
        nickname: user.nickname,
        avatar: user.avatar,
        level: user.level,
      },
      agencyId: agency._id.toString(),
      message: joinRequest.message,
      createdAt: joinRequest.createdAt,
    });

    return {
      success: true,
      requestId: joinRequest._id.toString(),
      status: 'pending',
      message: 'Join request sent to agency owner. Awaiting approval.',
    };
  },

  async getJoinRequests(agentId: string, status?: string) {
    const query: any = { agentId };
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    const requests = await AgencyJoinRequest.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'uid nickname avatar level coins diamonds lastActiveAt gender country')
      .populate('agencyId', 'name code')
      .lean();

    return requests;
  },

  async decideJoinRequest(agentId: string, requestId: string, decision: 'approve' | 'reject') {
    const request = await AgencyJoinRequest.findOne({ _id: requestId, agentId });
    if (!request) throw new AppError('Join request not found or unauthorized', 404);
    if (request.status !== 'pending') {
      throw new AppError(`This join request has already been ${request.status}`, 400);
    }

    const member = await User.findById(request.userId);
    const agency = await Agency.findById(request.agencyId);
    const memberIdStr = request.userId.toString();

    if (decision === 'approve') {
      request.status = 'approved';
      request.reviewedAt = new Date();
      await request.save();

      if (member) {
        member.agencyId = agency?._id as any;
        member.role = 'host';
        await member.save();
      }

      if (agency && !agency.hosts.some((h: any) => h.toString() === memberIdStr)) {
        agency.hosts.push(request.userId);
        await agency.save();
      }

      await notificationService.createNotification(
        memberIdStr,
        'system',
        'Agency Join Request Approved',
        `Congratulations! Your join request for "${agency?.name || 'the agency'}" was approved.`,
        { requestId, agencyId: request.agencyId.toString() }
      );

      emitSafe('agency:join-decided', `user:${memberIdStr}`, {
        requestId,
        status: 'approved',
        agencyId: request.agencyId.toString(),
      });

      return { success: true, status: 'approved', message: 'Join request approved' };
    } else {
      request.status = 'rejected';
      request.reviewedAt = new Date();
      await request.save();

      await notificationService.createNotification(
        memberIdStr,
        'system',
        'Agency Join Request Rejected',
        `Your request to join "${agency?.name || 'the agency'}" was declined by the owner.`,
        { requestId, agencyId: request.agencyId.toString() }
      );

      emitSafe('agency:join-decided', `user:${memberIdStr}`, {
        requestId,
        status: 'rejected',
        agencyId: request.agencyId.toString(),
      });

      return { success: true, status: 'rejected', message: 'Join request rejected' };
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. AGENCY MANAGEMENT & SETTINGS
  // ─────────────────────────────────────────────────────────────────────────────
  async updateAgencySettings(
    agentId: string,
    data: {
      name?: string;
      description?: string;
      avatar?: string;
      cover?: string;
      type?: 'public' | 'private';
      commission?: number;
    }
  ) {
    const agency = await Agency.findOne({ agentId });
    if (!agency) throw new AppError('Agency not found for this agent', 404);

    if (data.name && data.name.trim().length >= 2) {
      agency.name = data.name.trim();
    }
    if (typeof data.description === 'string') {
      agency.description = data.description.trim();
    }
    if (typeof data.avatar === 'string') {
      agency.avatar = data.avatar.trim();
    }
    if (typeof data.cover === 'string') {
      agency.cover = data.cover.trim();
    }
    if (data.type === 'public' || data.type === 'private') {
      agency.type = data.type;
    }
    if (typeof data.commission === 'number' && data.commission >= 0 && data.commission <= 100) {
      agency.commission = data.commission;
    }

    await agency.save();
    return agency;
  },

  async removeMember(agentId: string, memberUserId: string, reason?: string) {
    const agency = await Agency.findOne({ agentId });
    if (!agency) throw new AppError('Agency not found or unauthorized', 404);

    const member = await User.findById(memberUserId);
    if (!member) throw new AppError('Member not found', 404);

    if (member._id.toString() === agentId) {
      throw new AppError('Cannot remove agency owner', 400);
    }

    agency.hosts = agency.hosts.filter((h: any) => h.toString() !== memberUserId);
    await agency.save();

    member.agencyId = undefined as any;
    if (member.role === 'host') member.role = 'user';
    await member.save();

    await notificationService.createNotification(
      memberUserId,
      'system',
      'Removed from Agency',
      `You were removed from ${agency.name} by the owner.${reason ? ` Reason: ${reason}` : ''}`,
      { agencyId: agency._id.toString() }
    );

    return { success: true, message: 'Member removed from agency successfully' };
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. AGENT WALLET TRANSACTIONS (COINS, DIAMONDS, CONVERSION)
  // ─────────────────────────────────────────────────────────────────────────────
  async agentSendCoins(agentId: string, targetIdentifier: string, amount: number, note?: string) {
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new AppError('Amount must be a positive number', 400);
    }
    const cleanAmount = Math.floor(amount);

    const agent = await User.findById(agentId);
    const ownsAgency = await Agency.exists({ agentId });
    if (!agent || (agent.role !== 'agent' && !agent.isAgent && !agent.isAdmin && !ownsAgency)) {
      throw new AppError('Only agency owners / agents can perform this transfer', 403);
    }

    if ((agent.coins || 0) < cleanAmount) {
      throw new AppError(`Insufficient coin balance. Available: ${(agent.coins || 0).toLocaleString()} coins`, 400);
    }

    // Lookup recipient
    const cleanTarget = targetIdentifier.trim();
    let target: any = await User.findOne({ uid: cleanTarget });
    if (!target && mongoose.isValidObjectId(cleanTarget)) {
      target = await User.findById(cleanTarget);
    }
    if (!target) {
      target = await User.findOne({ phone: cleanTarget });
    }
    if (!target) {
      throw new AppError('Recipient not found with given ID/UID/Phone', 404);
    }
    if (target._id.toString() === agentId) {
      throw new AppError('Cannot send coins to yourself', 400);
    }

    // Atomic debit agent & credit target
    const updatedAgent = await User.findOneAndUpdate(
      { _id: agentId, coins: { $gte: cleanAmount } },
      { $inc: { coins: -cleanAmount } },
      { new: true }
    );
    if (!updatedAgent) {
      throw new AppError('Insufficient coin balance', 400);
    }

    const updatedTarget = await User.findByIdAndUpdate(
      target._id,
      { $inc: { coins: cleanAmount } },
      { new: true }
    );

    // Ledger records
    await Transaction.create([
      {
        userId: agentId,
        type: 'transfer',
        amount: cleanAmount,
        currency: 'coin',
        targetId: target._id,
        targetModel: 'User',
        status: 'completed',
        description: `Agent sent ${cleanAmount.toLocaleString()} coins to ${target.nickname} (${target.uid})${note ? ` - Note: ${note}` : ''}`,
      },
      {
        userId: target._id,
        type: 'transfer_in',
        amount: cleanAmount,
        currency: 'coin',
        targetId: agentId,
        targetModel: 'User',
        status: 'completed',
        description: `Received ${cleanAmount.toLocaleString()} coins from Agent ${agent.nickname} (${agent.uid})${note ? ` - Note: ${note}` : ''}`,
      },
    ]);

    // Socket real-time balance updates
    emitSafe('balance:update', `user:${agentId}`, { coins: updatedAgent.coins, diamonds: updatedAgent.diamonds });
    if (updatedTarget) {
      emitSafe('balance:update', `user:${target._id}`, { coins: updatedTarget.coins, diamonds: updatedTarget.diamonds });
    }

    await notificationService.createNotification(
      target._id.toString(),
      'recharge',
      'Coins Received',
      `Agent ${agent.nickname} sent you ${cleanAmount.toLocaleString()} coins.`,
      { amount: cleanAmount, currency: 'coin' }
    );

    return {
      success: true,
      amount: cleanAmount,
      balance: updatedAgent.coins,
      recipient: {
        _id: target._id,
        uid: target.uid,
        nickname: target.nickname,
        avatar: target.avatar,
        role: target.role,
      },
    };
  },

  async agentSendDiamonds(agentId: string, targetIdentifier: string, amount: number, note?: string) {
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new AppError('Amount must be a positive number', 400);
    }
    const cleanAmount = Math.floor(amount);

    const agent = await User.findById(agentId);
    const ownsAgency = await Agency.exists({ agentId });
    if (!agent || (agent.role !== 'agent' && !agent.isAgent && !agent.isAdmin && !ownsAgency)) {
      throw new AppError('Only agency owners / agents can perform this transfer', 403);
    }

    if ((agent.diamonds || 0) < cleanAmount) {
      throw new AppError(`Insufficient diamond balance. Available: ${(agent.diamonds || 0).toLocaleString()} diamonds`, 400);
    }

    const cleanTarget = targetIdentifier.trim();
    let target: any = await User.findOne({ uid: cleanTarget });
    if (!target && mongoose.isValidObjectId(cleanTarget)) {
      target = await User.findById(cleanTarget);
    }
    if (!target) {
      target = await User.findOne({ phone: cleanTarget });
    }
    if (!target) {
      throw new AppError('Recipient not found with given ID/UID/Phone', 404);
    }
    if (target._id.toString() === agentId) {
      throw new AppError('Cannot send diamonds to yourself', 400);
    }

    // Atomic debit agent & credit target
    const updatedAgent = await User.findOneAndUpdate(
      { _id: agentId, diamonds: { $gte: cleanAmount } },
      { $inc: { diamonds: -cleanAmount } },
      { new: true }
    );
    if (!updatedAgent) {
      throw new AppError('Insufficient diamond balance', 400);
    }

    const updatedTarget = await User.findByIdAndUpdate(
      target._id,
      { $inc: { diamonds: cleanAmount, wealthExp: cleanAmount }, $set: { hasPurchasedDiamonds: true, isVip: true } },
      { new: true }
    );

    // Ledger records
    await Transaction.create([
      {
        userId: agentId,
        type: 'transfer',
        amount: cleanAmount,
        currency: 'diamond',
        targetId: target._id,
        targetModel: 'User',
        status: 'completed',
        description: `Agent sent ${cleanAmount.toLocaleString()} diamonds to ${target.nickname} (${target.uid})${note ? ` - Note: ${note}` : ''}`,
      },
      {
        userId: target._id,
        type: 'transfer_in',
        amount: cleanAmount,
        currency: 'diamond',
        targetId: agentId,
        targetModel: 'User',
        status: 'completed',
        description: `Received ${cleanAmount.toLocaleString()} diamonds from Agent ${agent.nickname} (${agent.uid})${note ? ` - Note: ${note}` : ''}`,
      },
    ]);

    emitSafe('balance:update', `user:${agentId}`, { coins: updatedAgent.coins, diamonds: updatedAgent.diamonds });
    if (updatedTarget) {
      emitSafe('balance:update', `user:${target._id}`, { coins: updatedTarget.coins, diamonds: updatedTarget.diamonds });
    }

    await notificationService.createNotification(
      target._id.toString(),
      'recharge',
      'Diamonds Received',
      `Agent ${agent.nickname} sent you ${cleanAmount.toLocaleString()} diamonds.`,
      { amount: cleanAmount, currency: 'diamond' }
    );

    return {
      success: true,
      amount: cleanAmount,
      balance: updatedAgent.diamonds,
      recipient: {
        _id: target._id,
        uid: target.uid,
        nickname: target.nickname,
        avatar: target.avatar,
        role: target.role,
      },
    };
  },

  async agentConvertCurrency(agentId: string, from: 'coin' | 'diamond', amount: number) {
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new AppError('Amount must be a positive number', 400);
    }
    const cleanAmount = Math.floor(amount);

    const config = await PaymentConfig.getConfig();
    const coinRate = config.coinRate || 100;
    const diamondRate = config.diamondRate || 100;

    const agent = await User.findById(agentId);
    if (!agent) throw new AppError('User not found', 404);

    if (from === 'coin') {
      // Coins -> Diamonds
      if ((agent.coins || 0) < cleanAmount) {
        throw new AppError(`Insufficient coin balance. Available: ${(agent.coins || 0).toLocaleString()}`, 400);
      }
      const diamondsToAdd = Math.floor((cleanAmount * diamondRate) / coinRate);
      if (diamondsToAdd <= 0) {
        throw new AppError('Converted amount is too small', 400);
      }

      const updated = await User.findOneAndUpdate(
        { _id: agentId, coins: { $gte: cleanAmount } },
        { $inc: { coins: -cleanAmount, diamonds: diamondsToAdd } },
        { new: true }
      );
      if (!updated) throw new AppError('Conversion failed: insufficient balance', 400);

      await Transaction.create({
        userId: agentId,
        type: 'income_exchange',
        amount: cleanAmount,
        currency: 'coin',
        status: 'completed',
        description: `Converted ${cleanAmount.toLocaleString()} coins to ${diamondsToAdd.toLocaleString()} diamonds`,
      });

      emitSafe('balance:update', `user:${agentId}`, { coins: updated.coins, diamonds: updated.diamonds });
      return {
        success: true,
        from: 'coin',
        to: 'diamond',
        deducted: cleanAmount,
        credited: diamondsToAdd,
        coins: updated.coins,
        diamonds: updated.diamonds,
      };
    } else {
      // Diamonds -> Coins
      if ((agent.diamonds || 0) < cleanAmount) {
        throw new AppError(`Insufficient diamond balance. Available: ${(agent.diamonds || 0).toLocaleString()}`, 400);
      }
      const coinsToAdd = Math.floor((cleanAmount * coinRate) / diamondRate);
      if (coinsToAdd <= 0) {
        throw new AppError('Converted amount is too small', 400);
      }

      const updated = await User.findOneAndUpdate(
        { _id: agentId, diamonds: { $gte: cleanAmount } },
        { $inc: { diamonds: -cleanAmount, coins: coinsToAdd } },
        { new: true }
      );
      if (!updated) throw new AppError('Conversion failed: insufficient balance', 400);

      await Transaction.create({
        userId: agentId,
        type: 'income_exchange',
        amount: cleanAmount,
        currency: 'diamond',
        status: 'completed',
        description: `Converted ${cleanAmount.toLocaleString()} diamonds to ${coinsToAdd.toLocaleString()} coins`,
      });

      emitSafe('balance:update', `user:${agentId}`, { coins: updated.coins, diamonds: updated.diamonds });
      return {
        success: true,
        from: 'diamond',
        to: 'coin',
        deducted: cleanAmount,
        credited: coinsToAdd,
        coins: updated.coins,
        diamonds: updated.diamonds,
      };
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. LEAVE REQUESTS & INACTIVITY ENGINE (PRESERVED)
  // ─────────────────────────────────────────────────────────────────────────────
  async requestLeave(userId: string, reason?: string) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (!user.agencyId) throw new AppError('You are not a member of any agency', 400);

    const agency = await Agency.findById(user.agencyId);
    if (!agency) {
      user.agencyId = undefined as any;
      if (user.role === 'host') user.role = 'user';
      await user.save();
      return { success: true, status: 'approved', message: 'Agency link cleared' };
    }

    if (agency.agentId.toString() === userId) {
      throw new AppError('Agency owners cannot submit leave requests to their own agency.', 400);
    }

    const existingPending = await AgencyLeaveRequest.findOne({
      userId,
      agencyId: agency._id,
      status: 'pending',
    });

    if (existingPending) {
      throw new AppError('A leave request is already pending for this agency', 400);
    }

    const agentIdStr = agency.agentId.toString();

    const leaveRequest = await AgencyLeaveRequest.create({
      userId: user._id,
      agencyId: agency._id,
      agentId: agency.agentId,
      reason: reason || 'Member requested to leave agency',
      status: 'pending',
    });

    await notificationService.createNotification(
      agentIdStr,
      'system',
      'Agency Leave Request',
      `${user.nickname} has requested to leave your agency.`,
      {
        requestId: leaveRequest._id.toString(),
        userId: user._id.toString(),
        userNickname: user.nickname,
        userUid: user.uid,
        agencyId: agency._id.toString(),
      }
    );

    emitSafe('agency:leave-request', `user:${agentIdStr}`, {
      requestId: leaveRequest._id.toString(),
      userId: user._id.toString(),
      user: {
        _id: user._id.toString(),
        uid: user.uid,
        nickname: user.nickname,
        avatar: user.avatar,
        level: user.level,
      },
      agencyId: agency._id.toString(),
      status: 'pending',
      createdAt: leaveRequest.createdAt,
    });

    return {
      success: true,
      requestId: leaveRequest._id.toString(),
      status: 'pending',
      message: 'Leave request submitted to agency owner. Awaiting approval.',
    };
  },

  async leaveAgency(userId: string, reason?: string) {
    return this.requestLeave(userId, reason);
  },

  async getMemberLeaveStatus(userId: string) {
    const user = await User.findById(userId).select('agencyId');
    if (!user || !user.agencyId) {
      return { hasPending: false, request: null };
    }

    const pendingRequest = await AgencyLeaveRequest.findOne({
      userId,
      agencyId: user.agencyId,
      status: 'pending',
    }).sort({ createdAt: -1 });

    if (pendingRequest) {
      return { hasPending: true, request: pendingRequest.toObject() };
    }

    const latestRequest = await AgencyLeaveRequest.findOne({
      userId,
      agencyId: user.agencyId,
    }).sort({ createdAt: -1 });

    return {
      hasPending: false,
      request: latestRequest ? latestRequest.toObject() : null,
    };
  },

  async getLeaveRequests(agentId: string, status?: string) {
    const query: Record<string, any> = { agentId };
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    const requests = await AgencyLeaveRequest.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'uid nickname avatar level coins diamonds lastActiveAt')
      .populate('agencyId', 'name code')
      .lean();

    return requests;
  },

  async decideLeaveRequest(agentId: string, requestId: string, decision: 'approve' | 'reject') {
    const request = await AgencyLeaveRequest.findOne({
      _id: requestId,
      agentId,
    });

    if (!request) throw new AppError('Leave request not found or unauthorized', 404);
    if (request.status !== 'pending') {
      throw new AppError(`This leave request has already been ${request.status}`, 400);
    }

    const member = await User.findById(request.userId);
    const agency = await Agency.findById(request.agencyId);
    const memberIdStr = request.userId.toString();

    if (decision === 'approve') {
      request.status = 'approved';
      request.reviewedAt = new Date();
      await request.save();

      if (member) {
        member.agencyId = undefined as any;
        if (member.role === 'host') member.role = 'user';
        await member.save();
      }

      if (agency) {
        agency.hosts = agency.hosts.filter((h: any) => h.toString() !== memberIdStr);
        await agency.save();
      }

      await notificationService.createNotification(
        memberIdStr,
        'system',
        'Agency Leave Approved',
        `Your request to leave ${agency?.name || 'the agency'} has been approved by the owner.`,
        { requestId, status: 'approved', agencyId: request.agencyId.toString() }
      );

      emitSafe('agency:leave-decided', `user:${memberIdStr}`, {
        requestId,
        status: 'approved',
        agencyId: request.agencyId.toString(),
      });

      return { success: true, status: 'approved', message: 'Leave request approved' };
    } else {
      request.status = 'rejected';
      request.reviewedAt = new Date();
      await request.save();

      await notificationService.createNotification(
        memberIdStr,
        'system',
        'Agency Leave Rejected',
        `Your request to leave ${agency?.name || 'the agency'} was rejected by the owner.`,
        { requestId, status: 'rejected', agencyId: request.agencyId.toString() }
      );

      emitSafe('agency:leave-decided', `user:${memberIdStr}`, {
        requestId,
        status: 'rejected',
        agencyId: request.agencyId.toString(),
      });

      return { success: true, status: 'rejected', message: 'Leave request rejected' };
    }
  },

  async check30DayInactivityAndAutoLeave() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const inactiveUsers = await User.find({
      agencyId: { $exists: true, $ne: null },
      role: { $ne: 'agent' },
      $or: [
        { lastActiveAt: { $lt: thirtyDaysAgo } },
        { lastActiveAt: { $exists: false }, updatedAt: { $lt: thirtyDaysAgo } },
      ],
    }).select('_id uid nickname avatar role agencyId lastActiveAt');

    if (!inactiveUsers || inactiveUsers.length === 0) {
      return { removedCount: 0 };
    }

    let removedCount = 0;
    for (const user of inactiveUsers) {
      try {
        const agencyId = user.agencyId;
        const userIdStr = user._id.toString();

        const agency = await Agency.findById(agencyId);
        if (agency) {
          agency.hosts = agency.hosts.filter((h: any) => h.toString() !== userIdStr);
          await agency.save();

          const agentIdStr = agency.agentId.toString();

          await notificationService.createNotification(
            agentIdStr,
            'system',
            'Host Auto-Removed (30 Days Inactivity)',
            `${user.nickname} (ID: ${user.uid}) was automatically removed from your agency due to 30 days of inactivity.`,
            { userId: userIdStr, agencyId: agency._id.toString() }
          );
        }

        user.agencyId = undefined as any;
        if (user.role === 'host') user.role = 'user';
        await user.save();

        await AgencyLeaveRequest.updateMany(
          { userId: user._id, status: 'pending' },
          { $set: { status: 'approved', reason: 'Auto-removed due to 30 days inactivity', reviewedAt: new Date() } }
        );

        await notificationService.createNotification(
          userIdStr,
          'system',
          'Removed from Agency (Inactivity)',
          'You have been automatically removed from the agency due to 30 days of inactivity.',
          { agencyId: agencyId?.toString() }
        );

        removedCount++;
      } catch (err: any) {
        console.error(`[Agency 30-Day Auto-Leave] Error removing user ${user._id}:`, err?.message);
      }
    }

    return { removedCount };
  },

  startAgencyInactivityWorker() {
    if (inactivityWorkerStarted) return;
    inactivityWorkerStarted = true;

    this.check30DayInactivityAndAutoLeave().catch((err) =>
      console.error('[Agency Inactivity Worker] Startup check error:', err?.message)
    );

    setInterval(() => {
      this.check30DayInactivityAndAutoLeave().catch((err) =>
        console.error('[Agency Inactivity Worker] Periodic check error:', err?.message)
      );
    }, 60 * 60 * 1000);
  },

  async getMyAgency(userId: string) {
    await this.check30DayInactivityAndAutoLeave().catch(() => {});

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    let agency: any = null;
    if (user.agencyId) {
      agency = await Agency.findById(user.agencyId)
        .populate('agentId', 'uid nickname avatar level phone country')
        .populate('hosts', 'uid nickname avatar level lastActiveAt coins diamonds')
        .lean();
    }

    if (!agency && (user.role === 'agent' || user.isAgent)) {
      agency = await Agency.findOne({ agentId: userId })
        .populate('agentId', 'uid nickname avatar level phone country')
        .populate('hosts', 'uid nickname avatar level lastActiveAt coins diamonds')
        .lean();
    }

    if (!agency) return null;

    const memberCount = agency.hosts?.length || 0;
    const levelInfo = calculateAgencyLevel(agency.totalContribution || 0, agency.totalLiveHours || 0);

    return {
      ...agency,
      memberCount,
      level: Math.max(agency.level || 1, levelInfo.level),
      levelProgress: levelInfo.progress,
      nextThreshold: levelInfo.nextThreshold,
    };
  },

  async getMembers(agencyId: string, page: number, limit: number) {
    await this.check30DayInactivityAndAutoLeave().catch(() => {});

    const agency = await Agency.findById(agencyId);
    if (!agency) throw new AppError('Agency not found', 404);

    const total = agency.hosts.length;
    const skip = (page - 1) * limit;
    const hostIds = agency.hosts.slice(skip, skip + limit);
    const hosts = await User.find({ _id: { $in: hostIds } })
      .select('uid nickname avatar level diamonds coins lastActiveAt')
      .sort({ createdAt: -1 });

    return { data: hosts, total };
  },

  async searchAgents(query: string) {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim();
    const qRegex = { $regex: q, $options: 'i' };

    const agencies = await Agency.find({
      $or: [{ name: qRegex }, { code: { $regex: q.toUpperCase(), $options: 'i' } }],
    }).select('agentId name code avatar level');

    const agencyAgentIds = agencies.map((a) => a.agentId);
    const users = await User.find({
      $or: [
        { role: 'agent' },
        { isAgent: true },
        { _id: { $in: agencyAgentIds } },
      ],
      $and: [
        {
          $or: [
            { _id: { $in: agencyAgentIds } },
            { uid: qRegex },
            { phone: qRegex },
            { nickname: qRegex },
          ],
        },
      ],
    })
      .select('uid nickname avatar phone level isAgent role')
      .limit(10);

    return users;
  },

  async suggestAgencies(userId: string, limit: number = 5) {
    const user = await User.findById(userId).select('_id role');
    if (!user) throw new AppError('User not found', 404);

    const agencies = await Agency.find({ isBanned: false })
      .populate('agentId', 'uid nickname avatar level')
      .sort({ totalContribution: -1, 'hosts.length': -1, level: -1 })
      .limit(limit);

    const results = [];
    for (const agency of agencies) {
      const populated = agency.toObject ? agency.toObject() : { ...agency };
      const agentRef: any = populated.agentId;
      const agentId = agentRef?._id?.toString();
      if (agentId === userId) continue;

      const agent = agentRef && typeof agentRef === 'object' ? agentRef : null;
      const levelInfo = calculateAgencyLevel(populated.totalContribution || 0, populated.totalLiveHours || 0);

      results.push({
        _id: populated._id,
        name: populated.name,
        code: populated.code,
        avatar: populated.avatar || agent?.avatar || '',
        description: populated.description,
        type: populated.type || 'public',
        level: Math.max(populated.level || 1, levelInfo.level),
        commission: populated.commission,
        memberCount: populated.hosts?.length || 0,
        totalContribution: populated.totalContribution || 0,
        agent: agent
          ? { _id: agent._id, uid: agent.uid, nickname: agent.nickname, avatar: agent.avatar }
          : null,
      });
    }

    return results;
  },
};
