import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { auditController } from '../controllers/audit.controller';
import { analyticsController } from '../controllers/analytics.controller';
import { reportController } from '../controllers/report.controller';
import { contactController } from '../controllers/contact.controller';
import { walletController } from '../controllers/wallet.controller';
import { rewardController } from '../controllers/reward.controller';
import { officialNotificationController } from '../controllers/officialNotification.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleGuard';

const router = Router();

router.get('/dashboard', authenticate, requireAdmin, adminController.getDashboard);
router.get('/users', authenticate, requireAdmin, adminController.getUsers);
router.put('/users/:id/ban', authenticate, requireAdmin, adminController.toggleBanUser);
router.put('/users/:id/seller-type', authenticate, requireAdmin, adminController.setSellerType);

// Host Management & Badge System
router.get('/hosts', authenticate, requireAdmin, adminController.getHosts);
router.put('/hosts/:id/badge', authenticate, requireAdmin, adminController.setHostBadge);
router.post('/hosts/recalculate-badges', authenticate, requireAdmin, adminController.recalculateHostBadges);

router.get('/streams', authenticate, requireAdmin, adminController.getStreams);
router.get('/transactions', authenticate, requireAdmin, adminController.getTransactions);
router.put('/streams/:id/end', authenticate, requireAdmin, adminController.endStream);
router.get('/gifts', authenticate, requireAdmin, adminController.getGifts);
router.post('/gifts', authenticate, requireAdmin, adminController.createGift);
router.put('/gifts/:id', authenticate, requireAdmin, adminController.updateGift);
router.delete('/gifts/:id', authenticate, requireAdmin, adminController.deleteGift);

// Badge Management (Store Badges)
router.get('/badges', authenticate, requireAdmin, adminController.getBadges);
router.post('/badges', authenticate, requireAdmin, adminController.createBadge);
router.put('/badges/:id', authenticate, requireAdmin, adminController.updateBadge);
router.delete('/badges/:id', authenticate, requireAdmin, adminController.deleteBadge);

// Agent management
router.get('/agents', authenticate, requireAdmin, adminController.getAgents);
router.post('/agents', authenticate, requireAdmin, adminController.createAgent);

// Purchase order management (supervision — agent handles day-to-day)
router.get('/purchase-orders', authenticate, requireAdmin, adminController.getPurchaseOrders);
router.put('/purchase-orders/:id/confirm', authenticate, requireAdmin, adminController.confirmOrder);
router.put('/purchase-orders/:id/reject', authenticate, requireAdmin, adminController.rejectOrder);

// Agent → Admin orders
router.get('/agent-orders', authenticate, requireAdmin, adminController.getAgentPurchaseOrders);
router.put('/agent-orders/:id/confirm', authenticate, requireAdmin, adminController.approveAgentOrder);
router.put('/agent-orders/:id/reject', authenticate, requireAdmin, adminController.rejectAgentOrder);

// Withdrawal request management (admin supervision)
router.get('/withdrawal-requests', authenticate, requireAdmin, adminController.getWithdrawalRequests);

// Audit logs
router.get('/audit-logs', authenticate, requireAdmin, auditController.getLogs);

// Reports (user/agent reported content — moderation)
router.get('/reports', authenticate, requireAdmin, reportController.getAllReports);
router.put('/reports/:id', authenticate, requireAdmin, reportController.updateReportStatus);

// Analytics
router.get('/analytics', authenticate, requireAdmin, analyticsController.getReports);
router.get('/analytics/export', authenticate, requireAdmin, analyticsController.exportCsv);

// Contact messages from users
router.get('/contact-messages', authenticate, requireAdmin, contactController.getAllMessages);
router.put('/contact-messages/:id', authenticate, requireAdmin, contactController.replyToMessage);

// Wallet / inventory & transfers
router.get('/wallet', authenticate, requireAdmin, walletController.getWallet);
router.get('/wallet/lookup', authenticate, requireAdmin, walletController.lookupUser);
router.post('/wallet/transfer', authenticate, requireAdmin, walletController.transfer);

// Payment config
router.get('/payment-config', authenticate, requireAdmin, adminController.getPaymentConfig);
router.put('/payment-config', authenticate, requireAdmin, adminController.updatePaymentConfig);

// Custom Payment Methods
router.post('/custom-methods', authenticate, requireAdmin, adminController.createCustomMethod);
router.put('/custom-methods/:id', authenticate, requireAdmin, adminController.updateCustomMethod);
router.delete('/custom-methods/:id', authenticate, requireAdmin, adminController.deleteCustomMethod);

// Daily reward config (tiers + gift split)
router.get('/reward-config', authenticate, requireAdmin, rewardController.getConfig);
router.put('/reward-config', authenticate, requireAdmin, rewardController.updateConfig);

// Admin payment info
router.get('/payment-info', authenticate, requireAdmin, adminController.getAdminPaymentInfo);
router.put('/payment-info', authenticate, requireAdmin, adminController.updateAdminPaymentInfo);

// Official notifications (Mic icon broadcast)
router.get('/official-notifications', authenticate, requireAdmin, officialNotificationController.getAll);
router.post('/official-notifications', authenticate, requireAdmin, officialNotificationController.create);
router.put('/official-notifications/:id', authenticate, requireAdmin, officialNotificationController.update);
router.delete('/official-notifications/:id', authenticate, requireAdmin, officialNotificationController.remove);

// Dynamic Telegram links configuration
router.get('/telegram-config', authenticate, requireAdmin, adminController.getTelegramConfig);
router.put('/telegram-config', authenticate, requireAdmin, adminController.updateTelegramConfig);

export default router;

