import client from './client';

export const adminApi = {
  login: (phone: string, password: string) => client.post('/auth/login', { phone, password }),
  googleLogin: (idToken: string) => client.post('/auth/google', { idToken }),
  getDashboard: () => client.get('/admin/dashboard'),
  getUsers: (params?: Record<string, any>) => client.get('/admin/users', { params }),
  toggleBan: (id: string) => client.put(`/admin/users/${id}/ban`),
  setSellerType: (id: string, sellerType: 'none' | 'official' | 'paylor') =>
    client.put(`/admin/users/${id}/seller-type`, { sellerType }),
  getHosts: (params?: Record<string, any>) => client.get('/admin/hosts', { params }),
  setHostBadge: (id: string, hostBadge: 'alpha' | 'aurora' | 'none') =>
    client.put(`/admin/hosts/${id}/badge`, { hostBadge }),
  recalculateHostBadges: () => client.post('/admin/hosts/recalculate-badges'),
  getStreams: (params?: Record<string, any>) => client.get('/admin/streams', { params }),
  endStream: (id: string) => client.put(`/admin/streams/${id}/end`),
  getTransactions: (params?: Record<string, any>) => client.get('/admin/transactions', { params }),
  getAgents: () => client.get('/admin/agents'),
  getGifts: () => client.get('/admin/gifts'),
  createGift: (data: any) => client.post('/admin/gifts', data),
  updateGift: (id: string, data: any) => client.put(`/admin/gifts/${id}`, data),
  deleteGift: (id: string) => client.delete(`/admin/gifts/${id}`),
  getPurchaseOrders: (params?: Record<string, any>) => client.get('/admin/purchase-orders', { params }),
  confirmOrder: (id: string) => client.put(`/admin/purchase-orders/${id}/confirm`),
  rejectOrder: (id: string, note?: string) => client.put(`/admin/purchase-orders/${id}/reject`, { note }),
  getPaymentConfig: () => client.get('/admin/payment-config'),
  updatePaymentConfig: (data: any) => client.put('/admin/payment-config', data),
  getCustomMethods: () => client.get('/payment/custom-methods'),
  createCustomMethod: (data: any) => client.post('/admin/custom-methods', data),
  updateCustomMethod: (id: string, data: any) => client.put(`/admin/custom-methods/${id}`, data),
  deleteCustomMethod: (id: string) => client.delete(`/admin/custom-methods/${id}`),

  // Daily reward config (tiers + gift split)
  getRewardConfig: () => client.get('/admin/reward-config'),
  updateRewardConfig: (data: any) => client.put('/admin/reward-config', data),
  createAgent: (data: { phone: string; password: string; nickname: string; name?: string }) =>
    client.post('/admin/agents', data),

  // Admin payment info (QR/wallet)
  getAdminPaymentInfo: () => client.get('/admin/payment-info'),
  updateAdminPaymentInfo: (data: any) => client.put('/admin/payment-info', data),

  // Agent → Admin orders (fix: previously missing)
  getAgentOrders: (params?: Record<string, any>) => client.get('/admin/agent-orders', { params }),
  confirmAgentOrder: (id: string) => client.put(`/admin/agent-orders/${id}/confirm`),
  rejectAgentOrder: (id: string, note?: string) => client.put(`/admin/agent-orders/${id}/reject`, { note }),

  // Withdrawal requests (admin supervision)
  getWithdrawalRequests: (params?: Record<string, any>) => client.get('/admin/withdrawal-requests', { params }),

  // Audit logs
  getAuditLogs: (params?: Record<string, any>) => client.get('/admin/audit-logs', { params }),

  // Moderation reports (user-reported content)
  getModerationReports: (params?: Record<string, any>) => client.get('/admin/reports', { params }),
  updateModerationReport: (id: string, data: { status: string; adminNote?: string }) =>
    client.put(`/admin/reports/${id}`, data),

  // Contact messages from users / support tickets
  getContactMessages: (params?: Record<string, any>) => client.get('/admin/contact-messages', { params }),
  replyContactMessage: (id: string, data: { reply?: string; status?: string }) =>
    client.put(`/admin/contact-messages/${id}`, data),

  // Telegram dynamic configuration
  getTelegramConfig: () => client.get('/admin/telegram-config'),
  updateTelegramConfig: (data: { channelUrl?: string; supportUrl?: string; groupUrl?: string }) =>
    client.put('/admin/telegram-config', data),


  // Analytics
  getAnalytics: (params?: Record<string, any>) => client.get('/admin/analytics', { params }),
  exportAnalytics: (params?: Record<string, any>) => client.get('/admin/analytics/export', { params, responseType: 'blob' }),

  // Admin wallet / inventory & transfers
  getWallet: () => client.get('/admin/wallet'),
  lookupUser: (query: string) => client.get('/admin/wallet/lookup', { params: { query } }),
  transferCurrency: (data: { targetId: string; currency: 'diamond' | 'coin'; amount: number }) =>
    client.post('/admin/wallet/transfer', data),
  transferToAgent: (data: { agentId?: string; targetId?: string; currency: 'diamond' | 'coin'; amount: number }) =>
    client.post('/admin/wallet/transfer', data),

  // Game stats
  getTeenPattiStats: () => client.get('/teenpatti/stats'),
  getRouletteStats: () => client.get('/roulette/stats'),
  getAviatorStats: () => client.get('/aviator/stats'),

  // Official notifications (Mic icon broadcast)
  getOfficialNotifications: (params?: Record<string, any>) => client.get('/admin/official-notifications', { params }),
  createOfficialNotification: (data: { title: string; message: string; icon?: string }) =>
    client.post('/admin/official-notifications', data),
  updateOfficialNotification: (id: string, data: any) =>
    client.put(`/admin/official-notifications/${id}`, data),
  deleteOfficialNotification: (id: string) =>
    client.delete(`/admin/official-notifications/${id}`),

  // Account verification (Host/Agency OLAID/NID review)
  getVerifications: (params?: Record<string, any>) => client.get('/verification', { params }),
  approveVerification: (id: string) => client.put(`/verification/${id}/approve`),
  rejectVerification: (id: string, reason?: string) => client.put(`/verification/${id}/reject`, { reason }),
};
