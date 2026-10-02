import { Request, Response, NextFunction } from 'express';
import { storyService } from '../services/story.service';
import { sendSuccess } from '../utils/response';

export const storyController = {
  async createStory(req: Request, res: Response, next: NextFunction) {
    try {
      const story = await storyService.createStory(req.user!.userId, req.body);
      sendSuccess(res, story, 'Story posted', 201);
    } catch (error) {
      next(error);
    }
  },

  async getActiveStories(req: Request, res: Response, next: NextFunction) {
    try {
      const stories = await storyService.getActiveStories(req.user!.userId);
      sendSuccess(res, stories);
    } catch (error) {
      next(error);
    }
  },

  async viewStory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await storyService.viewStory(req.params.storyId, req.user!.userId);
      sendSuccess(res, result, 'Story viewed');
    } catch (error) {
      next(error);
    }
  },

  async deleteStory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await storyService.deleteStory(req.params.storyId, req.user!.userId);
      sendSuccess(res, result, 'Story deleted');
    } catch (error) {
      next(error);
    }
  },
};
