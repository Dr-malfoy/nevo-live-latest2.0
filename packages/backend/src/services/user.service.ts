import mongoose from 'mongoose';
import { User, LiveStream, Chat, ChatMessage, Notification, Moment, PurchaseOrder, WithdrawalRequest, SellRequest, AgentPurchaseOrder, Report, ContactMessage, Transaction, Agency, Room, ProfileVisit } from '../models';
import { AppError } from '../middleware/errorHandler';
import { hashPassword, comparePassword } from '../utils/hash';
import { getSkip } from '../utils/pagination';
import { getFirebaseApp } from '../config/firebase';
import { uploadService } from './upload.service';

import { calculateWealthLevel, calculateLiveLevel } from '../utils/userLevels';

/**
 * Fields every user card / list row needs: identity, level + noble for the
 * badges above the name, role + sellerType for the tag under it, country for
 * the flag, and lastActiveAt for the online dot (requirement #3).
 */
const CARD_FIELDS =
  'uid nickname avatar cover level wealthLevel liveLevel wealthExp isAgent noble role sellerType hostBadge hostBadgeType hostBadgeAssignedAt hostBadgeExpiresAt verification country gender bio tags lastActiveAt diamonds coins isVip hasPurchasedDiamonds';

/** A user counts as online if they were active in the last 5 minutes. */
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const isOnline = (lastActiveAt?: Date | null): boolean =>
  !!lastActiveAt && Date.now() - new Date(lastActiveAt).getTime() < ONLINE_WINDOW_MS;

/** Whole years between `birthday` and today, or null when no birthday is set. */
const ageFrom = (birthday?: Date | null): number | null => {
  if (!birthday) return null;
  const dob = new Date(birthday);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age >= 0 && age < 150 ? age : null;
};

/** Attach the derived presentation fields every client needs. */
const decorate = (plain: any) => {
  const isVip = Boolean(plain?.isVip || plain?.hasPurchasedDiamonds || (plain?.wealthExp && plain.wealthExp > 0) || (plain?.diamonds && plain?.diamonds > 0) || plain?.noble);
  const wealthExp = Math.max(plain?.wealthExp || 0, plain?.diamonds || 0);
  const calculatedWealth = calculateWealthLevel(wealthExp, plain?.wealthLevel || plain?.level);
  const wealthLevel = Math.max(plain?.wealthLevel || 1, calculatedWealth.level);
  const liveLevel = plain?.liveLevel && plain.liveLevel > 1 ? plain.liveLevel : calculateLiveLevel(plain?.coins, plain?.level).level;
  const level = plain?.level && plain.level > 1 ? plain.level : Math.max(wealthLevel, liveLevel, 1);
  return {
    ...plain,
    wealthExp,
    hostBadge: plain?.hostBadge || 'none',
    hostBadgeType: plain?.hostBadgeType || 'none',
    online: isOnline(plain?.lastActiveAt),
    age: ageFrom(plain?.birthday),
    isVip,
    hasPurchasedDiamonds: Boolean(plain?.hasPurchasedDiamonds || isVip),
    wealthLevel,
    liveLevel,
    level,
  };
};

