import { Request, Response, NextFunction } from 'express';
import { noteService } from '../services/note.service';
import { sendSuccess } from '../utils/response';

export const noteController = {
  async createOrUpdateNote(req: Request, res: Response, next: NextFunction) {
    try {
      const note = await noteService.createOrUpdateNote(req.user!.userId, req.body);
      sendSuccess(res, note, 'Note updated', 201);
    } catch (error) {
      next(error);
    }
  },

  async getActiveNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const notes = await noteService.getActiveNotes(req.user!.userId);
      sendSuccess(res, notes);
    } catch (error) {
      next(error);
    }
  },

  async deleteNote(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await noteService.deleteNote(req.user!.userId);
      sendSuccess(res, result, 'Note removed');
    } catch (error) {
      next(error);
    }
  },
};
