import { useEffect, useState } from 'react';
import { useCoinAuth } from '../stores/coinAuth';
import { coinApi } from '../api';
import { useNavigate } from 'react-router-dom';
import { DiamondIcon, CoinIcon } from '../components/CurrencyIcon';

export const CoinDashboard = () => {
  const navigate = useNavigate();
  const user = useCoinAuth((s: any) => s.user);
  const setUser = useCoinAuth((s: any) => s.setUser);
  const [data, setData] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);

  useEffect(() => {
    coinApi.getDashboard().then(({ data: d }) => {
      if (d.success) {
        setData(d.data);
        // Refresh persisted user balance with fresh server data
        if (d.data?.agent) {
          setUser({ ...(user || {}), ...d.data.agent, diamonds: d.data.agent.diamonds, coins: d.data.agent.coins });
        }
      }
    });
    coinApi.getTransactions().then(({ data: d }) => d.success && setTxns(d.data || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fresh API balance takes priority over stale persisted user object
  const diamonds = data?.agent?.diamonds ?? user?.diamonds ?? 0;
  const coins = data?.agent?.coins ?? user?.coins ?? 0;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Agent Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-dark-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-cyan-400 flex items-center gap-2"><DiamondIcon />{diamonds.toLocaleString()}</p>
          <p className="text-xs text-dark-400">Diamonds</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-yellow-400 flex items-center gap-2"><CoinIcon />{coins.toLocaleString()}</p>
          <p className="text-xs text-dark-400">Coins</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4">
          <p className="text-2xl font-bold">{data?.hostCount ?? '...'}</p>
          <p className="text-xs text-dark-400">Hosts</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-yellow-500">{data?.pendingRecharges ?? '...'}</p>
          <p className="text-xs text-dark-400">Pending Recharges</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-blue-400">{data?.pendingWithdrawals ?? '...'}</p>
          <p className="text-xs text-dark-400">Pending Withdrawals</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4">
          <p className="text-2xl font-bold">{data?.todayOrders ?? '...'}</p>
          <p className="text-xs text-dark-400">Today's Orders</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <button onClick={() => navigate('/recharge-requests')} className="p-4 bg-dark-800 hover:bg-dark-700 rounded-xl text-left">
          <p className="font-bold">Recharge Requests</p>
          <p className="text-xs text-dark-400">Approve/reject user recharges</p>
        </button>
        <button onClick={() => navigate('/withdrawal-requests')} className="p-4 bg-dark-800 hover:bg-dark-700 rounded-xl text-left">
          <p className="font-bold">Withdrawal Requests</p>
          <p className="text-xs text-dark-400">Approve & mark paid</p>
        </button>
        <button onClick={() => navigate('/buy')} className="p-4 bg-dark-800 hover:bg-dark-700 rounded-xl text-left">
          <p className="font-bold">Buy from Admin</p>
          <p className="text-xs text-dark-400">Purchase diamonds with Binance</p>
        </button>
      </div>

      <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>
      <div className="bg-dark-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-dark-700"><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Type</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Amount</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Status</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Date</th></tr></thead>
          <tbody>
            {txns.map((t: any) => (
              <tr key={t._id} className="border-b border-dark-700/50">
                <td className="px-4 py-3 text-sm capitalize">{t.type.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-sm font-medium">{t.amount} <span className="text-[10px]">{t.currency}</span></td>
                <td className="px-4 py-3 text-sm"><span className={`text-xs px-2 py-0.5 rounded ${t.status === 'completed' ? 'bg-green-600' : 'bg-yellow-600'}`}>{t.status}</span></td>
                <td className="px-4 py-3 text-sm text-dark-400">{new Date(t.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
