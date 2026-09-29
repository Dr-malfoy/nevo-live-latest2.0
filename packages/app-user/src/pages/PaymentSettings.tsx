import { useEffect, useRef, useState } from 'react';
import { PiCaretLeftBold as ArrowLeft } from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import { paymentApi } from '../api/payment.api';

export const PaymentSettings = () => {
  const navigate = useNavigate();
  const [bybit, setBybit] = useState({ qrCode: '', walletAddress: '' });
  const [binance, setBinance] = useState({ qrCode: '', walletAddress: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [uploading, setUploading] = useState('');

  const bybitFileRef = useRef<HTMLInputElement>(null);
  const binanceFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    paymentApi.getUserPaymentInfo().then(({ data }: any) => {
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
    form.append('folder', 'user-payment');
    try {
      const { data }: any = await (await import('../api/client')).default.post('/upload', form);
      if (data.success) {
        const url = data.data?.url || '';
        if (target === 'bybit') setBybit((p) => ({ ...p, qrCode: url }));
        else setBinance((p) => ({ ...p, qrCode: url }));
      }
    } catch { setMsg('Upload failed'); }
    finally { setUploading(''); }
  };

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      await paymentApi.updateUserPaymentInfo({ bybit, binance });
      setMsg('Payment info saved');
    } catch { setMsg('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-ink-muted">Loading...</p></div>;

  const QrField = ({ label, value, onChange, placeholder }: any) => (
    <div>
      <label className="text-xs text-ink-muted mb-1 block">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-dark-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500" />
    </div>
  );

  return (
    <div className="min-h-screen pb-8">
      <div className="flex items-center gap-3 p-4 border-b border-line">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold">Payment Settings</h1>
      </div>
      <div className="p-4 space-y-4">
        {/* Bybit */}
        <div className="bg-surface-sunken rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2"><span className="w-2 h-2 bg-black text-white rounded-full" /> Bybit Payment Info</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink-muted mb-1 block">QR Code</label>
              {bybit.qrCode && <img src={bybit.qrCode} alt="Bybit QR" className="w-24 h-24 rounded-lg object-cover mb-2" />}
              <input ref={bybitFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'bybit')} />
              <button onClick={() => bybitFileRef.current?.click()} disabled={uploading === 'bybit'} className="text-xs px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors">
                {uploading === 'bybit' ? 'Uploading...' : bybit.qrCode ? 'Change QR' : 'Upload QR'}
              </button>
            </div>
            <QrField label="Wallet Address" value={bybit.walletAddress} onChange={(v: string) => setBybit({ ...bybit, walletAddress: v })} placeholder="Enter Bybit wallet address" />
          </div>
        </div>

        {/* Binance */}
        <div className="bg-surface-sunken rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2"><span className="w-2 h-2 bg-yellow-500 rounded-full" /> Binance Payment Info</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink-muted mb-1 block">QR Code</label>
              {binance.qrCode && <img src={binance.qrCode} alt="Binance QR" className="w-24 h-24 rounded-lg object-cover mb-2" />}
              <input ref={binanceFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'binance')} />
              <button onClick={() => binanceFileRef.current?.click()} disabled={uploading === 'binance'} className="text-xs px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors">
                {uploading === 'binance' ? 'Uploading...' : binance.qrCode ? 'Change QR' : 'Upload QR'}
              </button>
            </div>
            <QrField label="Wallet Address" value={binance.walletAddress} onChange={(v: string) => setBinance({ ...binance, walletAddress: v })} placeholder="Enter Binance wallet address" />
          </div>
        </div>

        {msg && <div className={`text-sm p-3 rounded-lg ${msg.includes('saved') ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>{msg}</div>}

        <button onClick={handleSave} disabled={saving} className="w-full py-2.5 bg-black text-white rounded-lg font-medium text-sm disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Payment Info'}
        </button>
      </div>
    </div>
  );
};
