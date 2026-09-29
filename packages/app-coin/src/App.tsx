import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom';
import { useCoinAuth } from './stores/coinAuth';
import {
  CoinLogin, CoinDashboard, BuyDiamonds, RechargeRequests,
  WithdrawalRequests, Customers, Wallet, Notifications, PaymentInfo,
} from './pages';

const Layout = () => {
  const { logout, user } = useCoinAuth((s: any) => s);

  const links = [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/recharge-requests', label: 'Recharge Requests' },
    { to: '/withdrawal-requests', label: 'Withdrawals' },
    { to: '/buy', label: 'Buy from Admin' },
    { to: '/customers', label: 'Customers' },
    { to: '/wallet', label: 'Wallet' },
    { to: '/notifications', label: 'Notifications' },
    { to: '/payment-info', label: 'Payment Settings' },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 min-h-screen bg-dark-900 border-r border-dark-800 p-4 flex flex-col">
        <h1 className="text-lg font-bold mb-1">Coin Portal</h1>
        <p className="text-xs text-dark-400 mb-1">Agent: {user?.nickname || '—'}</p>
        <p className="text-xs text-cyan-400 font-mono mb-6">ID: {user?.uid || '—'}</p>
        <nav className="space-y-1 flex-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `block px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-cyan-600' : 'hover:bg-dark-800'}`}
            >{l.label}</NavLink>
          ))}
        </nav>
        <button onClick={logout} className="mt-4 text-sm text-dark-400 hover:text-white">Logout</button>
      </aside>
      <main className="flex-1 p-6"><Outlet /></main>
    </div>
  );
};

export default function App() {
  const isAuth = useCoinAuth((s: any) => s.isAuth);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<CoinLogin />} />
        <Route path="/" element={isAuth ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<CoinDashboard />} />
          <Route path="recharge-requests" element={<RechargeRequests />} />
          <Route path="withdrawal-requests" element={<WithdrawalRequests />} />
          <Route path="buy" element={<BuyDiamonds />} />
          <Route path="customers" element={<Customers />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="payment-info" element={<PaymentInfo />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
