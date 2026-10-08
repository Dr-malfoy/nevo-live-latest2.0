import { useEffect, useRef, useState } from 'react';
import {
  PiCaretLeftBold as ArrowLeft,
  PiUploadSimpleBold as Upload,
  PiCheckBold as Check,
  PiShieldCheckFill as ShieldCheck,
} from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import { paymentApi } from '../api/payment.api';
import client from '../api/client';
import {
  BkashLogo,
  NagadLogo,
  RocketLogo,
  BinanceLogo,
  BybitLogo,
} from '../components/payment/PaymentLogos';

export const PaymentSettings = () => {
  const navigate = useNavigate();
  const [bkash, setBkash] = useState({ number: '', qrCode: '' });
  const [nagad, setNagad] = useState({ number: '', qrCode: '' });
  const [rocket, setRocket] = useState({ number: '', qrCode: '' });
  const [binance, setBinance] = useState({ walletAddress: '', qrCode: '' });
  const [bybit, setBybit] = useState({ walletAddress: '', qrCode: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [uploading, setUploading] = useState<string>('');

  const bkashFileRef = useRef<HTMLInputElement>(null);
  const nagadFileRef = useRef<HTMLInputElement>(null);
  const rocketFileRef = useRef<HTMLInputElement>(null);
  const binanceFileRef = useRef<HTMLInputElement>(null);
  const bybitFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    paymentApi
      .getUserPaymentInfo()
      .then(({ data }: any) => {
        if (data?.success && data.data) {
          const d = data.data;
          setBkash({
            number: d.bkash?.number || d.bkash?.phone || d.bkash?.walletAddress || '',
            qrCode: d.bkash?.qrCode || '',
          });
          setNagad({
            number: d.nagad?.number || d.nagad?.phone || d.nagad?.walletAddress || '',
            qrCode: d.nagad?.qrCode || '',
          });
          setRocket({
            number: d.rocket?.number || d.rocket?.phone || d.rocket?.walletAddress || '',
            qrCode: d.rocket?.qrCode || '',
          });
          setBinance({
            walletAddress: d.binance?.walletAddress || d.binance?.number || '',
            qrCode: d.binance?.qrCode || '',
          });
          setBybit({
            walletAddress: d.bybit?.walletAddress || d.bybit?.number || '',
            qrCode: d.bybit?.qrCode || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const uploadFile = async (
    file: File,
    target: 'bkash' | 'nagad' | 'rocket' | 'binance' | 'bybit'
  ) => {
    setUploading(target);
    const form = new FormData();
    form.append('file', file);
    form.append('folder', 'user-payment');
    try {
      const { data }: any = await client.post('/upload', form);
      if (data?.success) {
        const url = data.data?.url || data.data;
        if (target === 'bkash') setBkash((p) => ({ ...p, qrCode: url }));
        else if (target === 'nagad') setNagad((p) => ({ ...p, qrCode: url }));
        else if (target === 'rocket') setRocket((p) => ({ ...p, qrCode: url }));
        else if (target === 'binance') setBinance((p) => ({ ...p, qrCode: url }));
        else if (target === 'bybit') setBybit((p) => ({ ...p, qrCode: url }));
      }
    } catch {
      setMsg({ text: 'QR code upload failed', type: 'error' });
    } finally {
      setUploading('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await paymentApi.updateUserPaymentInfo({
        bkash: { number: bkash.number, phone: bkash.number, walletAddress: bkash.number, qrCode: bkash.qrCode },
        nagad: { number: nagad.number, phone: nagad.number, walletAddress: nagad.number, qrCode: nagad.qrCode },
        rocket: { number: rocket.number, phone: rocket.number, walletAddress: rocket.number, qrCode: rocket.qrCode },
        binance: { walletAddress: binance.walletAddress, qrCode: binance.qrCode },
        bybit: { walletAddress: bybit.walletAddress, qrCode: bybit.qrCode },
      });
      setMsg({ text: 'Payment settings saved successfully!', type: 'success' });
    } catch {
      setMsg({ text: 'Failed to save payment info. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-black rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-medium">Loading payment accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16 font-sans">
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3.5 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-tight">Agent Payment Accounts</h1>
          <p className="text-[11px] font-medium text-slate-500">Configure where users send you recharge funds</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* ── 1. bKash ────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-2.5">
            <BkashLogo className="w-8 h-8 rounded-xl shadow-xs" />
            <div>
              <h3 className="text-xs font-bold text-slate-900">bKash Account</h3>
              <p className="text-[10px] text-slate-400">Mobile Banking / Merchant / Personal</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">bKash Number</label>
            <input
              type="tel"
              value={bkash.number}
              onChange={(e) => setBkash({ ...bkash, number: e.target.value })}
              placeholder="01XXXXXXXXX"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
            />
          </div>

          <div className="pt-1">
            <label className="text-xs font-bold text-slate-700 block mb-1">bKash QR Code (Optional)</label>
            {bkash.qrCode ? (
              <div className="flex items-center gap-3">
                <img src={bkash.qrCode} alt="bKash QR" className="w-16 h-16 object-contain rounded-lg border border-slate-200 bg-white p-1" />
                <button
                  type="button"
                  onClick={() => setBkash({ ...bkash, qrCode: '' })}
                  className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg"
                >
                  Remove QR
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={bkashFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'bkash')}
                />
                <button
                  type="button"
                  onClick={() => bkashFileRef.current?.click()}
                  disabled={uploading === 'bkash'}
                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading === 'bkash' ? 'Uploading...' : 'Upload bKash QR'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 2. Nagad ────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-2.5">
            <NagadLogo className="w-8 h-8 rounded-xl shadow-xs" />
            <div>
              <h3 className="text-xs font-bold text-slate-900">Nagad Account</h3>
              <p className="text-[10px] text-slate-400">Mobile Banking / Personal</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Nagad Number</label>
            <input
              type="tel"
              value={nagad.number}
              onChange={(e) => setNagad({ ...nagad, number: e.target.value })}
              placeholder="01XXXXXXXXX"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
            />
          </div>

          <div className="pt-1">
            <label className="text-xs font-bold text-slate-700 block mb-1">Nagad QR Code (Optional)</label>
            {nagad.qrCode ? (
              <div className="flex items-center gap-3">
                <img src={nagad.qrCode} alt="Nagad QR" className="w-16 h-16 object-contain rounded-lg border border-slate-200 bg-white p-1" />
                <button
                  type="button"
                  onClick={() => setNagad({ ...nagad, qrCode: '' })}
                  className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg"
                >
                  Remove QR
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={nagadFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'nagad')}
                />
                <button
                  type="button"
                  onClick={() => nagadFileRef.current?.click()}
                  disabled={uploading === 'nagad'}
                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading === 'nagad' ? 'Uploading...' : 'Upload Nagad QR'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Rocket ───────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-2.5">
            <RocketLogo className="w-8 h-8 rounded-xl shadow-xs" />
            <div>
              <h3 className="text-xs font-bold text-slate-900">Rocket Account</h3>
              <p className="text-[10px] text-slate-400">Dutch-Bangla Bank Mobile Banking</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Rocket Number</label>
            <input
              type="tel"
              value={rocket.number}
              onChange={(e) => setRocket({ ...rocket, number: e.target.value })}
              placeholder="01XXXXXXXXX"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
            />
          </div>

          <div className="pt-1">
            <label className="text-xs font-bold text-slate-700 block mb-1">Rocket QR Code (Optional)</label>
            {rocket.qrCode ? (
              <div className="flex items-center gap-3">
                <img src={rocket.qrCode} alt="Rocket QR" className="w-16 h-16 object-contain rounded-lg border border-slate-200 bg-white p-1" />
                <button
                  type="button"
                  onClick={() => setRocket({ ...rocket, qrCode: '' })}
                  className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg"
                >
                  Remove QR
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={rocketFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'rocket')}
                />
                <button
                  type="button"
                  onClick={() => rocketFileRef.current?.click()}
                  disabled={uploading === 'rocket'}
                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading === 'rocket' ? 'Uploading...' : 'Upload Rocket QR'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 4. Binance ──────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-2.5">
            <BinanceLogo className="w-8 h-8 rounded-xl shadow-xs" />
            <div>
              <h3 className="text-xs font-bold text-slate-900">Binance Pay / BEP-20</h3>
              <p className="text-[10px] text-slate-400">USDT / BNB Smart Chain Wallet</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Binance Pay ID / Wallet Address</label>
            <input
              type="text"
              value={binance.walletAddress}
              onChange={(e) => setBinance({ ...binance, walletAddress: e.target.value })}
              placeholder="Binance Pay ID or 0x..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 font-mono"
            />
          </div>

          <div className="pt-1">
            <label className="text-xs font-bold text-slate-700 block mb-1">Binance QR Code (Optional)</label>
            {binance.qrCode ? (
              <div className="flex items-center gap-3">
                <img src={binance.qrCode} alt="Binance QR" className="w-16 h-16 object-contain rounded-lg border border-slate-200 bg-white p-1" />
                <button
                  type="button"
                  onClick={() => setBinance({ ...binance, qrCode: '' })}
                  className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg"
                >
                  Remove QR
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={binanceFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'binance')}
                />
                <button
                  type="button"
                  onClick={() => binanceFileRef.current?.click()}
                  disabled={uploading === 'binance'}
                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading === 'binance' ? 'Uploading...' : 'Upload Binance QR'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 5. Bybit ────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-2.5">
            <BybitLogo className="w-8 h-8 rounded-xl shadow-xs" />
            <div>
              <h3 className="text-xs font-bold text-slate-900">Bybit Pay / TRC-20</h3>
              <p className="text-[10px] text-slate-400">USDT / Tron Wallet</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Bybit UID / TRC-20 Wallet Address</label>
            <input
              type="text"
              value={bybit.walletAddress}
              onChange={(e) => setBybit({ ...bybit, walletAddress: e.target.value })}
              placeholder="Bybit UID or T..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 font-mono"
            />
          </div>

          <div className="pt-1">
            <label className="text-xs font-bold text-slate-700 block mb-1">Bybit QR Code (Optional)</label>
            {bybit.qrCode ? (
              <div className="flex items-center gap-3">
                <img src={bybit.qrCode} alt="Bybit QR" className="w-16 h-16 object-contain rounded-lg border border-slate-200 bg-white p-1" />
                <button
                  type="button"
                  onClick={() => setBybit({ ...bybit, qrCode: '' })}
                  className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg"
                >
                  Remove QR
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={bybitFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'bybit')}
                />
                <button
                  type="button"
                  onClick={() => bybitFileRef.current?.click()}
                  disabled={uploading === 'bybit'}
                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading === 'bybit' ? 'Uploading...' : 'Upload Bybit QR'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Status Message ───────────────────────────────────────── */}
        {msg && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              msg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {msg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : null}
            <span>{msg.text}</span>
          </div>
        )}

        {/* ── Save Button ─────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? 'Saving Changes...' : 'Save Agent Payment Settings'}
        </button>

        <div className="p-3 bg-white border border-slate-200 rounded-2xl text-center flex items-center justify-center gap-2 text-slate-400 text-[11px] font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Users recharge by sending payment to these accounts.</span>
        </div>
      </div>
    </div>
  );
};
