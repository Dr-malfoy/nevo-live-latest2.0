import { Call, User } from '../models';
import { AppError } from '../middleware/errorHandler';
import { generateAgoraToken } from '../config/agora';
import { getIO } from '../socket';
import crypto from 'crypto';

/** Hard cap on group call participants (user requirement). */
export const MAX_CALL_PARTICIPANTS = 10;

const emitSafe = (event: string, target: string, payload: unknown) => {
  try {
    getIO().to(target).emit(event, payload);
  } catch {
    // socket not initialized
  }
};

/** Resolve display identity for member-joined/leave broadcasts. */
const getDisplayProfile = async (userId: string) => {
  const u = await User.findById(userId).select('nickname avatar').lean();
  return { userId, nickname: u?.nickname || 'User', avatar: u?.avatar || '' };
};

/**
 * 1:1 and group audio/video calls over the existing Agora infrastructure.
 * All participants use a wildcard publisher token (mode 'rtc' on the client).
 * Group semantics:
 *  - The initiator hanging up ends the call for everyone.
 *  - A non-initiator leaving just removes them; the call continues.
 *  - When only one member remains and they leave, the call ends.
 *  - Max participants is enforced server-side (default 10).
 */
export const callService = {
  /** Create a ringing call invitation (1:1 or group, max 10). */
  async createCall(initiatorId: string, recipientIds: string[], type: 'audio' | 'video' = 'audio') {
    const recipients = [...new Set(recipientIds.filter((id) => id && id !== initiatorId))];
    if (recipients.length === 0) throw new AppError('No recipients specified', 400);
    if (recipients.length + 1 > MAX_CALL_PARTICIPANTS) {
      throw new AppError(`Group call supports up to ${MAX_CALL_PARTICIPANTS} participants`, 400);
    }

    const found = await User.find({ _id: { $in: recipients } }).select('_id').lean();
    if (found.length !== recipients.length) throw new AppError('One or more users not found', 404);

    // Close any previous ringing call I initiated (idempotent per initiator)
    await Call.updateMany(
      { initiatorId, status: 'ringing' },
      { $set: { status: 'missed' } }
    );

    const channel = `call_${crypto.randomUUID().slice(0, 8)}_${Date.now()}`;
    const participants = [initiatorId, ...recipients];
    const call = await Call.create({
      participants,
      initiatorId,
      channel,
      type,
      status: 'ringing',
      maxParticipants: MAX_CALL_PARTICIPANTS,
    });

    // Tokens are generated with uid 0 (wildcard) so every participant can join
    // with their own client-chosen uid. A uid-bound token would be rejected by
    // Agora whenever the client joins with a different uid.
    const token = generateAgoraToken(channel, 0, 'publisher');
    const callId = call._id.toString();

    // Notify each recipient in real time
    const invite = {
      callId,
      channel,
      type,
      initiatorId,
      token,
      participantCount: participants.length,
      maxParticipants: MAX_CALL_PARTICIPANTS,
    };
    for (const id of recipients) emitSafe('call:invite', `user:${id}`, invite);

    return {
      callId,
      channel,
      type,
      token,
      participantCount: participants.length,
      maxParticipants: MAX_CALL_PARTICIPANTS,
    };
  },

  /** Callee accepts an invite — mark active and hand them a token. */
  async acceptCall(callId: string, userId: string) {
    const call = await Call.findOne({ _id: callId, participants: userId });
    if (!call) throw new AppError('Call not found', 404);
    if (call.status !== 'ringing' && call.status !== 'active') {
      throw new AppError('Call is no longer ringing', 400);
    }

    call.status = 'active';
    if (!call.startedAt) call.startedAt = new Date();
    if (!call.participants.some((p) => p.toString() === userId)) {
      call.participants.push(userId as any);
    }
    await call.save();

    // Wildcard token (uid 0) — the callee joins with their own client-chosen uid.
    const token = generateAgoraToken(call.channel, 0, 'publisher');
    const callIdStr = call._id.toString();

    // Notify the initiator that the callee joined
    emitSafe('call:accept', `user:${call.initiatorId.toString()}`, {
      callId: callIdStr,
      channel: call.channel,
      type: call.type,
      token,
    });

    // Notify the other participants (grid update)
    const profile = await getDisplayProfile(userId);
    emitSafe('call:member-joined', `call:${callIdStr}`, {
      callId: callIdStr,
      ...profile,
    });

    return { callId: callIdStr, channel: call.channel, type: call.type, token };
  },

  /** Join an active call (the "Join" option) — max 10 enforced here. */
  async joinCall(callId: string, userId: string) {
    const call = await Call.findOne({ _id: callId });
    if (!call) throw new AppError('Call not found', 404);
    if (call.status !== 'active') throw new AppError('Call is no longer active', 400);

    if (!call.participants.some((p) => p.toString() === userId)) {
      if (call.participants.length >= call.maxParticipants) {
        throw new AppError('Call is full', 400);
      }
      call.participants.push(userId as any);
      await call.save();
    }

    const token = generateAgoraToken(call.channel, 0, 'publisher');
    const callIdStr = call._id.toString();

    const profile = await getDisplayProfile(userId);
    emitSafe('call:member-joined', `call:${callIdStr}`, { callId: callIdStr, ...profile });

    return {
      callId: callIdStr,
      channel: call.channel,
      type: call.type,
      token,
      participantCount: call.participants.length,
      maxParticipants: call.maxParticipants,
    };
  },

  /** Reject / cancel / hang up — idempotent, group-aware fan-out. */
  async endCall(callId: string, userId: string, outcome: 'rejected' | 'ended' | 'missed' = 'ended') {
    const call = await Call.findOne({ _id: callId, participants: userId });
    if (!call) throw new AppError('Call not found', 404);
    if (call.status === 'ended' || call.status === 'missed') {
      return { callId: call._id.toString(), status: call.status };
    }

    const callIdStr = call._id.toString();
    const isInitiator = call.initiatorId.toString() === userId;

    if (isInitiator || outcome === 'rejected') {
      // Initiator hangs up (or anyone rejects the invite) → the call ends for everyone.
      call.status = 'ended';
      call.endedAt = new Date();
      call.endedById = userId as any;
      await call.save();

      const others = (call.participants as any[])
        .map((p) => p.toString())
        .filter((id) => id !== userId);

      const endPayload = { callId: callIdStr, outcome: 'ended', endedById: userId };
      for (const id of others) emitSafe('call:end', `user:${id}`, endPayload);
      emitSafe('call:member-left', `call:${callIdStr}`, { callId: callIdStr, userId });
    } else {
      // Non-initiator leaves → remove them; the rest stay in the call.
      call.participants = call.participants.filter((p) => p.toString() !== userId) as any;

      if (call.participants.length >= 2) {
        await call.save();
        emitSafe('call:member-left', `call:${callIdStr}`, { callId: callIdStr, userId });
      } else {
        // Only one member left → the call is over for everyone.
        call.status = 'ended';
        call.endedAt = new Date();
        call.endedById = userId as any;
        await call.save();

        const lastId = call.participants[0]?.toString();
        if (lastId) {
          emitSafe('call:end', `user:${lastId}`, { callId: callIdStr, outcome: 'ended', endedById: userId });
        }
        emitSafe('call:member-left', `call:${callIdStr}`, { callId: callIdStr, userId });
      }
    }

    return { callId: callIdStr, status: call.status };
  },

  /** Active, joinable calls for the "Join" lobby (excludes my own). */
  async getActiveCalls(userId: string) {
    const calls = await Call.find({
      status: 'active',
      initiatorId: { $ne: userId },
      participants: { $nin: [userId] },
      $expr: { $lt: [{ $size: '$participants' }, '$maxParticipants'] },
    })
      .sort({ startedAt: -1 })
      .limit(20)
      .populate('participants initiatorId', 'nickname avatar uid verification');

    return calls.map((call) => ({
      callId: call._id.toString(),
      type: call.type,
      startedAt: call.startedAt,
      participants: (call.participants as any[]).map((p) => ({
        _id: p._id.toString(),
        uid: p.uid,
        nickname: p.nickname,
        avatar: p.avatar,
      })),
      maxParticipants: call.maxParticipants,
    }));
  },

  /** Current call session for a participant (re-entry / roster). */
  async getCallById(callId: string, userId: string) {
    const call = await Call.findOne({ _id: callId, participants: userId })
      .populate('participants initiatorId', 'nickname avatar uid verification');

    if (!call) throw new AppError('Call not found', 404);
    if (call.status !== 'active') throw new AppError('Call is no longer active', 400);

    return {
      callId: call._id.toString(),
      channel: call.channel,
      type: call.type,
      token: generateAgoraToken(call.channel, 0, 'publisher'),
      participantCount: call.participants.length,
      maxParticipants: call.maxParticipants,
      participants: (call.participants as any[]).map((p) => ({
        _id: p._id.toString(),
        uid: p.uid,
        nickname: p.nickname,
        avatar: p.avatar,
      })),
    };
  },

  /** 1-to-1 call pricing quote (#72) */
  async getCallQuote(callerId: string, hostId: string) {
    const host = await User.findById(hostId).select('callPricePerMinute');
    if (!host) throw new AppError('Host not found', 404);

    const caller = await User.findById(callerId).select('coins');
    const coinsPerMinute = host.callPricePerMinute || 10000;
    const balance = caller?.coins || 0;
    const canCall = balance >= coinsPerMinute;
    const reason = canCall ? undefined : 'Insufficient coins for 1 minute call';

    return {
      coinsPerMinute,
      balance,
      canCall,
      reason,
    };
  },
};
