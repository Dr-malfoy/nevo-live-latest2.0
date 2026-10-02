import { Request, Response, NextFunction } from 'express';
import { agencyService } from '../services/agency.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const agencyController = {
  // ── 1. Create Agency ────────────────────────────────────────────────────────
  async createAgency(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await agencyService.createAgency(req.user!.userId, req.body);
      sendSuccess(res, result, 'Agency created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  // ── 2. List Agencies with Filters & Search ──────────────────────────────────
  async listAgencies(req: Request, res: Response, next: NextFunction) {
    try {
      const filter = req.query.filter as any;
      const search = (req.query.search as string) || (req.query.q as string) || '';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await agencyService.getAgencies({
        filter,
        search,
        page,
        limit,
      });

      sendPaginated(res, result.data, result.total, result.page, result.limit);
    } catch (error) {
      next(error);
    }
  },

  // ── 3. Agency Details & Profile ─────────────────────────────────────────────
  async getAgencyDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const agencyIdOrCode = req.params.id;
      const currentUserId = req.user?.userId;
      const result = await agencyService.getAgencyDetails(agencyIdOrCode, currentUserId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  // ── 4. Public Agency Direct Join ────────────────────────────────────────────
  async joinAgency(req: Request, res: Response, next: NextFunction) {
    try {
      const agencyIdOrCode = req.params.id || req.body.code || req.body.agencyId;
      const result = await agencyService.joinAgency(req.user!.userId, agencyIdOrCode);
      sendSuccess(res, result, result.message || 'Joined agency successfully');
    } catch (error) {
      next(error);
    }
  },

  // ── 5. Private Agency Join Request ──────────────────────────────────────────
  async requestJoin(req: Request, res: Response, next: NextFunction) {
    try {
      const agencyIdOrCode = req.params.id || req.body.agencyId;
      const message = req.body.message;
      const result = await agencyService.requestJoinPrivateAgency(req.user!.userId, agencyIdOrCode, message);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  // Agent: get incoming join requests
  async getJoinRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string;
      const result = await agencyService.getJoinRequests(req.user!.userId, status);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  // Agent: approve or reject join request
  async decideJoinRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const requestId = req.params.id;
      const decision = req.body?.decision === 'approve' || req.body?.accept === true ? 'approve' : 'reject';
      const result = await agencyService.decideJoinRequest(req.user!.userId, requestId, decision);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  // ── 6. Agency Management & Settings ─────────────────────────────────────────
  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await agencyService.updateAgencySettings(req.user!.userId, req.body);
      sendSuccess(res, result, 'Agency settings updated');
    } catch (error) {
      next(error);
    }
  },

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const memberUserId = req.params.userId;
      const reason = req.body?.reason;
      const result = await agencyService.removeMember(req.user!.userId, memberUserId, reason);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  // ── 7. Agent Wallet Transactions (Coins, Diamonds, Conversion) ──────────────
  async agentSendCoins(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetId, targetIdentifier, amount, note } = req.body;
      const recipient = targetId || targetIdentifier;
      const result = await agencyService.agentSendCoins(req.user!.userId, recipient, Number(amount), note);
      sendSuccess(res, result, 'Coins sent successfully');
    } catch (error) {
      next(error);
    }
  },

  async agentSendDiamonds(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetId, targetIdentifier, amount, note } = req.body;
      const recipient = targetId || targetIdentifier;
      const result = await agencyService.agentSendDiamonds(req.user!.userId, recipient, Number(amount), note);
      sendSuccess(res, result, 'Diamonds sent successfully');
    } catch (error) {
      next(error);
    }
  },

  async agentConvertCurrency(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, amount } = req.body;
      const result = await agencyService.agentConvertCurrency(req.user!.userId, from, Number(amount));
      sendSuccess(res, result, 'Currency converted successfully');
    } catch (error) {
      next(error);
    }
  },

  // ── 8. Search & Linking Endpoints ───────────────────────────────────────────
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const q = (req.query.q as string) || '';
      const agents = await agencyService.searchAgents(q);
      sendSuccess(res, agents);
    } catch (error) {
      next(error);
    }
  },

  async linkByAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId } = req.body;
      if (!agentId) {
        res.status(400).json({ success: false, error: 'agentId is required' });
        return;
      }
      const agency = await agencyService.getMyAgency(agentId);
      if (agency) {
        const result = await agencyService.joinAgency(req.user!.userId, agency._id);
        sendSuccess(res, result, 'Agent linked');
      } else {
        res.status(404).json({ success: false, error: 'Agent agency not found' });
      }
    } catch (error) {
      next(error);
    }
  },

  async join(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;
      const result = await agencyService.joinAgency(req.user!.userId, code);
      sendSuccess(res, result, result.message || 'Joined agency');
    } catch (error) {
      next(error);
    }
  },

  async leave(req: Request, res: Response, next: NextFunction) {
    try {
      const reason = req.body?.reason;
      const result = await agencyService.requestLeave(req.user!.userId, reason);
      sendSuccess(res, result, result.message || 'Leave request submitted');
    } catch (error) {
      next(error);
    }
  },

  async requestLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const reason = req.body?.reason;
      const result = await agencyService.requestLeave(req.user!.userId, reason);
      sendSuccess(res, result, result.message || 'Leave request submitted');
    } catch (error) {
      next(error);
    }
  },

  async getLeaveStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await agencyService.getMemberLeaveStatus(req.user!.userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async getLeaveRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string;
      const result = await agencyService.getLeaveRequests(req.user!.userId, status);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async decideLeaveRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const requestId = req.params.id;
      const decision = req.body?.decision === 'approve' || req.body?.accept === true ? 'approve' : 'reject';
      const result = await agencyService.decideLeaveRequest(req.user!.userId, requestId, decision);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  async getMyAgency(req: Request, res: Response, next: NextFunction) {
    try {
      const agency = await agencyService.getMyAgency(req.user!.userId);
      sendSuccess(res, agency);
    } catch (error) {
      next(error);
    }
  },

  async suggest(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
      const agencies = await agencyService.suggestAgencies(req.user!.userId, limit);
      sendSuccess(res, agencies);
    } catch (error) {
      next(error);
    }
  },

  async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const agencyId = req.params.agencyId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { data, total } = await agencyService.getMembers(agencyId, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },
};
