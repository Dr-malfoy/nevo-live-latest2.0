import { Note, User } from '../models';
import { AppError } from '../middleware/errorHandler';

export interface CreateNoteDto {
  text: string;
  emoji?: string;
}

export const noteService = {
  async createOrUpdateNote(userId: string, data: CreateNoteDto) {
    if (!data.text || !data.text.trim()) {
      throw new AppError('Note text is required', 400);
    }

    const text = data.text.trim().slice(0, 60);
    const emoji = (data.emoji || '💭').slice(0, 10);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour expiration

    // Remove any previous notes for this user so only 1 active note exists
    await Note.deleteMany({ userId });

    const note = await Note.create({
      userId,
      text,
      emoji,
      expiresAt,
    });

    const populated = await Note.findById(note._id).populate('userId', 'uid nickname avatar level country lastActiveAt');
    return populated;
  },

  async getActiveNotes(requesterId: string) {
    const now = new Date();
    // Only non-expired notes
    const notes = await Note.find({
      expiresAt: { $gt: now },
    })
      .populate('userId', 'uid nickname avatar level country lastActiveAt')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = notes
      .filter((n) => n.userId)
      .map((n: any) => {
        const user = n.userId;
        const uIdStr = user._id.toString();
        return {
          _id: n._id.toString(),
          text: n.text,
          emoji: n.emoji || '💭',
          createdAt: n.createdAt,
          expiresAt: n.expiresAt,
          isSelf: uIdStr === requesterId,
          user: {
            _id: uIdStr,
            uid: user.uid,
            nickname: user.nickname,
            avatar: user.avatar,
            level: user.level,
            country: user.country,
            online: user.lastActiveAt && (Date.now() - new Date(user.lastActiveAt).getTime() < 5 * 60 * 1000),
          },
        };
      });

    // Ensure self note is first if present
    formatted.sort((a, b) => {
      if (a.isSelf && !b.isSelf) return -1;
      if (!a.isSelf && b.isSelf) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return formatted;
  },

  async deleteNote(userId: string) {
    await Note.deleteMany({ userId });
    return { success: true };
  },
};
