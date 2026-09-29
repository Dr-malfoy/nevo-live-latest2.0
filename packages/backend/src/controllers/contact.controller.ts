import { Request, Response, NextFunction } from 'express';
import { contactService } from '../services/contact.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const contactController = {
  // User sends a contact message to admin
  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { subject, message } = req.body;
      const contact = await contactService.sendMessage(req.user!.userId, { subject, message });
      sendSuccess(res, contact, 'Message sent to admin', 201);
    } catch (error) {
      next(error);
    }
  },

  // User's own contact history
  async getMyMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { data, total } = await contactService.getUserMessages(req.user!.userId, page, limit);
      sendPaginated(res, data, total, page, limit);
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
      const { data, total } = await contactService.getAllMessages({ status, page, limit });
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
};