export const userService = {
  async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    const obj = user.toObject();
    obj.diamonds = Math.max(0, obj.diamonds ?? 0);
    obj.coins = Math.max(0, obj.coins ?? 0);
    return decorate(obj);
  },

  async getPublicProfile(userId: string, requesterId?: string) {
    let user: any = mongoose.isValidObjectId(userId)
      ? await User.findById(userId).select(`${CARD_FIELDS} birthday following followers`)
      : null;
    if (!user) {
      user = await User.findOne({ uid: userId }).select(`${CARD_FIELDS} birthday following followers`);
    }
    if (!user) throw new AppError('User not found', 404);

    const targetUserId = user._id.toString();

    // Viewing someone else's profile is what makes you their "visitor".
    // Fire-and-forget: a failed visit write must never fail the page load.
    if (requesterId && requesterId !== targetUserId) {
      this.recordVisit(requesterId, targetUserId).catch(() => {});
    }

    const stats = await this.getProfileStats(targetUserId);

    let isFollowing = false;
    let isFollowedBy = false;
    if (requesterId && requesterId !== targetUserId) {
      const requester = await User.findById(requesterId).select('following');
      isFollowing = !!requester?.following?.some((f: any) => f.toString() === targetUserId);
      isFollowedBy = !!user.followers?.some((f: any) => f.toString() === requesterId);
    }

    const plain = user.toObject() as any;
    delete plain.following;
    delete plain.followers;

    return {
      ...decorate(plain),
      ...stats,
      // Legacy aliases — older screens still read these two names.
      followingCount: stats.following,
      followerCount: stats.followers,
      isFollowing,
      isFollowedBy,
      /** Mutual follow (requirement #2: "Friends = Mutual Follow"). */
      isFriend: isFollowing && isFollowedBy,
    };
  },

  /**
   * Requirement #2 — the four profile counts.
   *   Friends   = mutual follow
   *   Following = people I follow
   *   Followers = people who follow me
   *   Visitors  = distinct profile viewers in the last 7 days
   */
  async getProfileStats(userId: string) {
    const user = await User.findById(userId).select('following followers');
    if (!user) throw new AppError('User not found', 404);

    const followingIds = (user.following || []).map((id: any) => id.toString());
    const followerIds = new Set((user.followers || []).map((id: any) => id.toString()));
    const friends = followingIds.filter((id) => followerIds.has(id)).length;

    const visitors = await ProfileVisit.countDocuments({ profileId: userId });

    return {
      friends,
      following: followingIds.length,
      followers: followerIds.size,
      visitors,
    };
  },

  /**
   * Upsert a visit. Re-visiting bumps the timestamp instead of adding a row,
   * so "Visitors" counts distinct people, not page views.
   */
  async recordVisit(visitorId: string, profileId: string) {
    if (visitorId === profileId) return;
    await ProfileVisit.updateOne(
      { visitorId, profileId },
      { $set: { visitTime: new Date() }, $inc: { visitCount: 1 } },
      { upsert: true }
    );
  },

  /** Visitor list, most recent first, carrying `visitTime` for the "2h ago" label. */
  async getVisitors(userId: string, page: number, limit: number) {
    const filter = { profileId: userId };
    const total = await ProfileVisit.countDocuments(filter);

    const visits = await ProfileVisit.find(filter)
      .sort({ visitTime: -1 })
      .skip(getSkip(page, limit))
      .limit(limit)
      .populate('visitorId', CARD_FIELDS);

    const data = visits
      // A visitor who has since deleted their account populates to null.
      .filter((v: any) => v.visitorId)
      .map((v: any) => ({
        ...decorate(v.visitorId.toObject()),
        visitTime: v.visitTime,
        visitCount: v.visitCount,
      }));

    return { data, total };
  },

  /** Mutual follows — the "Friends" tab. */
  async getFriends(userId: string, page: number, limit: number) {
    const user = await User.findById(userId).select('following followers');
    if (!user) throw new AppError('User not found', 404);

    const followerIds = new Set((user.followers || []).map((id: any) => id.toString()));
    const friendIds = (user.following || [])
      .map((id: any) => id.toString())
      .filter((id: string) => followerIds.has(id));

    const total = friendIds.length;
    const pageIds = friendIds.slice(getSkip(page, limit), getSkip(page, limit) + limit);

    const friends = await User.find({ _id: { $in: pageIds } }).select(CARD_FIELDS);
    return { data: friends.map((f) => decorate(f.toObject())), total };
  },

  /** Cheap presence write — called from the auth middleware on each request. */
  async touchActivity(userId: string) {
    await User.updateOne({ _id: userId }, { $set: { lastActiveAt: new Date() } });
  },

  async searchUsers(
    query: string,
    requesterId: string,
    page: number = 1,
    limit: number = 20,
    countries?: string[],
    badge?: string
  ) {
    const q = (query || '').trim();
    const hasBadgeFilter = badge && badge !== 'all';
    if (!q && !hasBadgeFilter) return { data: [], total: 0 };

    const filter: any = {
      _id: { $ne: requesterId },
      isBanned: false,
    };

    if (q.length > 0) {
      // Strip prefixes like "id:", "ID:", "#", "@" if present
      const cleanQ = q.replace(/^(id\s*:\s*|#|@)/i, '').trim();
      const term = cleanQ.length > 0 ? cleanQ : q;

      // Regex metacharacters in a user's search box must not become a pattern.
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const orConditions: any[] = [
        { uid: { $regex: escaped, $options: 'i' } },
        { nickname: { $regex: escaped, $options: 'i' } },
        { username: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ];

      if (mongoose.Types.ObjectId.isValid(term) && term.length === 24) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(term) });
      }

      filter.$or = orConditions;
    }

    if (hasBadgeFilter) {
      filter.hostBadge = badge;
    }

    // Requirement #1 — the country filter applies to Discover too.
    const codes = (countries || [])
      .map((c) => c.trim().toUpperCase())
      .filter((c) => /^[A-Z]{2}$/.test(c));
    if (codes.length > 0) filter.country = { $in: codes };

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select(CARD_FIELDS)
      .sort({ hostBadge: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Attach follower counts
    const data = await Promise.all(
      users.map(async (u) => {
        const followerCount = await User.countDocuments({ followers: u._id });
        return { ...decorate(u.toObject()), followerCount };
      })
    );

    return { data, total };
  },

  async updateProfile(
    userId: string,
    data: {
      nickname?: string;
      avatar?: string;
      cover?: string;
      country?: string;
      gender?: 'male' | 'female' | 'other' | 'unspecified';
      birthday?: string;
      bio?: string;
      tags?: string[];
    }
  ) {
    // Only copy keys that were actually sent, so an absent field is never
    // written as undefined and blanked out.
    const update: Record<string, unknown> = {};
    for (const key of ['nickname', 'avatar', 'cover', 'gender', 'bio'] as const) {
      if (data[key] !== undefined) update[key] = data[key];
    }
    if (data.country !== undefined) update.country = data.country.toUpperCase();
    if (data.birthday !== undefined) update.birthday = data.birthday ? new Date(data.birthday) : null;
    if (data.tags !== undefined) update.tags = data.tags.slice(0, 10);

    const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true });
    if (!user) throw new AppError('User not found', 404);

    // The host's country is denormalised onto their streams — keep any live
    // session in sync so the country filter does not go stale mid-broadcast.
    if (update.country !== undefined) {
      await LiveStream.updateMany(
        { hostId: userId, status: 'live' },
        { $set: { country: update.country } }
      );
    }

    return decorate(user.toObject());
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new AppError('User not found', 404);
    if (!user.password) throw new AppError('No password set — use OTP login', 400);

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) throw new AppError('Current password is incorrect', 401);

    user.password = await hashPassword(newPassword);
    await user.save();
  },

  /** Legacy toggle (kept for the old POST/DELETE /:id/follow routes). */
  async followUser(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) throw new AppError('Cannot follow yourself', 400);

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) throw new AppError('User not found', 404);

    const alreadyFollowing = await User.exists({
      _id: currentUserId,
      following: targetUserId,
    });

    return alreadyFollowing
      ? this.unfollow(currentUserId, targetUserId)
      : this.follow(currentUserId, targetUserId);
  },

  /** Explicit FOLLOW — idempotent, never toggles. */
  async follow(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) throw new AppError('Cannot follow yourself', 400);

    await Promise.all([
      User.updateOne(
        { _id: currentUserId },
        { $addToSet: { following: targetUserId } }
      ),
      User.updateOne(
        { _id: targetUserId },
        { $addToSet: { followers: currentUserId } }
      ),
    ]);

    const [followers, followingCount] = await Promise.all([
      User.countDocuments({ followers: targetUserId }),
      User.countDocuments({ following: targetUserId }),
    ]);
    return { following: true, followers, followingCount };
  },

  /** Explicit UNFOLLOW — idempotent, never toggles. */
  async unfollow(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) throw new AppError('Cannot unfollow yourself', 400);

    await Promise.all([
      User.updateOne(
        { _id: currentUserId },
        { $pull: { following: targetUserId } }
      ),
      User.updateOne(
        { _id: targetUserId },
        { $pull: { followers: currentUserId } }
      ),
    ]);

    const [followers, followingCount] = await Promise.all([
      User.countDocuments({ followers: targetUserId }),
      User.countDocuments({ following: targetUserId }),
    ]);
    return { following: false, followers, followingCount };
  },

  /** Read the real relationship state for the follow button. */
  async followStatus(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      return { following: false, followers: 0, followingCount: 0 };
    }
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) throw new AppError('User not found', 404);

    const isFollowing = !!(await User.exists({
      _id: currentUserId,
      following: targetUserId,
    }));

    const [followers, followingCount] = await Promise.all([
      User.countDocuments({ followers: targetUserId }),
      User.countDocuments({ following: targetUserId }),
    ]);

    return { following: isFollowing, followers, followingCount };
  },

  async getFollowers(userId: string, page: number, limit: number) {
    const counts = await User.findById(userId).select('followers');
    if (!counts) throw new AppError('User not found', 404);

    const user = await User.findById(userId).populate({
      path: 'followers',
      select: CARD_FIELDS,
      options: {
        skip: getSkip(page, limit),
        limit,
      },
    });

    const data = (user?.followers || []).map((f: any) => decorate(f.toObject ? f.toObject() : f));
    return { data, total: counts.followers.length };
  },

  async getFollowing(userId: string, page: number, limit: number) {
    const counts = await User.findById(userId).select('following');
    if (!counts) throw new AppError('User not found', 404);

    const user = await User.findById(userId).populate({
      path: 'following',
      select: CARD_FIELDS,
      options: {
        skip: getSkip(page, limit),
        limit,
      },
    });

    const data = (user?.following || []).map((f: any) => decorate(f.toObject ? f.toObject() : f));
    return { data, total: counts.following.length };
  },

  /**
   * Permanent account deletion with cascading cleanup.
   *
   * Requires re-authentication: either the account password or a fresh Firebase
   * ID token (phone OTP) proving phone ownership.
   *
   * Cascade plan (no orphaned references):
   * 1. End the user's active live streams.
   * 2. Delete user-owned moments + their Cloudinary media.
   * 3. Delete chats the user is a participant of + all messages in them.
   * 4. Delete notifications, contact messages, reports authored, purchase/withdraw/sell/agent orders.
   * 5. Remove the user from every other user's followers/following arrays.
   * 6. Anonymize transaction ledger references (kept for audit).
   * 7. Delete the Firebase Auth user (graceful if absent).
   * 8. Delete the Mongo user document.
   */
  async deleteAccount(userId: string, reauth: { password?: string; idToken?: string }) {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new AppError('User not found', 404);

    // ── Re-authentication ────────────────────────────────────────
    let reauthed = false;
    if (reauth.password && user.password) {
      reauthed = await comparePassword(reauth.password, user.password);
    } else if (reauth.idToken) {
      const decoded = await getFirebaseApp()?.auth().verifyIdToken(reauth.idToken);
      if (decoded && decoded.phone_number && decoded.phone_number === user.phone) {
        reauthed = true;
      }
    }
    if (!reauthed) throw new AppError('Re-authentication required', 401);

    // ── Cascade cleanup ──────────────────────────────────────────
    // 1. End active live streams
    await LiveStream.updateMany(
      { hostId: userId, status: 'live' },
      { $set: { status: 'ended', endedAt: new Date(), viewerCount: 0 } }
    );

    // 2. Moments + media
    const moments = await Moment.find({ userId });
    for (const moment of moments) {
      for (const url of moment.media || []) {
        try {
          await uploadService.deleteFile(uploadService.getPublicIdFromUrl(url));
        } catch {
          // best-effort media cleanup
        }
      }
    }
    await Moment.deleteMany({ userId });
    await Moment.updateMany(
      { likes: userId },
      { $pull: { likes: userId } }
    );
    await Moment.updateMany(
      { 'comments.userId': userId },
      { $pull: { comments: { userId } } }
    );

    // 3. Chats + messages
    const chatIds = await Chat.find({ participants: userId }).distinct('_id');
    if (chatIds.length > 0) {
      await ChatMessage.deleteMany({ chatId: { $in: chatIds } });
      await Chat.deleteMany({ _id: { $in: chatIds } });
    }

    // 4. Owned records
    await Notification.deleteMany({ userId });
    await ContactMessage.deleteMany({ userId });
    await Report.deleteMany({ reporterId: userId });
    await Report.updateMany({ reviewedBy: userId }, { $set: { reviewedBy: null } });
    await PurchaseOrder.deleteMany({ userId });
    await WithdrawalRequest.deleteMany({ userId });
    await SellRequest.deleteMany({ userId });
    await AgentPurchaseOrder.deleteMany({ agentId: userId });
    // Agency cleanup: if the user owns an agency, detach their hosted users
    const ownedAgencies = await Agency.find({ agentId: userId }).distinct('_id');
    if (ownedAgencies.length > 0) {
      await User.updateMany(
        { agencyId: { $in: ownedAgencies } },
        { $unset: { agencyId: 1 } }
      );
      await Agency.deleteMany({ _id: { $in: ownedAgencies } });
    }
    // Rooms owned by the user
    await Room.deleteMany({ ownerId: userId });

    // 4b. Profile-visit rows, in both directions
    await ProfileVisit.deleteMany({ $or: [{ visitorId: userId }, { profileId: userId }] });

    // 5. Remove from everyone's follow arrays (no broken references)
    await User.updateMany(
      { followers: userId },
      { $pull: { followers: userId } }
    );
    await User.updateMany(
      { following: userId },
      { $pull: { following: userId } }
    );

    // 6. Anonymize the audit/ledger references — transactions stay for records
    await Transaction.updateMany(
      { userId },
      { $set: { userId: null } }
    );

    // 7. Delete Firebase Auth account (graceful — the user may be Google-only or legacy)
    try {
      const app = getFirebaseApp();
      if (app) {
        const firebaseUser = await app.auth().getUserByPhoneNumber(user.phone).catch(() => null);
        if (firebaseUser) await app.auth().deleteUser(firebaseUser.uid);
      }
    } catch (e) {
      console.warn('[DeleteAccount] Firebase cleanup skipped:', (e as Error).message);
    }

    // 8. Delete the Mongo user
    await User.deleteOne({ _id: userId });

    return { deleted: true };
  },
};
