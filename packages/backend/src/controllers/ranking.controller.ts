import { Request, Response, NextFunction } from 'express';
import { rankingService, RankingPeriod, RankingScope } from '../services/ranking.service';
import { sendSuccess } from '../utils/response';

const PERIODS: RankingPeriod[] = ['today', 'yesterday', 'week', 'month'];

const asPeriod = (value: unknown): RankingPeriod =>
  PERIODS.includes(value as RankingPeriod) ? (value as RankingPeriod) : 'today';

export const rankingController = {
  /** GET /api/rankings?board=&period=&country=&scope=&gameKey= */
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { board = 'host_daily', period, country, scope, gameKey } = req.query as Record<string, string>;

      const result = await rankingService.getRanking({
        board,
        period: asPeriod(period),
        scope: (scope === 'friends' ? 'friends' : 'global') as RankingScope,
        country,
        gameKey,
        viewerId: req.user?.userId,
      });

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/rankings/:board/config */
  async getConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await rankingService.getConfig(req.params.board);
      sendSuccess(res, config);
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/rankings/:board/history?date=YYYY-MM-DD */
  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await rankingService.getHistory(req.params.board, req.query.date as string);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },
};
