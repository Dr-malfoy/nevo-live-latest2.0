import { useEffect, useState } from 'react';
import { coinApi } from '../api';
import { DiamondIcon, CoinIcon } from '../components/CurrencyIcon';

export const Wallet = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    coinApi.getWallet().then(({ data: d }) => {
      if (d.success) setData(d.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-dark-400">Loading...</p>;

  const earnings = data?.earnings || {};
  const txns = data?.transactions || [];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Wallet & Earnings</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-dark-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-cyan-400 flex items-center gap-2"><DiamondIcon />{data?.agent?.diamonds?.toLocaleString() || 0}</p>
          <p className="text-xs text-dark-400">Diamond Balance</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-yellow-400 flex items-center gap-2"><CoinIcon />{data?.agent?.coins?.toLocaleString() || 0}</p>
          <p className="text-xs text-dark-400">Coin Balance</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-400">{earnings.commissionEarned?.toLocaleString() || 0}</p>
          <p className="text-xs text-dark-400">Commission Earned</p>
        </div>
        <div className="bg-dark-800 rounded-xl p-4">
          <p className="text-2xl font-bold">{earnings.rechargeVolume?.toLocaleString() || 0}</p>
          <p className="text-xs text-dark-400">Recharge Volume</p>
        </div>
      </div>

      <h3 className="text-lg font-bold mb-4">Transaction History</h3>
      <div className="bg-dark-800 rounded-xl overflow-hidden">
        {txns.length === 0 ? <p className="p-4 text-dark-400 text-sm">No transactions yet</p> : (
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
        )}
      </div>
    </div>
  );
};
