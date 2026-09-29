import { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/chat.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const chatController = {
  async getChats(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filter = req.query.filter === 'unread' || req.query.filter === 'seen' ? req.query.filter : undefined;
      const { data, total } = await chatService.getUserChats(req.user!.userId, page, limit, filter);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async markChatRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await chatService.markChatRead(req.params.chatId, req.user!.userId);
      sendSuccess(res, result, 'Marked as read');
    } catch (error) {
      next(error);
    }
  },

  async getOrCreateChat(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.body;
      const chat = await chatService.getOrCreateChat(req.user!.userId, userId);
      sendSuccess(res, chat, 'Chat ready');
    } catch (error) {
      next(error);
    }
  },

  async getChat(req: Request, res: Response, next: NextFunction) {
    try {
      const chat = await chatService.getChatById(req.params.chatId, req.user!.userId);
      sendSuccess(res, chat);
    } catch (error) {
      next(error);
    }
  },

  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const { data, total } = await chatService.getMessages(req.params.chatId, req.user!.userId, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, kind, giftId, giftName, giftCount, voiceUrl, voiceDuration } = req.body;
      const msg = await chatService.sendMessage(req.params.chatId, req.user!.userId, message, {
        kind,
        giftId,
        giftName,
        giftCount,
        voiceUrl,
        voiceDuration,
      });
      sendSuccess(res, msg, 'Message sent', 201);
    } catch (error) {
      next(error);
    }
  },

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const count = await chatService.getUnreadCount(req.user!.userId);
      sendSuccess(res, { count });
    } catch (error) {
      next(error);
    }
  },

  // ── §4.10 Chat Extras ──────────────────────────────────────────────────────

  async getOfficialChats(_req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await chatService.getOfficialChats());
    } catch (error) {
      next(error);
    }
  },

  async getOfficialMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { key } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await chatService.getOfficialChatMessages(key, req.user!.userId, page, limit);
      sendPaginated(res, result.data, result.total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async markOfficialRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { key } = req.params;
      sendSuccess(res, await chatService.markOfficialRead(key, req.user!.userId));
    } catch (error) {
      next(error);
    }
  },

  async getActiveUsers(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await chatService.getActiveUsers(req.user!.userId));
    } catch (error) {
      next(error);
    }
  },

  async getChatStreak(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await chatService.getChatStreak(req.params.chatId, req.user!.userId));
    } catch (error) {
      next(error);
    }
  },

  async editMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { message } = req.body;
      const { chatId, messageId } = req.params;
      const result = await chatService.editMessage(chatId, messageId, req.user!.userId, message);
      sendSuccess(res, result, 'Message updated');
    } catch (error) {
      next(error);
    }
  },

  async deleteMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { chatId, messageId } = req.params;
      const result = await chatService.deleteMessage(chatId, messageId, req.user!.userId);
      sendSuccess(res, result, 'Message deleted');
    } catch (error) {
      next(error);
    }
  },

  async clearChat(req: Request, res: Response, next: NextFunction) {
    try {
      const { chatId } = req.params;
      const result = await chatService.clearChat(chatId, req.user!.userId);
      sendSuccess(res, result, 'Conversation cleared');
    } catch (error) {
      next(error);
    }
  },

  async deleteChat(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await chatService.deleteChat(req.params.chatId, req.user!.userId));
    } catch (error) {
      next(error);
    }
  },
};

