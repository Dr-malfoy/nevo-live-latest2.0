import { ContactMessage, User, Notification } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getIO } from '../socket';

export const contactService = {
  // User sends a message to the admin
  async sendMessage(userId: string, body: { subject: string; message: string }) {
    const { subject, message } = body;
    if (!subject || !message) {
      throw new AppError('subject and message are required', 400);
    }

    const contact = await ContactMessage.create({
      userId,
      subject: subject.trim().slice(0, 120),
      message: message.trim().slice(0, 2000),
    });

    // Notify admins
    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        type: 'system',
        title: 'New contact message',
        message: subject.trim().slice(0, 80),
        data: { contactId: contact._id },
      });
    }
    try {
      getIO().emit('contact:new', { contactId: contact._id });
    } catch {
      // socket not initialized
    }

    return contact;
  },

  // User's own contact history
  async getUserMessages(userId: string, page: number, limit: number) {
    const total = await ContactMessage.countDocuments({ userId });
    const data = await ContactMessage.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return { data, total };
  },

  // Admin: list all contact messages
  async getAllMessages(query: { status?: string; page: number; limit: number }) {
    const filter: any = {};
    if (query.status) filter.status = query.status;

    const total = await ContactMessage.countDocuments(filter);
    const data = await ContactMessage.find(filter)
      .populate('userId', 'uid nickname avatar phone')
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit);
    return { data, total };
  },

  // Admin: reply / resolve
  async replyToMessage(messageId: string, adminId: string, reply: string, status: 'pending' | 'resolved' = 'resolved') {
    const contact = await ContactMessage.findById(messageId);
    if (!contact) throw new AppError('Contact message not found', 404);

    contact.adminReply = reply?.trim().slice(0, 2000) || contact.adminReply;
    contact.status = status;
    await contact.save();

    // Notify the user
    await Notification.create({
      userId: contact.userId,
      type: 'system',
      title: 'Admin replied to your message',
      message: reply ? reply.slice(0, 120) : 'Your message has been resolved.',
      data: { contactId: contact._id },
    });

    return contact;
  },
};
