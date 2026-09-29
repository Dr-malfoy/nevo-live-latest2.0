import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAdminAuth } from './stores/adminAuth';
import { Sidebar } from './components/Sidebar';
import { adminApi } from './api';
import { AdminLogin, Dashboard, Users, Streams, Transactions, Gifts, Agents, PurchaseOrders, PaymentConfig, AdminPaymentInfo, AgentOrders, WithdrawalRequests, AuditLogs, Reports, ModerationReports, ContactMessages, AdminWallet, RewardConfig, OfficialNotifications, Verification } from './pages';

const AdminLayout = () => {
  const { logout } = useAdminAuth();
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);

  useEffect(() => {
    const load = () => {
      adminApi.getModerationReports({ status: 'pending', limit: 1 }).then(({ data }) => {
        if (data.success) setComplaintsCount(data.pagination?.total || 0);
      }).catch(() => {});
      adminApi.getVerifications({ status: 'pending', limit: 1 }).then(({ data }) => {
        if (data.success) setPendingVerifications(data.pagination?.total || 0);
      }).catch(() => {});
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar onLogout={logout} complaintsCount={complaintsCount} pendingVerifications={pendingVerifications} />
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuth = useAdminAuth((s) => s.isAuth);
  if (!isAuth) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="streams" element={<Streams />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="gifts" element={<Gifts />} />
          <Route path="agents" element={<Agents />} />
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="payment-config" element={<PaymentConfig />} />
          <Route path="reward-config" element={<RewardConfig />} />
          <Route path="payment-info" element={<AdminPaymentInfo />} />
          <Route path="agent-orders" element={<AgentOrders />} />
          <Route path="withdrawal-requests" element={<WithdrawalRequests />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="reports" element={<Reports />} />
          <Route path="moderation-reports" element={<ModerationReports />} />
          <Route path="contact-messages" element={<ContactMessages />} />
          <Route path="wallet" element={<AdminWallet />} />
          <Route path="official-notifications" element={<OfficialNotifications />} />
          <Route path="verification" element={<Verification />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
