import { Router } from 'express';
import { agencyController } from '../controllers/agency.controller';
import { referralController } from '../controllers/referral.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleGuard';

const router = Router();

// Public — search agents (for Link Agent)
router.get('/search', agencyController.search);

// User — link by agent id / join by code / leave
router.post('/link-by-agent', authenticate, agencyController.linkByAgent);
router.post('/join', authenticate, agencyController.join);
router.post('/leave', authenticate, agencyController.leave);
router.get('/my-agency', authenticate, agencyController.getMyAgency);
router.get('/suggest', authenticate, agencyController.suggest);

// Agent — invite host & view invitations (#25)
router.post('/invite', authenticate, referralController.inviteAgencyHost);
router.get('/invitations', authenticate, referralController.getAgencyInvitations);

// Admin — view agency members
router.get('/:agencyId/members', authenticate, requireAdmin, agencyController.getMembers);

export default router;
