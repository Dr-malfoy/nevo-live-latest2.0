import client from './client';

export const coinApi = {
  login: (phone: string, password: string) => client.post('/auth/login', { phone, password }),
  getTransactions: (params?: any) => client.get('/transactions', { params }),

  // Agent dashboard
  getDashboard: () => client.get('/agent/dashboard'),

  // Recharge requests from users
  getRechargeRequests: (params?: any) => client.get('/agent/recharge-requests', { params }),
  approveRecharge: (id: string) => client.put(`/agent/recharge-requests/${id}/approve`),
  rejectRecharge: (id: string, note?: string) => client.put(`/agent/recharge-requests/${id}/reject`, { note }),

  // Withdrawal requests
  getWithdrawalRequests: (params?: any) => client.get('/agent/withdrawal-requests', { params }),
  approveWithdrawal: (id: string) => client.put(`/agent/withdrawal-requests/${id}/approve`),
  rejectWithdrawal: (id: string, note?: string) => client.put(`/agent/withdrawal-requests/${id}/reject`, { note }),
  markWithdrawalPaid: (id: string) => client.put(`/agent/withdrawal-requests/${id}/paid`),

  // Buy diamonds/coins from admin
  createOrder: (data: any) => client.post('/agent/orders', data),
  getOrders: (params?: any) => client.get('/agent/orders', { params }),

  // Customers
  getCustomers: () => client.get('/agent/customers'),

  // Wallet / earnings
  getWallet: () => client.get('/agent/wallet'),

  // Payment info (where users pay the agent)
  getPaymentInfo: () => client.get('/agent/payment-info'),
  updatePaymentInfo: (data: any) => client.put('/agent/payment-info', data),

  // Admin payment info (agent pays admin)
  getAdminPaymentInfo: () => client.get('/payment/admin-info'),
  getPaymentMethods: () => client.get('/payment/methods'),

  // Notifications
  getNotifications: (params?: any) => client.get('/notifications', { params }),
  getUnreadCount: () => client.get('/notifications/unread-count'),

  // Reports
  createReport: (data: { targetType: string; targetId: string; reason: string; details?: string }) =>
    client.post('/reports', data),
};
