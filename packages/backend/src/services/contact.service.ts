import { ContactMessage, User, Notification } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getIO } from '../socket';

function generateTicketId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TK-${rand}`;
}

export const contactService = {
  // User creates a support ticket / message
  async sendMessage(userId: string, body: { subject: string; message: string; category?: string }) {
    const { subject, message, category } = body;
    if (!subject || !message) {
      throw new AppError('Subject and message are required', 400);
    }

    // Ensure unique ticket ID
    let ticketId = generateTicketId();
    for (let attempts = 0; attempts < 5; attempts++) {
      const exists = await ContactMessage.exists({ ticketId });
      if (!exists) break;
      ticketId = generateTicketId();
    }

    const contact = await ContactMessage.create({
      ticketId,
      userId,
      category: category?.trim() || 'General',
      subject: subject.trim().slice(0, 150),
      message: message.trim().slice(0, 3000),
      status: 'pending',
      replies: [],
    });

    // Notify admins
    try {
      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const admin of admins) {
        await Notification.create({
          userId: admin._id,
          type: 'system',
          title: `New Support Ticket [${contact.ticketId}]`,
          message: `${subject.trim().slice(0, 80)}`,
          data: { contactId: contact._id, ticketId: contact.ticketId },
        });
      }
      getIO().emit('contact:new', { contactId: contact._id, ticketId: contact.ticketId });
    } catch {
      // ignore notification / socket failures
    }

    return contact;
  },

  // User's own ticket history
  async getUserMessages(userId: string, page: number, limit: number, status?: string) {
    const filter: any = { userId };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const total = await ContactMessage.countDocuments(filter);
    const data = await ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return { data, total };
  },

  // Get single ticket details
  async getMessageById(messageIdOrTicketId: string, userId?: string) {
    let query: any = {};
    if (messageIdOrTicketId.startsWith('TK-')) {
      query = { ticketId: messageIdOrTicketId };
    } else {
      query = { _id: messageIdOrTicketId };
    }
    if (userId) {
      query.userId = userId;
    }

    const ticket = await ContactMessage.findOne(query).populate('userId', 'uid nickname avatar phone');
    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }
    return ticket;
  },

  // User adds follow-up reply
  async addUserReply(ticketIdOrId: string, userId: string, message: string) {
    if (!message || !message.trim()) {
      throw new AppError('Message is required', 400);
    }

    const user = await User.findById(userId).select('nickname');
    const query = ticketIdOrId.startsWith('TK-')
      ? { ticketId: ticketIdOrId, userId }
      : { _id: ticketIdOrId, userId };

    const ticket = await ContactMessage.findOne(query);
    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    if (ticket.status === 'closed') {
      throw new AppError('This ticket is closed and cannot receive new replies', 400);
    }

    ticket.replies.push({
      sender: 'user',
      senderName: user?.nickname || 'User',
      message: message.trim().slice(0, 3000),
      createdAt: new Date(),
    });

    if (ticket.status === 'resolved') {
      ticket.status = 'pending';
    }

    await ticket.save();

    try {
      getIO().emit('contact:reply', { ticketId: ticket.ticketId, contactId: ticket._id });
    } catch {}

    return ticket;
  },

  // Admin: list all contact messages / tickets
  async getAllMessages(query: { status?: string; category?: string; page: number; limit: number }) {
    const filter: any = {};
    if (query.status && query.status !== 'all') filter.status = query.status;
    if (query.category) filter.category = query.category;

    const total = await ContactMessage.countDocuments(filter);
    const data = await ContactMessage.find(filter)
      .populate('userId', 'uid nickname avatar phone')
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit);
    return { data, total };
  },

  // Admin: reply / resolve
  async replyToMessage(
    messageId: string,
    adminId: string,
    reply?: string,
    status: 'pending' | 'in_progress' | 'resolved' | 'closed' = 'resolved'
  ) {
    const contact = await ContactMessage.findById(messageId);
    if (!contact) throw new AppError('Contact message not found', 404);

    if (reply && reply.trim()) {
      const trimmedReply = reply.trim().slice(0, 3000);
      contact.adminReply = trimmedReply;
      contact.replies.push({
        sender: 'support',
        senderName: 'Support Team',
        message: trimmedReply,
        createdAt: new Date(),
      });
    }

    contact.status = status;
    await contact.save();

    // Notify the user
    try {
      await Notification.create({
        userId: contact.userId,
        type: 'system',
        title: `Support update on ticket ${contact.ticketId}`,
        message: reply ? reply.slice(0, 120) : `Your ticket ${contact.ticketId} has been marked ${status}.`,
        data: { contactId: contact._id, ticketId: contact.ticketId },
      });
    } catch {}

    return contact;
  },
};

