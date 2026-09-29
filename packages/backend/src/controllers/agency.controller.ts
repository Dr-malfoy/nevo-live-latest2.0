import { Request, Response, NextFunction } from 'express';
import { agencyService } from '../services/agency.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const agencyController = {
  // Public — search agents by uid/phone/nickname (for Link Agent)
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const q = (req.query.q as string) || '';
      const agents = await agencyService.searchAgents(q);
      sendSuccess(res, agents);
    } catch (error) {
      next(error);
    }
  },

  // User links to an agent directly by Agent ID
  async linkByAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId } = req.body;
      if (!agentId) {
        res.status(400).json({ success: false, error: 'agentId is required' });
        return;
      }
      const result = await agencyService.linkByAgentId(req.user!.userId, agentId);
      sendSuccess(res, result, 'Agent linked');
    } catch (error) {
      next(error);
    }
  },

  // User joins an agency via its code
  async join(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;
      const result = await agencyService.joinByCode(req.user!.userId, code);
      sendSuccess(res, result, 'Joined agency');
    } catch (error) {
      next(error);
    }
  },

  // User leaves their agency
  async leave(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await agencyService.leaveAgency(req.user!.userId);
      sendSuccess(res, result, 'Left agency');
    } catch (error) {
      next(error);
    }
  },

  // Current user's agency (null if not a member)
  async getMyAgency(req: Request, res: Response, next: NextFunction) {
    try {
      const agency = await agencyService.getMyAgency(req.user!.userId);
      sendSuccess(res, agency);
    } catch (error) {
      next(error);
    }
  },

  // User: suggested agencies when not linked to one yet
  async suggest(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 5, 10);
      const agencies = await agencyService.suggestAgencies(req.user!.userId, limit);
      sendSuccess(res, agencies);
    } catch (error) {
      next(error);
    }
  },

  // Admin: agency members for a given agent
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
