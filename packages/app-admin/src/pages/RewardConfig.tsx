import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { adminApi } from '../api';

interface Tier {
  count: number;
  rewardCoins: number;
  requiredHours: number;
}

export const RewardConfig = () => {
  const [giftUserShare, setGiftUserShare] = useState(70);
  const [giftAdminShare, setGiftAdminShare] = useState(30);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    adminApi.getRewardConfig().then(({ data }) => {
      if (data.success && data.data) {
        setGiftUserShare(data.data.giftUserShare ?? 70);
        setGiftAdminShare(data.data.giftAdminShare ?? 30);
        setTiers((data.data.tiers || []).map((t: any) => ({
          count: t.count,
          rewardCoins: t.rewardCoins,
          requiredHours: t.requiredHours,
        })));
      }
    }).finally(() => setLoading(false));
  }, []);

  const updateTier = (i: number, field: keyof Tier, value: number) => {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  };

  const addTier = () => {
    setTiers((prev) => [...prev, { count: 0, rewardCoins: 0, requiredHours: 0 }]);
  };

  const removeTier = (i: number) => {
    setTiers((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      const payload = { giftUserShare, giftAdminShare, tiers };
      await adminApi.updateRewardConfig(payload);
      setMsg('Settings saved successfully');
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-8 text-dark-400">Loading...</div>;

  const NumInput = ({ value, onChange, placeholder }: any) => (
    <input
      type="number"
      min="0"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full bg-dark-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
    />
  );

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-6">Daily Count Reward</h2>

      <div className="bg-dark-800 rounded-xl p-6 space-y-6">
        {/* Gift split */}
        <div>
          <h3 className="text-sm font-medium text-dark-400 mb-3">Gift Split (% of gift value)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-dark-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm whitespace-nowrap">User share</label>
              </div>
              <input
                type="number" min="0" max="100"
                value={giftUserShare}
                onChange={(e) => setGiftUserShare(parseFloat(e.target.value) || 0)}
                className="w-24 bg-dark-600 rounded px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <span className="text-sm ml-2">%</span>
            </div>
            <div className="p-3 bg-dark-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm whitespace-nowrap">Admin share</label>
              </div>
              <input
                type="number" min="0" max="100"
                value={giftAdminShare}
                onChange={(e) => setGiftAdminShare(parseFloat(e.target.value) || 0)}
                className="w-24 bg-dark-600 rounded px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <span className="text-sm ml-2">%</span>
            </div>
          </div>
          {giftUserShare + giftAdminShare !== 100 && (
            <p className="text-xs text-red-400 mt-2">User share + admin share must equal 100</p>
          )}
        </div>

        {/* Tiers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-dark-400">Reward Tiers</h3>
            <button onClick={addTier} className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 rounded-lg text-xs font-medium">
              <Plus className="w-3 h-3" /> Add Tier
            </button>
          </div>

          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-2 pb-2 text-[11px] uppercase text-dark-500 font-medium">
            <span>Count (coins)</span>
            <span>Reward (coins)</span>
            <span>Live hours</span>
            <span />
          </div>

          <div className="space-y-2">
            {tiers.map((t, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                <NumInput value={t.count} onChange={(v: number) => updateTier(i, 'count', v)} placeholder="150000" />
                <NumInput value={t.rewardCoins} onChange={(v: number) => updateTier(i, 'rewardCoins', v)} placeholder="3000" />
                <NumInput value={t.requiredHours} onChange={(v: number) => updateTier(i, 'requiredHours', v)} placeholder="2" />
                <button onClick={() => removeTier(i)} className="p-2 text-dark-500 hover:text-red-400 transition-colors" aria-label="Remove tier">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {tiers.length === 0 && (
            <p className="text-sm text-dark-500 text-center py-4">No tiers — add one to enable rewards</p>
          )}
        </div>

        {msg && <div className={`text-sm p-3 rounded-lg ${msg.includes('success') ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>{msg}</div>}

        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-primary-600 rounded-lg font-medium text-sm disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};
