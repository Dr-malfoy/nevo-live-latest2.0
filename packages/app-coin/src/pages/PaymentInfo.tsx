import { useEffect, useState } from 'react';
import { coinApi } from '../api';
import client from '../api/client';

export const PaymentInfo = () => {
  const [bybit, setBybit] = useState({ qrCode: '', walletAddress: '' });
  const [binance, setBinance] = useState({ qrCode: '', walletAddress: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [uploading, setUploading] = useState('');

  useEffect(() => {
    coinApi.getPaymentInfo().then(({ data }) => {
      if (data.success && data.data) {
        setBybit({ qrCode: data.data.bybit?.qrCode || '', walletAddress: data.data.bybit?.walletAddress || '' });
        setBinance({ qrCode: data.data.binance?.qrCode || '', walletAddress: data.data.binance?.walletAddress || '' });
      }
    }).finally(() => setLoading(false));
  }, []);

  const uploadFile = async (file: File, target: 'bybit' | 'binance') => {
    setUploading(target);
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await client.post('/upload', form);
      if (data.success) {
        const url = data.data?.url || '';
        if (target === 'bybit') setBybit((p) => ({ ...p, qrCode: url }));
        else setBinance((p) => ({ ...p, qrCode: url }));
      }
    } catch {} finally { setUploading(''); }
  };

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      await coinApi.updatePaymentInfo({ bybit, binance });
      setMsg('Payment info saved');
    } catch { setMsg('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-dark-400">Loading...</p>;

  const MethodCard = ({ title, color, info, setInfo, fileId, target }: any) => (
    <div className="bg-dark-800 rounded-xl p-6 space-y-4">
      <h3 className="font-bold flex items-center gap-2"><span className={`w-2 h-2 ${color} rounded-full`} /> {title}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-dark-400 mb-1 block">QR Code</label>
          {info.qrCode && <img src={info.qrCode} alt="QR" className="w-24 h-24 object-contain mb-2 bg-dark-700 rounded-lg" />}
          <input type="file" accept="image/*" className="hidden" id={fileId} onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], target)} />
          <label htmlFor={fileId} className="text-xs px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded-lg cursor-pointer inline-block">
            {uploading === target ? 'Uploading...' : 'Upload QR'}
          </label>
        </div>
        <div>
          <label className="text-xs text-dark-400 mb-1 block">Wallet Address</label>
          <input value={info.walletAddress} onChange={(e) => setInfo({ ...info, walletAddress: e.target.value })} className="w-full bg-dark-700 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Payment Settings</h2>
      <p className="text-xs text-dark-400 mb-4">Users see this info when they pay you for recharge. Keep it updated.</p>
      <div className="space-y-6">
        <MethodCard title="Bybit" color="bg-primary-500" info={bybit} setInfo={setBybit} fileId="bybit-qr" target="bybit" />
        <MethodCard title="Binance" color="bg-yellow-500" info={binance} setInfo={setBinance} fileId="binance-qr" target="binance" />
        {msg && <div className={`text-sm p-3 rounded-lg ${msg.includes('saved') ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>{msg}</div>}
        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-cyan-600 rounded-lg font-medium text-sm disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};
