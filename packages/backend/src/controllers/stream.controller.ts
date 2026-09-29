import { Request, Response, NextFunction } from 'express';
import { streamService } from '../services/stream.service';
import { sendSuccess, sendPaginated } from '../utils/response';

/**
 * Normalise the `country` query param into ISO alpha-2 codes.
 * Accepts `BD,IN`, repeated `?country=BD&country=IN`, and mixed case.
 * `ALL` (the default chip) and anything unrecognised drop out, which
 * leaves the feed unfiltered.
 */
function parseCountries(raw: unknown): string[] | undefined {
  if (!raw) return undefined;
  const values = Array.isArray(raw) ? raw : [raw];
  const codes = values
    .flatMap((v) => String(v).split(','))
    .map((c) => c.trim().toUpperCase())
    .filter((c) => c && c !== 'ALL');
  return codes.length > 0 ? codes : undefined;
}

export const streamController = {
  async getFeed(req: Request, res: Response, next: NextFunction) {
    try {
      const { tab, type, category, page, limit, country } = req.query as any;

      // Requirement #1 — `?country=BD,IN,PK`. Also accepts repeated params
      // (`?country=BD&country=IN`). "ALL" / empty means no constraint.
      const countries = parseCountries(country);

      if (tab === 'follow' && req.user) {
        const { data, total } = await streamService.getFollowFeed(
          req.user.userId,
          parseInt(page) || 1,
          parseInt(limit) || 20,
          countries
        );
        sendPaginated(res, data, total, parseInt(page) || 1, parseInt(limit) || 20);
        return;
      }

      const { data, total } = await streamService.getFeed(
        tab,
        type,
        category,
        parseInt(page) || 1,
        parseInt(limit) || 20,
        countries
      );
      sendPaginated(res, data, total, parseInt(page) || 1, parseInt(limit) || 20);
    } catch (error) {
      next(error);
    }
  },

  /** Countries that currently have at least one live host — feeds the filter bar. */
  async getCountries(_req: Request, res: Response, next: NextFunction) {
    try {
      const countries = await streamService.getLiveCountries();
      sendSuccess(res, countries);
    } catch (error) {
      next(error);
    }
  },

  async createStream(req: Request, res: Response, next: NextFunction) {
    try {
      const stream = await streamService.createStream(req.user!.userId, req.body);
      sendSuccess(res, stream, 'Stream created', 201);
    } catch (error) {
      next(error);
    }
  },

  async getMyActiveStream(req: Request, res: Response, next: NextFunction) {
    try {
      const stream = await streamService.getMyActiveStream(req.user!.userId);
      sendSuccess(res, stream || null);
    } catch (error) {
      next(error);
    }
  },

  async heartbeat(req: Request, res: Response, next: NextFunction) {
    try {
      const stream = await streamService.heartbeat(req.params.id, req.user!.userId);
      sendSuccess(res, stream, 'Heartbeat updated');
    } catch (error) {
      next(error);
    }
  },

  async getStream(req: Request, res: Response, next: NextFunction) {
    try {
      const stream = await streamService.getStream(req.params.id);
      sendSuccess(res, stream);
    } catch (error) {
      next(error);
    }
  },

  async getViewers(req: Request, res: Response, next: NextFunction) {
    try {
      const viewers = await streamService.getViewers(req.params.id);
      sendSuccess(res, viewers);
    } catch (error) {
      next(error);
    }
  },

  async joinStream(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await streamService.joinStream(req.params.id, req.user!.userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async leaveStream(req: Request, res: Response, next: NextFunction) {
    try {
      await streamService.leaveStream(req.params.id, req.user!.userId);
      sendSuccess(res, null);
    } catch (error) {
      next(error);
    }
  },

  async endStream(req: Request, res: Response, next: NextFunction) {
    try {
      const stream = await streamService.endStream(req.params.id, req.user!.userId);
      sendSuccess(res, stream, 'Stream ended');
    } catch (error) {
      next(error);
    }
  },

  async getHostEarning(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await streamService.getHostEarning(req.params.id, req.user!.userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },
};
