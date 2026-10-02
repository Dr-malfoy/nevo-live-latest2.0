import { Router } from 'express';
import { agencyController } from '../controllers/agency.controller';
import { referralController } from '../controllers/referral.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleGuard';

const router = Router();

// ── Public / Discover ────────────────────────────────────────────────────────
router.get('/', agencyController.listAgencies);
router.get('/search', agencyController.search);
router.get('/suggest', authenticate, agencyController.suggest);

// ── Creation ─────────────────────────────────────────────────────────────────
router.post('/create', authenticate, agencyController.createAgency);

// ── Current User Agency & Details ────────────────────────────────────────────
router.get('/my-agency', authenticate, agencyController.getMyAgency);
router.get('/leave-status', authenticate, agencyController.getLeaveStatus);

// ── Leave & Join Requests (Member & Agent) ───────────────────────────────────
router.post('/leave', authenticate, agencyController.leave);
router.post('/leave-request', authenticate, agencyController.requestLeave);
router.get('/leave-requests', authenticate, agencyController.getLeaveRequests);
router.post('/leave-requests/:id/decide', authenticate, agencyController.decideLeaveRequest);

router.get('/join-requests', authenticate, agencyController.getJoinRequests);
router.post('/join-requests/:id/decide', authenticate, agencyController.decideJoinRequest);

// ── Agent Management & Settings ──────────────────────────────────────────────
router.put('/settings', authenticate, agencyController.updateSettings);
router.delete('/members/:userId', authenticate, agencyController.removeMember);

// ── Agent Wallet / Financial Flows ───────────────────────────────────────────
router.post('/wallet/send-coins', authenticate, agencyController.agentSendCoins);
router.post('/wallet/send-diamonds', authenticate, agencyController.agentSendDiamonds);
router.post('/wallet/convert', authenticate, agencyController.agentConvertCurrency);

// ── Link by agent / Legacy join ──────────────────────────────────────────────
router.post('/link-by-agent', authenticate, agencyController.linkByAgent);
router.post('/join', authenticate, agencyController.join);

// ── Agent Invitations ────────────────────────────────────────────────────────
router.post('/invite', authenticate, referralController.inviteAgencyHost);
router.get('/invitations', authenticate, referralController.getAgencyInvitations);

// ── Specific Agency Dynamic ID Routes ────────────────────────────────────────
router.get('/:id', optionalAuth, agencyController.getAgencyDetails);
router.post('/:id/join', authenticate, agencyController.joinAgency);
router.post('/:id/request-join', authenticate, agencyController.requestJoin);

// ── Admin ────────────────────────────────────────────────────────────────────
router.get('/:agencyId/members', authenticate, requireAdmin, agencyController.getMembers);

export default router;
