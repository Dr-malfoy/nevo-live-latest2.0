import { useEffect, useState, useRef } from 'react';
import { adminApi } from '../api';
import client from '../api/client';
import { PiUploadSimpleBold as Upload, PiTrashBold as Trash, PiCheckCircleFill as CheckCircle, PiXCircleFill as XCircle } from 'react-icons/pi';

export const PaymentConfig = () => {
  const [form, setForm] = useState({
    bybitEnabled: true, binanceEnabled: true, bkashEnabled: true, nagadEnabled: true, rocketEnabled: true,
    diamondRate: 1, coinRate: 1, withdrawalRate: 1, rechargeRate: 1, bonusRate: 0, serviceCharge: 0,
    agentProfitPercent: 5,
  });
  const [customMethods, setCustomMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  
  const [newMethod, setNewMethod] = useState({ key: '', name: '', color: 'text-white', iconUrl: '', enabled: true, feeType: 'percent', fee: 0, arrival: '24 hours' });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      adminApi.getPaymentConfig(),
      adminApi.getCustomMethods()
    ]).then(([configRes, methodsRes]) => {
      const data = configRes.data;
      if (data.success && data.data) {
        setForm({
          bybitEnabled: data.data.bybitEnabled ?? true,
          binanceEnabled: data.data.binanceEnabled ?? true,
          bkashEnabled: data.data.bkashEnabled ?? true,
          nagadEnabled: data.data.nagadEnabled ?? true,
          rocketEnabled: data.data.rocketEnabled ?? true,
          diamondRate: data.data.diamondRate ?? 1,
          coinRate: data.data.coinRate || 1,
          withdrawalRate: data.data.withdrawalRate || 1,
          rechargeRate: data.data.rechargeRate || 1,
          bonusRate: data.data.bonusRate || 0,
          serviceCharge: data.data.serviceCharge || 0,
          agentProfitPercent: data.data.agentProfitPercent ?? 5,
        });
      }
      if (methodsRes.data.success) {
        setCustomMethods(methodsRes.data.data);
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      await adminApi.updatePaymentConfig(form);
      setMsg('Settings saved successfully');
    } catch { setMsg('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await client.post('/upload', formData);
      if (data.success) setNewMethod(prev => ({ ...prev, iconUrl: data.data?.url || data.data }));
    } catch {
      alert('Failed to upload icon');
    } finally { setUploading(false); }
  };

  const handleAddCustomMethod = async () => {
    if (!newMethod.key || !newMethod.name) return alert('Key and Name are required');
    try {
      const { data } = await adminApi.createCustomMethod(newMethod);
      if (data.success) {
        setCustomMethods(prev => [data.data, ...prev]);
        setNewMethod({ key: '', name: '', color: 'text-white', iconUrl: '', enabled: true, feeType: 'percent', fee: 0, arrival: '24 hours' });
      }
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to create custom method');
    }
  };

  const toggleCustomMethod = async (method: any) => {
    try {
      const { data } = await adminApi.updateCustomMethod(method._id, { enabled: !method.enabled });
      if (data.success) {
        setCustomMethods(prev => prev.map(m => m._id === method._id ? data.data : m));
      }
    } catch { alert('Failed to update method'); }
  };

  const deleteCustomMethod = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;
    try {
      await adminApi.deleteCustomMethod(id);
      setCustomMethods(prev => prev.filter(m => m._id !== id));
    } catch { alert('Failed to delete method'); }
  };

  if (loading) return <div className="text-center py-8 text-dark-400">Loading...</div>;

  const Toggle = ({ label, value, onChange }: any) => (
    <label className="flex items-center justify-between p-3 bg-dark-700 rounded-lg cursor-pointer">
      <span className="font-medium">{label}</span>
      <button onClick={onChange} className={`w-12 h-6 rounded-full transition-colors ${value ? 'bg-primary-600' : 'bg-dark-500'}`}>
        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${value ? 'translate-x-6.5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );

  const RateRow = ({ label, value, onChange, suffix }: any) => (
    <div className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg mt-2">
      <span className="text-sm whitespace-nowrap">{label}</span>
      <input
        type="number" min="0.01" step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 1)}
        className="w-24 bg-dark-600 rounded px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      <span className="text-sm">{suffix}</span>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Payment Configuration</h2>

      <div className="bg-dark-800 rounded-xl p-6 space-y-6">
        {/* Dynamic Payment Methods */}
        <div>
          <h3 className="text-sm font-medium text-dark-400 mb-3">Dynamic Payment Methods</h3>
          
          <div className="bg-dark-700 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-bold mb-3 text-primary-400">Add New Method</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input placeholder="Key (e.g. stripe, paypal)" value={newMethod.key} onChange={e => setNewMethod({...newMethod, key: e.target.value})} className="bg-dark-600 rounded px-3 py-2 text-sm focus:outline-none" />
              <input placeholder="Display Name (e.g. PayPal)" value={newMethod.name} onChange={e => setNewMethod({...newMethod, name: e.target.value})} className="bg-dark-600 rounded px-3 py-2 text-sm focus:outline-none" />
              <input placeholder="Color Class (e.g. text-blue-500)" value={newMethod.color} onChange={e => setNewMethod({...newMethod, color: e.target.value})} className="bg-dark-600 rounded px-3 py-2 text-sm focus:outline-none" />
              
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/svg+xml,image/png" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex-1 bg-dark-600 rounded px-3 py-2 text-sm text-center flex items-center justify-center gap-2">
                  <Upload /> {uploading ? 'Uploading...' : 'Upload Icon'}
                </button>
                {newMethod.iconUrl && <img src={newMethod.iconUrl} alt="icon" className="w-8 h-8 object-contain" />}
              </div>
            </div>
            <button onClick={handleAddCustomMethod} className="w-full py-2 bg-primary-600 text-white rounded text-sm font-bold">Add Payment Method</button>
          </div>

          <div className="space-y-2">
            {customMethods.map(m => (
              <div key={m._id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                <div className="flex items-center gap-3">
                  {m.iconUrl ? <img src={m.iconUrl} alt={m.name} className="w-6 h-6 object-contain" /> : <div className="w-6 h-6 bg-dark-600 rounded-full" />}
                  <div>
                    <p className={`font-bold text-sm ${m.color || 'text-white'}`}>{m.name}</p>
                    <p className="text-xs text-dark-400">Key: {m.key}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleCustomMethod(m)}>
                    {m.enabled ? <CheckCircle className="w-6 h-6 text-green-500" /> : <XCircle className="w-6 h-6 text-dark-400" />}
                  </button>
                  <button onClick={() => deleteCustomMethod(m._id)}>
                    <Trash className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legacy Method toggles */}
        <div>
          <h3 className="text-sm font-medium text-dark-400 mb-3">Legacy Payment Methods</h3>
          <div className="space-y-3 opacity-50">
            <Toggle label="Bybit" value={form.bybitEnabled} onChange={() => setForm({ ...form, bybitEnabled: !form.bybitEnabled })} />
            <Toggle label="Binance" value={form.binanceEnabled} onChange={() => setForm({ ...form, binanceEnabled: !form.binanceEnabled })} />
            <Toggle label="bKash" value={form.bkashEnabled} onChange={() => setForm({ ...form, bkashEnabled: !form.bkashEnabled })} />
            <Toggle label="Nagad" value={form.nagadEnabled} onChange={() => setForm({ ...form, nagadEnabled: !form.nagadEnabled })} />
            <Toggle label="Rocket" value={form.rocketEnabled} onChange={() => setForm({ ...form, rocketEnabled: !form.rocketEnabled })} />
          </div>
        </div>

        {/* Conversion rates */}
        <div>
          <h3 className="text-sm font-medium text-dark-400 mb-3">Conversion Rates</h3>
          <RateRow label="1 BDT =" value={form.diamondRate} onChange={(v: number) => setForm({ ...form, diamondRate: v })} suffix={<span className="text-cyan-400">Diamonds</span>} />
          <RateRow label="1 BDT =" value={form.coinRate} onChange={(v: number) => setForm({ ...form, coinRate: v })} suffix={<span className="text-yellow-400">Coins</span>} />
          <RateRow label="Withdrawal 1 unit =" value={form.withdrawalRate} onChange={(v: number) => setForm({ ...form, withdrawalRate: v })} suffix={<span className="text-dark-400">BDT</span>} />
          <RateRow label="Recharge 1 BDT =" value={form.rechargeRate} onChange={(v: number) => setForm({ ...form, rechargeRate: v })} suffix={<span className="text-dark-400">units</span>} />
        </div>

        {/* Bonus & charges */}
        <div>
          <h3 className="text-sm font-medium text-dark-400 mb-3">Bonus & Charges</h3>
          <div className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg">
            <input
              type="number" min="0" max="100" step="0.5"
              value={form.bonusRate}
              onChange={(e) => setForm({ ...form, bonusRate: parseFloat(e.target.value) || 0 })}
              className="w-24 bg-dark-600 rounded px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <span className="text-sm">% recharge bonus (diamonds)</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg mt-2">
            <input
              type="number" min="0" max="100" step="0.5"
              value={form.serviceCharge}
              onChange={(e) => setForm({ ...form, serviceCharge: parseFloat(e.target.value) || 0 })}
              className="w-24 bg-dark-600 rounded px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <span className="text-sm">% withdrawal service charge</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg mt-2">
            <input
              type="number" min="0" max="100" step="0.5"
              value={form.agentProfitPercent}
              onChange={(e) => setForm({ ...form, agentProfitPercent: parseFloat(e.target.value) || 0 })}
              className="w-24 bg-dark-600 rounded px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <span className="text-sm">% agent profit on purchases</span>
          </div>
        </div>

        {msg && <div className={`text-sm p-3 rounded-lg ${msg.includes('success') ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>{msg}</div>}

        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-primary-600 rounded-lg font-medium text-sm disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};
