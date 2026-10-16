import mongoose from 'mongoose';
import { Call, User, Transaction, Chat, ChatMessage } from '../models';
import { AppError } from '../middleware/errorHandler';
import { generateAgoraToken } from '../config/agora';
import { getIO } from '../socket';
import { chatService } from './chat.service';
import { pushNotificationService } from './pushNotification.service';
import { referralService } from './referral.service';
import crypto from 'crypto';

/** Hard cap on group call participants (user requirement). */
export const MAX_CALL_PARTICIPANTS = 10;

/** Minimum audience balance required to initiate a 1:1 call (coins). */
export const MIN_AUDIENCE_BALANCE = 1_000_000;

/** Host gets 60%, company keeps 40%. */
const HOST_SHARE = 0.6;

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
  /**
   * Check whether an audience member can initiate a 1:1 call with a host.
   * Returns a quote with the host's price, audience balance, and whether
   * the call can proceed.
   */
  async getCallQuote(callerId: string, hostId: string) {
    const host = await User.findById(hostId).select('callPricePerMinute nickname avatar');
    if (!host) throw new AppError('User not found', 404);

    const caller = await User.findById(callerId).select('coins matchSubscription');
    const coinsPerMinute = typeof host.callPricePerMinute === 'number' ? host.callPricePerMinute : 1000;
    const balance = caller?.coins || 0;

    const isSubActive = Boolean(
      caller?.matchSubscription?.active &&
      caller?.matchSubscription?.expiresAt &&
      new Date(caller.matchSubscription.expiresAt) > new Date()
    );
    const hasFreeCall = isSubActive && (caller?.matchSubscription?.freeCallsRemaining || 0) > 0;

    const hasMinuteBalance = hasFreeCall || coinsPerMinute <= 0 || balance >= coinsPerMinute;
    const canCall = hasMinuteBalance;

    let reason: string | undefined;
    if (!hasMinuteBalance) {
      reason = `You need at least ${coinsPerMinute.toLocaleString()} Coins for 1 minute`;
    }

    return {
      coinsPerMinute,
      balance,
      canCall,
      reason,
      minBalance: hasFreeCall ? 0 : coinsPerMinute,
      hasFreeCall,
      freeCallsRemaining: caller?.matchSubscription?.freeCallsRemaining || 0,
      hostNickname: host.nickname,
      hostAvatar: host.avatar,
    };
  },

  /**
   * Create a ringing call invitation.
   * For 1:1 calls, lock in the dynamic per-minute coin price.
   * source: 'profile' | 'messenger' — tracked for analytics.
   */
  async createCall(
    initiatorId: string,
    recipientIds: string[],
    type: 'audio' | 'video' = 'audio',
    source: 'profile' | 'messenger' = 'messenger'
  ) {
    const recipients = [...new Set(recipientIds.filter((id) => id && id !== initiatorId))];
    if (recipients.length === 0) throw new AppError('No recipients specified', 400);
    if (recipients.length + 1 > MAX_CALL_PARTICIPANTS) {
      throw new AppError(`Group call supports up to ${MAX_CALL_PARTICIPANTS} participants`, 400);
    }

    const found = await User.find({ _id: { $in: recipients } }).select('_id role callPricePerMinute').lean();
    if (found.length !== recipients.length) throw new AppError('One or more users not found', 404);

    // For 1:1 calls, determine the pricing based on recipient's callPricePerMinute.
    let hostId: string | undefined;
    let audienceId: string | undefined;
    let coinsPerMinute = 0;
    let isFreeMinuteApplied = false;

    if (recipients.length === 1) {
      const recipient = found[0] as any;
      const initiator = (await User.findById(initiatorId).select('role coins matchSubscription').lean()) as any;

      const rate = typeof recipient.callPricePerMinute === 'number' ? recipient.callPricePerMinute : 1000;
      if (rate > 0) {
        hostId = String(recipient._id);
        audienceId = initiatorId;
        coinsPerMinute = rate;

        const isSubActive = Boolean(
          initiator?.matchSubscription?.active &&
          initiator?.matchSubscription?.expiresAt &&
          new Date(initiator.matchSubscription.expiresAt) > new Date()
        );
        const freeCalls = initiator?.matchSubscription?.freeCallsRemaining || 0;

        if (isSubActive && freeCalls > 0) {
          isFreeMinuteApplied = true;
          // Deduct 1 free call from allowance
          await User.updateOne(
            { _id: initiatorId },
            { $inc: { 'matchSubscription.freeCallsRemaining': -1 } }
          );
        } else {
          const audienceCoins = initiator?.coins || 0;
          if (audienceCoins < coinsPerMinute) {
            throw new AppError(`Insufficient Coins for 1 minute at ${coinsPerMinute.toLocaleString()} Coins/min`, 402);
          }
        }
      }
    }

    // Close any previous ringing call I initiated (idempotent per initiator) and record them as missed
    try {
      const previousRinging = await Call.find({ initiatorId, status: 'ringing' });
      for (const prev of previousRinging) {
        prev.status = 'missed';
        prev.endedAt = new Date();
        prev.endReason = 'MISSED';
        await prev.save();
        this._recordCallHistoryMessage(prev, 'missed', initiatorId).catch(() => {});
      }
    } catch {}

    const channel = `call_${crypto.randomUUID().slice(0, 8)}_${Date.now()}`;
    const participants = [initiatorId, ...recipients];
    const call = await Call.create({
      participants,
      recipientIds: recipients,
      initiatorId,
      channel,
      type,
      callSource: source,
      status: 'ringing',
      maxParticipants: MAX_CALL_PARTICIPANTS,
      isFreeMinuteApplied,
      freeMinuteUsed: false,
      ...(hostId && { hostId, audienceId, coinsPerMinute }),
    });

    const token = generateAgoraToken(channel, 0, 'publisher');
    const callId = call._id.toString();

    const initiatorProfile = await User.findById(initiatorId).select('nickname avatar').lean() as any;
    const invite = {
      callId,
      channel,
      type,
      callSource: source,
      initiatorId,
      token,
      initiator: initiatorProfile ? { nickname: initiatorProfile.nickname, avatar: initiatorProfile.avatar } : undefined,
      participantCount: participants.length,
      maxParticipants: MAX_CALL_PARTICIPANTS,
      coinsPerMinute,
      isFreeMinuteApplied,
    };
    let recipientOnline = false;
    try {
      const io = getIO();
      if (io && recipients.length === 1) {
        const room = io.sockets.adapter.rooms.get(`user:${recipients[0]}`);
        if (room && room.size > 0) {
          recipientOnline = true;
        }
      }
    } catch {}

    for (const id of recipients) {
      emitSafe('call:invite', `user:${id}`, invite);
      pushNotificationService.sendIncomingCallPush(id, {
        callId,
        channel,
        type,
        initiatorId,
        initiatorName: initiatorProfile?.nickname || 'User',
        initiatorAvatar: initiatorProfile?.avatar || '',
        token,
        coinsPerMinute,
      }).catch((err) => console.warn('[call] Error sending incoming call push:', err));
    }

    if (recipientOnline) {
      emitSafe('call:ringing', `user:${initiatorId}`, { callId, recipientId: recipients[0], online: true });
    } else {
      emitSafe('call:calling', `user:${initiatorId}`, { callId, recipientId: recipients[0], online: false });
    }

    return {
      callId,
      channel,
      type,
      token,
      participantCount: participants.length,
      maxParticipants: MAX_CALL_PARTICIPANTS,
      coinsPerMinute,
      isFreeMinuteApplied,
      recipientOnline,
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

    // Prepaid System: Deduct Minute 1 upfront immediately as the call connects
    let audienceCoins: number | undefined;
    let isLowBalance = false;
    let minutesRemaining = 0;

    if (call.audienceId && call.coinsPerMinute > 0 && call.minutesBilled === 0) {
      const audience = await User.findOneAndUpdate(
        { _id: call.audienceId, coins: { $gte: call.coinsPerMinute } },
        { $inc: { coins: -call.coinsPerMinute } },
        { new: true }
      );

      if (!audience) {
        call.status = 'ended';
        call.endedAt = new Date();
        call.endReason = 'INSUFFICIENT_COINS';
        await call.save();
        emitSafe('call:coins-finished', `user:${call.audienceId.toString()}`, { callId });
        throw new AppError('Caller has insufficient coins for the first minute', 402);
      }

      call.minutesBilled = 1;
      call.totalCoins = call.coinsPerMinute;

      await Transaction.create({
        userId: call.audienceId,
        type: 'call_payment' as const,
        amount: call.coinsPerMinute,
        currency: 'coin' as const,
        sourceType: 'call',
        targetId: call.hostId,
        targetModel: 'User',
        status: 'completed' as const,
        description: `1:1 call billing (prepaid) — minute 1`,
      });

      audienceCoins = audience.coins;
      minutesRemaining = Math.floor(audience.coins / call.coinsPerMinute);
      isLowBalance = minutesRemaining <= 1;

      emitSafe('balance:update', `user:${call.audienceId.toString()}`, {
        coins: audience.coins,
        minutesBilled: 1,
        totalCoins: call.coinsPerMinute,
        isLowBalance,
        minutesRemaining,
      });
    }

    await call.save();

    const token = generateAgoraToken(call.channel, 0, 'publisher');
    const callIdStr = call._id.toString();

    emitSafe('call:accept', `user:${call.initiatorId.toString()}`, {
      callId: callIdStr,
      channel: call.channel,
      type: call.type,
      token,
      coinsPerMinute: call.coinsPerMinute,
      audienceCoins,
      minutesBilled: call.minutesBilled,
      isLowBalance,
      minutesRemaining,
    });

    const profile = await getDisplayProfile(userId);
    emitSafe('call:member-joined', `call:${callIdStr}`, {
      callId: callIdStr,
      ...profile,
    });

    return {
      callId: callIdStr,
      channel: call.channel,
      type: call.type,
      token,
      coinsPerMinute: call.coinsPerMinute,
      audienceCoins,
      minutesBilled: call.minutesBilled,
      isLowBalance,
      minutesRemaining,
    };
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
      coinsPerMinute: call.coinsPerMinute,
    };
  },

  /**
   * Backend-controlled per-minute billing tick.
   *
  /**
   * Backend-controlled per-minute billing tick.
   *
   * Called by the server-side interval (or by the client as a heartbeat).
   * Uses atomic findOneAndUpdate so that the same minute cannot be double-spent.
   *
   * Returns the new audience balance so the client can update the UI.
   */
  async billingTick(callId: string, _requestingUserId: string) {
    try {
      // Re-fetch the call
      const call = await Call.findOne({ _id: callId, status: 'active' });
      if (!call) return null;

      // Only priced 1:1 calls need billing
      if (!call.audienceId || !call.hostId || call.coinsPerMinute <= 0) {
        return null;
      }

      const audienceId = call.audienceId.toString();

      // Free 1st minute under 1:1 Subscription Card
      if (call.isFreeMinuteApplied && !call.freeMinuteUsed) {
        call.freeMinuteUsed = true;
        call.minutesBilled += 1;
        // 0 coins charged for minute 1!
        await call.save();

        const audience = await User.findById(audienceId).select('coins');
        const audienceCoins = audience?.coins || 0;
        const minutesRemaining = Math.floor(audienceCoins / call.coinsPerMinute);

        emitSafe('balance:update', `user:${audienceId}`, {
          coins: audienceCoins,
          minutesBilled: call.minutesBilled,
          totalCoins: call.totalCoins,
          isLowBalance: minutesRemaining <= 1,
          minutesRemaining,
          isFreeMinute: true,
        });

        return {
          coinsFinished: false,
          audienceCoins,
          minutesBilled: call.minutesBilled,
          totalCoins: call.totalCoins,
          isLowBalance: minutesRemaining <= 1,
          minutesRemaining,
          isFreeMinute: true,
        };
      }

      // Atomic deduction — only deduct if the audience has enough coins
      const audience = await User.findOneAndUpdate(
        {
          _id: audienceId,
          coins: { $gte: call.coinsPerMinute },
        },
        { $inc: { coins: -call.coinsPerMinute } },
        { new: true }
      );

      if (!audience) {
        // Audience has run out of coins → end the call
        await this._endCallInsufficientCoins(callId, audienceId);
        return { coinsFinished: true };
      }

      // Update billing tallies on the call record
      call.minutesBilled += 1;
      call.totalCoins += call.coinsPerMinute;
      await call.save();

      // Record audience payment transaction
      await Transaction.create({
        userId: audienceId,
        type: 'call_payment' as const,
        amount: call.coinsPerMinute,
        currency: 'coin' as const,
        sourceType: 'call',
        targetId: call.hostId,
        targetModel: 'User',
        status: 'completed' as const,
        description: `1:1 call billing — minute ${call.minutesBilled}`,
      });

      const minutesRemaining = Math.floor(audience.coins / call.coinsPerMinute);
      const isLowBalance = minutesRemaining <= 1;

      // Emit live balance update to the audience
      emitSafe('balance:update', `user:${audienceId}`, {
        coins: audience.coins,
        minutesBilled: call.minutesBilled,
        totalCoins: call.totalCoins,
        isLowBalance,
        minutesRemaining,
      });

      return {
        coinsFinished: false,
        audienceCoins: audience.coins,
        minutesBilled: call.minutesBilled,
        totalCoins: call.totalCoins,
        isLowBalance,
        minutesRemaining,
      };
    } catch (err) {
      console.error('[call] Error in billingTick:', err);
      return null;
    }
  },

  /** Internal helper — force-end a call due to insufficient coins. */
  async _endCallInsufficientCoins(callId: string, audienceId: string) {
    const call = await Call.findOne({ _id: callId });
    if (!call || call.status === 'ended') return;

    call.status = 'ended';
    call.endedAt = new Date();
    call.endReason = 'INSUFFICIENT_COINS';
    await call.save();

    // Finalize earnings
    await callService.finalizeCallBilling(callId);

    // Record call history in conversation
    this._recordCallHistoryMessage(call, 'ended', audienceId).catch(() => {});

    // Notify all participants
    const callIdStr = call._id.toString();
    const endPayload = {
      callId: callIdStr,
      outcome: 'ended',
      reason: 'INSUFFICIENT_COINS',
    };
    for (const p of call.participants as any[]) {
      emitSafe('call:end', `user:${p.toString()}`, endPayload);
    }
    emitSafe('call:coins-finished', `user:${audienceId}`, { callId: callIdStr });
  },

  /**
   * Finalize call billing — idempotent (guarded by `finalized` flag).
   *
   * Calculates total coins charged, distributes to host and records
   * the earning. Safe to call multiple times; only the first call does any work.
   */
  async finalizeCallBilling(callId: string) {
    try {
      // Atomic lock — only process if not already finalized
      const call = await Call.findOneAndUpdate(
        { _id: callId, finalized: false, coinsPerMinute: { $gt: 0 } },
        { $set: { finalized: true } },
        { new: true }
      );

      if (!call) {
        // Already finalized or not a priced call
        return null;
      }

      if (call.totalCoins <= 0) {
        // Nothing was charged — check if free minute was applied
        if (call.startedAt && call.audienceId) {
          if (call.isFreeMinuteApplied) {
            // Free 1st minute under 1:1 subscription! No coins deducted
            call.minutesBilled = 1;
            call.totalCoins = 0;
            await call.save();
            return { totalCoins: 0, hostEarning: 0, isFree: true };
          }

          const chargedCoins = call.coinsPerMinute;

          // Deduct from audience
          await User.findOneAndUpdate(
            { _id: call.audienceId, coins: { $gte: chargedCoins } },
            { $inc: { coins: -chargedCoins } }
          );

          call.minutesBilled = 1;
          call.totalCoins = chargedCoins;
          await call.save();

          await Transaction.create({
            userId: call.audienceId,
            type: 'call_payment' as const,
            amount: chargedCoins,
            currency: 'coin' as const,
            sourceType: 'call',
            targetId: call.hostId,
            targetModel: 'User',
            status: 'completed' as const,
            description: `1:1 call — minimum 1 minute charge`,
          });
        } else {
          return null;
        }
      }

      const totalCoins = call.totalCoins;
      const hostEarning = totalCoins; // Host receives 100% of coins configured for their call

      // Credit host
      await User.findOneAndUpdate(
        { _id: call.hostId },
        { $inc: { coins: hostEarning } }
      );

      // Record host earning transaction
      await Transaction.create([
        {
          userId: call.hostId,
          type: 'call_earning' as const,
          amount: hostEarning,
          currency: 'coin' as const,
          sourceType: 'call',
          targetId: call.audienceId,
          targetModel: 'User',
          status: 'completed' as const,
          description: `1:1 call earning — ${call.minutesBilled} min (${call.coinsPerMinute} coins/min)`,
        },
      ]);

      // Record finalized amounts on the call
      call.hostEarning = hostEarning;
      call.companyCommission = 0;
      await call.save();

      // Distribute 10% Lifetime Referral Commission to inviter if qualified (25+ invites)
      if (call.hostId && hostEarning > 0) {
        referralService.distributeInviterLifetimeCommission(
          call.hostId.toString(),
          hostEarning,
          `1:1 Call (${call.minutesBilled} min)`
        ).catch((err) => console.error('[Referral] Call commission error:', err));
      }

      // Emit updated balance to host & audience
      const [host, audience] = await Promise.all([
        User.findById(call.hostId).select('coins diamonds wealthExp wealthLevel').lean(),
        call.audienceId ? User.findById(call.audienceId).select('coins diamonds wealthExp wealthLevel').lean() : null,
      ]);
      if (host) {
        emitSafe('balance:update', `user:${call.hostId!.toString()}`, {
          coins: host.coins,
          diamonds: host.diamonds,
          wealthExp: host.wealthExp,
          wealthLevel: host.wealthLevel,
        });
      }
      if (audience) {
        emitSafe('balance:update', `user:${call.audienceId!.toString()}`, {
          coins: audience.coins,
          diamonds: audience.diamonds,
          wealthExp: audience.wealthExp,
          wealthLevel: audience.wealthLevel,
        });
      }

      return {
        totalCoins,
        hostEarning,
        companyCommission: 0,
        minutesBilled: call.minutesBilled,
      };
    } catch (err) {
      console.error('[call] Error in finalizeCallBilling:', err);
      return null;
    }
  },

  /** Reject / cancel / hang up — idempotent, group-aware fan-out. */
  async endCall(
    callId: string,
    userId: string,
    outcome: 'rejected' | 'ended' | 'missed' = 'ended'
  ) {
    const call = await Call.findOne({ _id: callId, participants: userId });
    if (!call) throw new AppError('Call not found', 404);
    if (call.status === 'ended' || call.status === 'missed') {
      return { callId: call._id.toString(), status: call.status };
    }

    const callIdStr = call._id.toString();
    const isInitiator = call.initiatorId.toString() === userId;

    if (isInitiator || outcome === 'rejected') {
      call.status = outcome === 'rejected' ? 'rejected' : 'ended';
      call.endedAt = new Date();
      call.endedById = userId as any;
      call.endReason = outcome === 'rejected' ? 'REJECTED' : 'HANGUP';
      await call.save();

      const others = (call.participants as any[])
        .map((p) => p.toString())
        .filter((id) => id !== userId);

      const endPayload = { callId: callIdStr, outcome: call.status, endedById: userId };
      for (const id of others) {
        emitSafe('call:end', `user:${id}`, endPayload);
        pushNotificationService.sendCallCancelledPush(id, callIdStr).catch(() => {});
      }
      emitSafe('call:member-left', `call:${callIdStr}`, { callId: callIdStr, userId });

      // Finalize billing if this was a priced call
      if (call.hostId && call.audienceId && call.coinsPerMinute > 0) {
        callService.finalizeCallBilling(callIdStr).catch((err) =>
          console.error('[call] finalizeCallBilling error:', err)
        );
      }

      // Record call history in conversation
      this._recordCallHistoryMessage(call, outcome, userId).catch((err) =>
        console.error('[call] recordCallHistoryMessage error:', err)
      );
    } else {
      call.participants = call.participants.filter((p) => p.toString() !== userId) as any;

      if (call.participants.length >= 2) {
        await call.save();
        emitSafe('call:member-left', `call:${callIdStr}`, { callId: callIdStr, userId });
      } else {
        call.status = 'ended';
        call.endedAt = new Date();
        call.endedById = userId as any;
        call.endReason = 'HANGUP';
        await call.save();

        const lastId = call.participants[0]?.toString();
        if (lastId) {
          emitSafe('call:end', `user:${lastId}`, { callId: callIdStr, outcome: 'ended', endedById: userId });
        }
        emitSafe('call:member-left', `call:${callIdStr}`, { callId: callIdStr, userId });

        // Finalize billing
        if (call.hostId && call.audienceId && call.coinsPerMinute > 0) {
          callService.finalizeCallBilling(callIdStr).catch((err) =>
            console.error('[call] finalizeCallBilling error:', err)
          );
        }

        // Record call history in conversation
        this._recordCallHistoryMessage(call, outcome, userId).catch((err) =>
          console.error('[call] recordCallHistoryMessage error:', err)
        );
      }
    }

    return { callId: callIdStr, status: call.status };
  },

  /** Record 1:1 call history as a ChatMessage in the conversation */
  async _recordCallHistoryMessage(call: any, outcome: string, endedByUserId: string) {
    try {
      if (!call) return;

      const callId = call._id?.toString?.() || String(call._id || '');
      if (callId) {
        // Atomic lock to ensure call history is recorded exactly once per call session
        const updated = await Call.findOneAndUpdate(
          { _id: callId, recordedInChat: { $ne: true } },
          { $set: { recordedInChat: true } },
          { new: true }
        );
        if (!updated) {
          // Already recorded
          return;
        }
      }

      // Collect all unique participant IDs from all call fields
      const pSet = new Set<string>();
      if (call.initiatorId) pSet.add(call.initiatorId.toString());
      if (endedByUserId) pSet.add(endedByUserId.toString());
      if (call.hostId) pSet.add(call.hostId.toString());
      if (call.audienceId) pSet.add(call.audienceId.toString());
      if (Array.isArray(call.participants)) {
        for (const p of call.participants) {
          if (p) pSet.add(p.toString());
        }
      }
      if (Array.isArray(call.recipientIds)) {
        for (const r of call.recipientIds) {
          if (r) pSet.add(r.toString());
        }
      }

      const uniqueParticipants = Array.from(pSet).filter(Boolean);
      if (uniqueParticipants.length === 2) {
        const initiatorId = String(call.initiatorId || uniqueParticipants[0]);
        const recipientId = String(uniqueParticipants.find((id) => id !== initiatorId) || uniqueParticipants[1]);

        const chat = await chatService.getOrCreateChat(initiatorId, recipientId);
        if (chat && chat._id) {
          let callStatus: 'completed' | 'missed' | 'rejected' | 'cancelled' = 'completed';
          let durationSeconds = 0;
          const isVideo = call.type === 'video';
          let label = isVideo ? 'Video call' : 'Audio call';

          if (outcome === 'rejected' || call.status === 'rejected') {
            callStatus = 'rejected';
            label = `${label} declined`;
          } else if (call.startedAt) {
            callStatus = 'completed';
            const end = call.endedAt ? new Date(call.endedAt).getTime() : Date.now();
            const start = new Date(call.startedAt).getTime();
            durationSeconds = Math.max(1, Math.floor((end - start) / 1000));
            const mins = Math.floor(durationSeconds / 60);
            const secs = durationSeconds % 60;
            const timeFormatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
            label = `${label} (${timeFormatted})`;
          } else {
            const wasEndedByInitiator = endedByUserId === initiatorId;
            callStatus = wasEndedByInitiator ? 'cancelled' : 'missed';
            label = callStatus === 'cancelled' ? `Cancelled ${label.toLowerCase()}` : `Missed ${label.toLowerCase()}`;
          }

          const callMsg = await ChatMessage.create({
            chatId: chat._id,
            senderId: initiatorId,
            message: label,
            kind: 'call',
            callType: call.type || 'audio',
            callDuration: durationSeconds,
            callStatus,
            read: false,
            delivered: true,
            status: 'delivered',
          });

          chat.lastMessage = isVideo ? `📹 ${label}` : `📞 ${label}`;
          chat.lastMessageAt = new Date();
          chat.lastMessageBy = initiatorId as any;
          await chat.save();

          // Socket broadcast to both participants in the chat
          try {
            const io = getIO();
            const msgObj = callMsg.toObject();
            io.to(`user:${initiatorId}`).emit('chat:message', { chatId: chat._id.toString(), message: msgObj });
            io.to(`user:${recipientId}`).emit('chat:message', { chatId: chat._id.toString(), message: msgObj });
          } catch (sockErr) {
            console.error('[call] Socket emit error:', sockErr);
          }
        }
      }
    } catch (err) {
      console.error('[call] Error recording call history message:', err);
    }
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

    return {
      callId: call._id.toString(),
      channel: call.channel,
      type: call.type,
      status: call.status,
      token: generateAgoraToken(call.channel, 0, 'publisher'),
      participantCount: call.participants.length,
      maxParticipants: call.maxParticipants,
      coinsPerMinute: call.coinsPerMinute,
      participants: (call.participants as any[]).map((p) => ({
        _id: p._id.toString(),
        uid: p.uid,
        nickname: p.nickname,
        avatar: p.avatar,
      })),
    };
  },
};
