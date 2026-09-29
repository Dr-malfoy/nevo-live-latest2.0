import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Radio, ArrowLeftRight, Gift, Building2, ShoppingCart, Settings, Wallet, ShoppingBag, Handshake, ScrollText, BarChart3, Flag, Headphones, LogOut, Megaphone, ShieldCheck } from 'lucide-react';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/streams', icon: Radio, label: 'Streams' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/gifts', icon: Gift, label: 'Gifts' },
  { to: '/agents', icon: Building2, label: 'Agents' },
  { to: '/purchase-orders', icon: ShoppingCart, label: 'Purchase Orders' },
  { to: '/agent-orders', icon: ShoppingBag, label: 'Agent Orders' },
  { to: '/withdrawal-requests', icon: Handshake, label: 'Withdrawals' },
  { to: '/wallet', icon: Wallet, label: 'Platform Wallet' },
  { to: '/moderation-reports', icon: Flag, label: 'Complaints' },
  { to: '/contact-messages', icon: Headphones, label: 'Contact Messages' },
  { to: '/official-notifications', icon: Megaphone, label: 'Official Notifications' },
  { to: '/verification', icon: ShieldCheck, label: 'Verification' },
  { to: '/reports', icon: BarChart3, label: 'Analytics' },
  { to: '/audit-logs', icon: ScrollText, label: 'Audit Logs' },
  { to: '/payment-info', icon: Wallet, label: 'Payment Info' },
  { to: '/payment-config', icon: Settings, label: 'Payment Config' },
  { to: '/reward-config', icon: Gift, label: 'Rewards' },
];

export const Sidebar = ({ onLogout, complaintsCount, pendingVerifications }: { onLogout: () => void; complaintsCount?: number; pendingVerifications?: number }) => (
  <aside className="w-60 min-h-screen bg-dark-900 border-r border-dark-800 flex flex-col">
    <div className="p-4 border-b border-dark-800">
      <h1 className="text-lg font-bold">Navo Live Admin</h1>
      <p className="text-[10px] text-dark-400">v2-console</p>
    </div>
    <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
      {links.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to} to={to} end={end}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-primary-600 text-white' : 'text-dark-300 hover:bg-dark-800'}`
          }
        >
          <Icon className="w-4 h-4" />
          <span className="flex-1">{label}</span>
          {to === '/moderation-reports' && complaintsCount ? (
            <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {complaintsCount > 99 ? '99+' : complaintsCount}
            </span>
          ) : null}
          {to === '/verification' && pendingVerifications ? (
            <span className="min-w-[18px] h-[18px] px-1 bg-yellow-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {pendingVerifications > 99 ? '99+' : pendingVerifications}
            </span>
          ) : null}
        </NavLink>
      ))}
    </nav>
    <div className="p-2 border-t border-dark-800">
      <button onClick={onLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-dark-300 hover:bg-dark-800 w-full transition-colors">
        <LogOut className="w-4 h-4" /> Logout
      </button>
    </div>
  </aside>
);
