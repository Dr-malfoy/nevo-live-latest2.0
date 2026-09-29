import { OfficialNotification } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getIO } from '../socket';

const emitSafe = (event: string, payload: unknown) => {
  try {
    getIO().emit(event, payload);
  } catch {
    // socket not initialized
  }
};

/**
 * Official (broadcast) notifications — managed by admins, shown to every user
 * via the Mic icon. Unread tracking is per-user via `seenBy`.
 */
export const officialNotificationService = {
  async create(data: { title: string; message: string; icon?: string }) {
    const doc = await OfficialNotification.create({
      title: data.title,
      message: data.message,
      icon: data.icon || '',
    });
    emitSafe('official:new', doc.toObject());
    return doc;
  },

  async update(id: string, data: { title?: string; message?: string; icon?: string; active?: boolean }) {
    const doc = await OfficialNotification.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!doc) throw new AppError('Official notification not found', 404);
    emitSafe('official:new', doc.toObject());
    return doc;
  },

  async remove(id: string) {
    const doc = await OfficialNotification.findByIdAndDelete(id);
    if (!doc) throw new AppError('Official notification not found', 404);
    emitSafe('official:removed', { id: doc._id.toString() });
    return doc;
  },

  async listAdmin(page: number, limit: number) {
    const total = await OfficialNotification.countDocuments();
    const data = await OfficialNotification.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return { data, total };
  },

  /** Active notifications for a user, each flagged with `seen`. */
  async getForUser(userId: string | undefined, page: number, limit: number) {
    const filter = { active: true };
    const total = await OfficialNotification.countDocuments(filter);
    const docs = await OfficialNotification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const data = docs.map((d) => {
      const obj = d.toObject();
      const seen = userId ? obj.seenBy.some((id: any) => id.toString() === userId) : false;
      return { ...obj, seen, seenBy: undefined };
    });
    return { data, total };
  },

  async getUnreadCount(userId: string) {
    return OfficialNotification.countDocuments({ active: true, seenBy: { $nin: [userId] } });
  },

  async markSeen(userId: string, notificationId?: string) {
    if (notificationId) {
      await OfficialNotification.updateOne(
        { _id: notificationId, active: true, seenBy: { $nin: [userId] } },
        { $addToSet: { seenBy: userId } }
      );
    } else {
      await OfficialNotification.updateMany(
        { active: true, seenBy: { $nin: [userId] } },
        { $addToSet: { seenBy: userId } }
      );
    }
    return true;
  },

  async markAllSeen(userId: string) {
    await OfficialNotification.updateMany(
      { active: true, seenBy: { $nin: [userId] } },
      { $addToSet: { seenBy: userId } }
    );
    return true;
  },
};
