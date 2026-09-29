import { useEffect, useState } from 'react';
import { coinApi } from '../api';
import { DiamondIcon, CoinIcon } from '../components/CurrencyIcon';

export const Customers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    coinApi.getCustomers().then(({ data }) => {
      if (data.success) setCustomers(data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">My Customers</h2>
      {loading ? <p className="text-dark-400">Loading...</p> : customers.length === 0 ? (
        <p className="text-dark-400">No customers yet. Users link to you via your Agent ID.</p>
      ) : (
        <div className="bg-dark-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-dark-700"><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">UID</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Nickname</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Phone</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Diamonds</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Coins</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Role</th></tr></thead>
            <tbody>
              {customers.map((c: any) => (
                <tr key={c._id} className="border-b border-dark-700/50">
                  <td className="px-4 py-3 text-sm">{c.uid}</td>
                  <td className="px-4 py-3 text-sm">{c.nickname}</td>
                  <td className="px-4 py-3 text-sm text-dark-400">{c.phone}</td>
                  <td className="px-4 py-3 text-sm text-cyan-400 flex items-center gap-1"><DiamondIcon />{c.diamonds?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-yellow-400 flex items-center gap-1"><CoinIcon />{c.coins?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm capitalize">{c.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
