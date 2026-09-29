import { Request, Response, NextFunction } from 'express';
import { gamesHubService } from '../services/gamesHub.service';
import { sendSuccess } from '../utils/response';

export const gamesHubController = {
  async getGames(_req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await gamesHubService.getGames());
    } catch (error) { next(error); }
  },

  async getHome(_req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await gamesHubService.getHome());
    } catch (error) { next(error); }
  },

  async getWinners(_req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await gamesHubService.getWinners());
    } catch (error) { next(error); }
  },

  // ── Lucky Spin ─────────────────────────────────────────────────────────────

  async getSpinStatus(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await gamesHubService.getSpinStatus(req.user!.userId));
    } catch (error) { next(error); }
  },

  async executeSpin(req: Request, res: Response, next: NextFunction) {
    try {
      const paid = req.body?.paid === true;
      sendSuccess(res, await gamesHubService.executeSpin(req.user!.userId, paid), 'Spin executed', 201);
    } catch (error) { next(error); }
  },

  // ── Sign-in Calendar ───────────────────────────────────────────────────────

  async getSignInCalendar(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await gamesHubService.getSignInCalendar(req.user!.userId));
    } catch (error) { next(error); }
  },

  async signIn(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await gamesHubService.signIn(req.user!.userId), 'Signed in', 201);
    } catch (error) { next(error); }
  },

  // ── Activities ─────────────────────────────────────────────────────────────

  async getActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.query as { status?: string };
      sendSuccess(res, await gamesHubService.getActivities(status));
    } catch (error) { next(error); }
  },

  async getActivity(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await gamesHubService.getActivity(req.params.key));
    } catch (error) { next(error); }
  },
};
