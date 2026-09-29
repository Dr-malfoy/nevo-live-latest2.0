import { Request, Response, NextFunction } from 'express';
import { taskService } from '../services/task.service';
import { sendSuccess } from '../utils/response';
import { TaskGroup } from '../models';

export const taskController = {
  /** GET /api/tasks?group=daily|interactive|fan_club|pk_mission|games|activity */
  async getBoard(req: Request, res: Response, next: NextFunction) {
    try {
      const group = (req.query.group as TaskGroup) || 'daily';
      const board = await taskService.getTaskBoard(req.user!.userId, group);
      sendSuccess(res, board);
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/tasks/:key/claim */
  async claim(req: Request, res: Response, next: NextFunction) {
    try {
      const { key } = req.params;
      const reward = await taskService.claimTask(req.user!.userId, key);
      sendSuccess(res, reward, 'Task reward claimed successfully');
    } catch (error) {
      next(error);
    }
  },
};
