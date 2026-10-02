import { Request, Response, NextFunction } from 'express';
import { contactService } from '../services/contact.service';
import { AppConfig } from '../models';
import { sendSuccess, sendPaginated } from '../utils/response';


export const contactController = {
  // User creates a support ticket / message
  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { subject, message, category } = req.body;
      const contact = await contactService.sendMessage(req.user!.userId, { subject, message, category });
      sendSuccess(res, contact, 'Support ticket created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  // User's own contact history / tickets
  async getMyMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const { data, total } = await contactService.getUserMessages(req.user!.userId, page, limit, status);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  // Get single ticket details
  async getMessageById(req: Request, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user?.role === 'admin';
      const userId = isAdmin ? undefined : req.user!.userId;
      const ticket = await contactService.getMessageById(req.params.id, userId);
      sendSuccess(res, ticket, 'Ticket details');
    } catch (error) {
      next(error);
    }
  },

  // User adds reply to ticket
  async addReply(req: Request, res: Response, next: NextFunction) {
    try {
      const { message } = req.body;
      const ticket = await contactService.addUserReply(req.params.id, req.user!.userId, message);
      sendSuccess(res, ticket, 'Reply added successfully');
    } catch (error) {
      next(error);
    }
  },

  // Admin: list all
  async getAllMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const category = req.query.category as string;
      const { data, total } = await contactService.getAllMessages({ status, category, page, limit });
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  // Admin: reply / resolve
  async replyToMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { reply, status } = req.body;
      const contact = await contactService.replyToMessage(req.params.id, req.user!.userId, reply, status);
      sendSuccess(res, contact, 'Reply sent');
    } catch (error) {
      next(error);
    }
  },

  // Public/User: Get Telegram config
  async getTelegramConfig(_req: Request, res: Response, next: NextFunction) {
    try {
      const config = await AppConfig.findOne({ key: 'telegram' });
      const value = config?.value || {
        channelUrl: 'https://t.me/nevolive_official',
        supportUrl: 'https://t.me/nevolive_support',
        groupUrl: 'https://t.me/nevolive_group',
      };
      sendSuccess(res, value, 'Telegram config');
    } catch (error) {
      next(error);
    }
  },
};


