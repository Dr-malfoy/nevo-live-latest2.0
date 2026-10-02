import { Request, Response, NextFunction } from 'express';
import { callService } from '../services/call.service';
import { sendSuccess } from '../utils/response';

export const callController = {
  async createCall(req: Request, res: Response, next: NextFunction) {
    try {
      // Group form: recipientIds: string[]; legacy 1:1 form: userId: string.
      const raw: unknown = req.body?.recipientIds ?? (req.body?.userId ? [req.body.userId] : []);
      const recipientIds = Array.isArray(raw) ? (raw as string[]).map(String) : [];
      const type = req.body?.type === 'video' ? 'video' : 'audio';
      // source: where the call was initiated from (profile | messenger)
      const source: 'profile' | 'messenger' =
        req.body?.source === 'profile' ? 'profile' : 'messenger';
      const result = await callService.createCall(req.user!.userId, recipientIds, type, source);
      sendSuccess(res, result, 'Call started', 201);
    } catch (error) {
      next(error);
    }
  },

  async acceptCall(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await callService.acceptCall(req.params.id, req.user!.userId);
      sendSuccess(res, result, 'Call accepted');
    } catch (error) {
      next(error);
    }
  },

  async joinCall(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await callService.joinCall(req.params.id, req.user!.userId);
      sendSuccess(res, result, 'Joined call');
    } catch (error) {
      next(error);
    }
  },

  async getActiveCalls(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await callService.getActiveCalls(req.user!.userId);
      sendSuccess(res, result, 'Active calls');
    } catch (error) {
      next(error);
    }
  },

  async getCall(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await callService.getCallById(req.params.id, req.user!.userId);
      sendSuccess(res, result, 'Call session');
    } catch (error) {
      next(error);
    }
  },

  async endCall(req: Request, res: Response, next: NextFunction) {
    try {
      const outcome =
        req.body?.outcome === 'rejected'
          ? 'rejected'
          : req.body?.outcome === 'missed'
          ? 'missed'
          : 'ended';
      const result = await callService.endCall(req.params.id, req.user!.userId, outcome);
      sendSuccess(res, result, 'Call ended');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /calls/quote/:hostId
   *
   * Returns the host's per-minute price and whether the requesting audience
   * member has sufficient balance to start a call.
   */
  async getCallQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await callService.getCallQuote(req.user!.userId, req.params.hostId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /calls/:id/billing-tick
   *
   * Backend-controlled per-minute billing. The client sends this every 60 s
   * as a heartbeat, but the server is the sole authority for coin deduction.
   * The server also runs its own interval to handle disconnected clients.
   */
  async billingTick(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await callService.billingTick(req.params.id, req.user!.userId);
      if (!result) {
        sendSuccess(res, { skipped: true }, 'No billable call');
        return;
      }
      if (result.coinsFinished) {
        sendSuccess(res, { coinsFinished: true }, 'Coins finished — call ended');
        return;
      }
      sendSuccess(res, result, 'Billing tick processed');
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /calls/:id/finalize
   *
   * Explicitly finalize a call's billing (idempotent).
   * Called by the client on hangup as a safety net; the server also calls
   * this automatically when ending a call.
   */
  async finalizeCall(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await callService.finalizeCallBilling(req.params.id);
      sendSuccess(res, result ?? { skipped: true }, 'Call finalized');
    } catch (error) {
      next(error);
    }
  },
};
