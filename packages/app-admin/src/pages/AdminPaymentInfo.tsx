import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { Upload } from 'lucide-react';

export const AdminPaymentInfo = () => {
  const [bybitQr, setBybitQr] = useState('');
  const [bybitAddr, setBybitAddr] = useState('');
  const [binanceQr, setBinanceQr] = useState('');
  const [binanceAddr, setBinanceAddr] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    adminApi.getAdminPaymentInfo().then(({ data }) => {
      if (data.success && data.data) {
        setBybitQr(data.data.bybit?.qrCode || '');
        setBybitAddr(data.data.bybit?.walletAddress || '');
        setBinanceQr(data.data.binance?.qrCode || '');
        setBinanceAddr(data.data.binance?.walletAddress || '');
      }
    }).finally(() => setLoading(false));
  }, []);

  const uploadFile = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', 'admin-payment');
    const { data } = await import('../api/client').then((m) => m.default.post('/upload', form));
    return data.data?.url || '';
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (url) setter(url);
  };

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      await adminApi.updateAdminPaymentInfo({
        bybit: { qrCode: bybitQr, walletAddress: bybitAddr },
        binance: { qrCode: binanceQr, walletAddress: binanceAddr },
      });
      setMsg('Payment info saved');
    } catch { setMsg('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-8 text-dark-400">Loading...</div>;

  const QrBlock = ({ label, qr, setQr, address, setAddress }: { label: string; qr: string; setQr: (v: string) => void; address: string; setAddress: (v: string) => void }) => (
    <div className="bg-dark-700 rounded-lg p-4 space-y-3">
      <h4 className="font-medium text-sm">{label}</h4>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {qr ? <img src={qr} alt={`${label} QR`} className="w-24 h-24 rounded-lg object-cover" /> : <div className="w-24 h-24 bg-dark-600 rounded-lg flex items-center justify-center text-xs text-dark-400">No QR</div>}
          <label className="flex items-center justify-center gap-1 mt-2 text-xs text-primary-400 cursor-pointer">
            <Upload className="w-3 h-3" /> Upload QR
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleQrUpload(e, setQr)} />
          </label>
        </div>
        <div className="flex-1">
          <label className="text-xs text-dark-400 block mb-1">Wallet Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-dark-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="Enter wallet address" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Admin Payment Info</h2>
      <div className="bg-dark-800 rounded-xl p-6 space-y-4">
        <QrBlock label="Bybit" qr={bybitQr} setQr={setBybitQr} address={bybitAddr} setAddress={setBybitAddr} />
        <QrBlock label="Binance" qr={binanceQr} setQr={setBinanceQr} address={binanceAddr} setAddress={setBinanceAddr} />
        {msg && <div className={`text-sm p-3 rounded-lg ${msg.includes('success') || msg.includes('saved') ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>{msg}</div>}
        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-primary-600 rounded-lg font-medium text-sm disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Payment Info'}
        </button>
      </div>
    </div>
  );
};
