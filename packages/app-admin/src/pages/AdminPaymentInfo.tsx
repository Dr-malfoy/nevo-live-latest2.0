import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { Upload } from 'lucide-react';

export const AdminPaymentInfo = () => {
  const [bybitQr, setBybitQr] = useState('');
  const [bybitAddr, setBybitAddr] = useState('');
  const [binanceQr, setBinanceQr] = useState('');
  const [binanceAddr, setBinanceAddr] = useState('');
  const [bkashQr, setBkashQr] = useState('');
  const [bkashNumber, setBkashNumber] = useState('');
  const [nagadQr, setNagadQr] = useState('');
  const [nagadNumber, setNagadNumber] = useState('');
  const [rocketQr, setRocketQr] = useState('');
  const [rocketNumber, setRocketNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    adminApi.getAdminPaymentInfo().then(({ data }) => {
      if (data.success && data.data) {
        setBybitQr(data.data.bybit?.qrCode || '');
        setBybitAddr(data.data.bybit?.walletAddress || data.data.bybit?.number || '');
        setBinanceQr(data.data.binance?.qrCode || '');
        setBinanceAddr(data.data.binance?.walletAddress || data.data.binance?.number || '');
        setBkashQr(data.data.bkash?.qrCode || '');
        setBkashNumber(data.data.bkash?.number || data.data.bkash?.walletAddress || '');
        setNagadQr(data.data.nagad?.qrCode || '');
        setNagadNumber(data.data.nagad?.number || data.data.nagad?.walletAddress || '');
        setRocketQr(data.data.rocket?.qrCode || '');
        setRocketNumber(data.data.rocket?.number || data.data.rocket?.walletAddress || '');
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
        bkash: { qrCode: bkashQr, number: bkashNumber, walletAddress: bkashNumber },
        nagad: { qrCode: nagadQr, number: nagadNumber, walletAddress: nagadNumber },
        rocket: { qrCode: rocketQr, number: rocketNumber, walletAddress: rocketNumber },
      });
      setMsg('Official payment info saved successfully');
    } catch { setMsg('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-8 text-dark-400">Loading...</div>;

  const QrBlock = ({ label, qr, setQr, address, setAddress, placeholder = 'Enter wallet address or phone number' }: { label: string; qr: string; setQr: (v: string) => void; address: string; setAddress: (v: string) => void; placeholder?: string }) => (
    <div className="bg-dark-700 rounded-lg p-4 space-y-3">
      <h4 className="font-medium text-sm text-cyan-400">{label}</h4>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {qr ? <img src={qr} alt={`${label} QR`} className="w-24 h-24 rounded-lg object-contain bg-white p-1" /> : <div className="w-24 h-24 bg-dark-600 rounded-lg flex items-center justify-center text-xs text-dark-400">No QR</div>}
          <label className="flex items-center justify-center gap-1 mt-2 text-xs text-primary-400 cursor-pointer">
            <Upload className="w-3 h-3" /> Upload QR
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleQrUpload(e, setQr)} />
          </label>
        </div>
        <div className="flex-1">
          <label className="text-xs text-dark-400 block mb-1">{label} Number / Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-dark-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono" placeholder={placeholder} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Nova Agent (Official) Payment Info</h2>
        <p className="text-xs text-dark-400 mt-1">
          Payment details displayed to users when they recharge via the official Nova agent. Orders submitted to this agent route directly to the Admin Portal.
        </p>
      </div>

      <div className="bg-dark-800 rounded-xl p-6 space-y-4">
        <QrBlock label="bKash (Personal / Merchant)" qr={bkashQr} setQr={setBkashQr} address={bkashNumber} setAddress={setBkashNumber} placeholder="e.g. 017XXXXXXXX" />
        <QrBlock label="Nagad" qr={nagadQr} setQr={setNagadQr} address={nagadNumber} setAddress={setNagadNumber} placeholder="e.g. 018XXXXXXXX" />
        <QrBlock label="Rocket" qr={rocketQr} setQr={setRocketQr} address={rocketNumber} setAddress={setRocketNumber} placeholder="e.g. 019XXXXXXXX" />
        <QrBlock label="Binance Pay (Pay ID / USDT BEP20)" qr={binanceQr} setQr={setBinanceQr} address={binanceAddr} setAddress={setBinanceAddr} placeholder="e.g. Binance Pay ID or Address" />
        <QrBlock label="Bybit Pay (UID / TRC20)" qr={bybitQr} setQr={setBybitQr} address={bybitAddr} setAddress={setBybitAddr} placeholder="e.g. Bybit UID or TRC20 Address" />
        
        {msg && <div className={`text-sm p-3 rounded-lg ${msg.includes('success') || msg.includes('saved') ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>{msg}</div>}
        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-primary-600 rounded-lg font-medium text-sm disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Payment Info'}
        </button>
      </div>
    </div>
  );
};
