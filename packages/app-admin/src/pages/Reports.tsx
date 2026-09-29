import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { adminApi } from '../api';

export const Reports = () => {
  const [summary, setSummary] = useState<any>(null);
  const [daily, setDaily] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await adminApi.getAnalytics(params);
      if (data.success) {
        setSummary(data.data?.summary);
        setDaily(data.data?.daily || []);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [from, to]);

  const handleExport = async () => {
    try {
      const params: any = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await adminApi.exportAnalytics(params);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'report.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const stats = [
    { label: 'Total Agents', value: summary?.totalAgents },
    { label: 'Total Hosts', value: summary?.totalHosts },
    { label: 'Total Users', value: summary?.totalUsers },
    { label: 'Revenue (completed)', value: summary?.revenue?.toLocaleString() },
    { label: 'Recharge Volume (BDT)', value: summary?.rechargeVolume?.toLocaleString() },
    { label: 'Withdrawal Volume (BDT)', value: summary?.withdrawalVolume?.toLocaleString() },
    { label: 'Agent Purchase Volume (BDT)', value: summary?.agentPurchaseVolume?.toLocaleString() },
  ];

  const maxTotal = Math.max(...daily.map((d: any) => d.total), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Reports</h2>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-dark-700 rounded-lg px-3 py-2 text-sm" />
          <span className="text-dark-400 text-sm">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-dark-700 rounded-lg px-3 py-2 text-sm" />
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-primary-600 rounded-lg text-sm">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {loading ? <p className="text-dark-400">Loading...</p> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="bg-dark-800 rounded-xl p-4">
                <p className="text-2xl font-bold">{s.value ?? '...'}</p>
                <p className="text-xs text-dark-400">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-dark-800 rounded-xl p-6">
            <h3 className="font-medium mb-4">Daily Transaction Volume</h3>
            {daily.length === 0 ? <p className="text-dark-400 text-sm">No data for this range</p> : (
              <div className="space-y-2">
                {daily.map((d: any) => (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className="text-xs text-dark-400 w-24 flex-shrink-0">{d.date}</span>
                    <div className="flex-1 bg-dark-700 rounded h-6 overflow-hidden">
                      <div className="bg-primary-600 h-full rounded" style={{ width: `${Math.max((d.total / maxTotal) * 100, 2)}%` }} />
                    </div>
                    <span className="text-xs text-dark-400 w-20 text-right">{d.total?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
