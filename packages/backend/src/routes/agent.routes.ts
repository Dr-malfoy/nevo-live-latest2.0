import { Router } from 'express';
import { agentController } from '../controllers/agent.controller';
import { authenticate } from '../middleware/auth';
import { requireAgent, requireVerified } from '../middleware/roleGuard';

const router = Router();

// All agent routes require authenticated agent
router.use(authenticate, requireAgent);

// Dashboard summary
router.get('/dashboard', agentController.getDashboard);
router.get('/pending-counts', agentController.getPendingCounts);

// Recharge requests from users (Host/User → Agent)
router.get('/recharge-requests', agentController.getRechargeRequests);
router.put('/recharge-requests/:id/approve', agentController.approveRecharge);
router.put('/recharge-requests/:id/reject', agentController.rejectRecharge);

// Withdrawal requests (Host/User → Agent)
router.get('/withdrawal-requests', agentController.getWithdrawalRequests);
router.put('/withdrawal-requests/:id/approve', agentController.approveWithdrawal);
router.put('/withdrawal-requests/:id/reject', agentController.rejectWithdrawal);
router.put('/withdrawal-requests/:id/paid', agentController.markWithdrawalPaid);

// Agent buys diamonds/coins from admin
router.post('/orders', agentController.createOrder);
router.get('/orders', agentController.getMyOrders);

// Customers (hosts + linked users)
router.get('/customers', agentController.getCustomers);

// Wallet / earnings summary
router.get('/wallet', agentController.getWallet);

// Payment info (where users pay the agent)
router.get('/payment-info', agentController.getPaymentInfo);
router.put('/payment-info', agentController.updatePaymentInfo);

// §4.7 Agent Analytics
router.get('/earnings', agentController.getEarnings);
router.get('/host-data', agentController.getHostData);
router.get('/invite-agent-data', agentController.getInviteAgentData);
router.get('/hosts', agentController.getMyHosts);
router.get('/applications', agentController.getApplications);
router.put('/applications/:id/approve', agentController.approveApplication);
router.put('/applications/:id/reject', agentController.rejectApplication);
router.get('/host-groups', agentController.getHostGroups);
router.post('/host-groups', agentController.createHostGroup);

export default router;
