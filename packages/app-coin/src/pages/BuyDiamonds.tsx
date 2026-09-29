import { useEffect, useState } from 'react';
import { coinApi } from '../api';
import client from '../api/client';
import { DiamondIcon, CoinIcon } from '../components/CurrencyIcon';

export const BuyDiamonds = () => {
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [rates, setRates] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [currency, setCurrency] = useState<'diamond' | 'coin'>('diamond');
  const [paymentMethod, setPaymentMethod] = useState('binance');
  const [amountBdt, setAmountBdt] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    Promise.all([coinApi.getAdminPaymentInfo(), coinApi.getPaymentMethods()]).then(([a, b]) => {
      if (a.data.success) setAdminInfo(a.data.data);
      if (b.data.success) setRates(b.data.data);
    }).finally(() => setLoading(false));
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const { data } = await coinApi.getOrders();
      if (data.success) setOrders(data.data);
    } catch {} finally { setOrdersLoading(false); }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await client.post('/upload', form);
    return data.data?.url || '';
  };

  const handleSubmit = async () => {
    if (!amountBdt || !screenshot || !transactionId) { setMsg('Please fill all fields'); return; }
    setSaving(true); setMsg('');
    try {
      await coinApi.createOrder({ currency, amountBdt: parseFloat(amountBdt), paymentMethod, screenshot, transactionId });
      setMsg('Purchase request submitted');
      setAmountBdt(''); setScreenshot(''); setTransactionId('');
      loadOrders();
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Failed to submit');
    } finally { setSaving(false); }
  };

  const calculated = amountBdt && rates ? Math.floor(parseFloat(amountBdt) * (currency === 'diamond' ? rates.diamondRate : rates.coinRate)) : 0;
  const payInfo = paymentMethod === 'bybit' ? adminInfo?.bybit : adminInfo?.binance;

  if (loading) return <div className="text-center py-8 text-dark-400">Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Buy from Admin</h2>

      {/* Admin payment info */}
      <div className="bg-dark-800 rounded-xl p-6 mb-6">
        <h3 className="font-medium mb-4">Admin Payment Details ({paymentMethod})</h3>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setPaymentMethod('binance')} className={`px-4 py-2 rounded-lg text-sm ${paymentMethod === 'binance' ? 'bg-yellow-600' : 'bg-dark-700'}`}>Binance</button>
          <button onClick={() => setPaymentMethod('bybit')} className={`px-4 py-2 rounded-lg text-sm ${paymentMethod === 'bybit' ? 'bg-primary-600' : 'bg-dark-700'}`}>Bybit</button>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            {payInfo?.qrCode ? <img src={payInfo.qrCode} alt="QR" className="w-32 h-32 rounded-lg mb-2" /> : <div className="w-32 h-32 bg-dark-700 rounded-lg mb-2 flex items-center justify-center text-xs text-dark-400">No QR</div>}
            <p className="text-xs text-dark-400 break-all">{payInfo?.walletAddress || 'No address'}</p>
          </div>
        </div>
      </div>

      {/* Create order */}
      <div className="bg-dark-800 rounded-xl p-6 space-y-4 mb-6">
        <h3 className="font-medium">New Purchase Request</h3>
        <div className="flex gap-2">
          <button onClick={() => setCurrency('diamond')} className={`px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 ${currency === 'diamond' ? 'bg-cyan-600' : 'bg-dark-700'}`}><DiamondIcon /> Diamond</button>
          <button onClick={() => setCurrency('coin')} className={`px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 ${currency === 'coin' ? 'bg-yellow-600' : 'bg-dark-700'}`}><CoinIcon /> Coin</button>
        </div>
        <div>
          <label className="text-xs text-dark-400 block mb-1">Amount (BDT)</label>
          <input type="number" value={amountBdt} onChange={(e) => setAmountBdt(e.target.value)} className="w-full bg-dark-700 rounded-lg px-3 py-2 text-sm" />
          {calculated > 0 && <p className="text-xs text-dark-400 mt-1 flex items-center gap-1">= {calculated.toLocaleString()} {currency === 'diamond' ? <DiamondIcon /> : <CoinIcon />}</p>}
        </div>
        <div>
          <label className="text-xs text-dark-400 block mb-1">Payment Screenshot</label>
          <input type="file" accept="image/*" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) { const url = await uploadFile(file); if (url) setScreenshot(url); }
          }} className="w-full text-sm text-dark-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-dark-700 file:text-sm file:text-white" />
          {screenshot && <img src={screenshot} alt="Preview" className="w-20 h-20 rounded mt-2 object-cover" />}
        </div>
        <div>
          <label className="text-xs text-dark-400 block mb-1">Transaction ID</label>
          <input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="w-full bg-dark-700 rounded-lg px-3 py-2 text-sm" />
        </div>
        {msg && <div className={`text-sm p-3 rounded-lg ${msg.includes('submitted') || msg.includes('success') ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>{msg}</div>}
        <button onClick={handleSubmit} disabled={saving} className="px-6 py-2.5 bg-primary-600 rounded-lg font-medium text-sm disabled:opacity-50">
          {saving ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>

      {/* My orders */}
      <div className="bg-dark-800 rounded-xl overflow-hidden">
        <h3 className="font-medium p-4 border-b border-dark-700">My Purchase Requests</h3>
        {ordersLoading ? <p className="p-4 text-sm text-dark-400">Loading...</p> : orders.length === 0 ? <p className="p-4 text-sm text-dark-400">No requests yet</p> : (
          <table className="w-full">
            <thead><tr className="border-b border-dark-700"><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Currency</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Amount</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">BDT</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Status</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Date</th></tr></thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o._id} className="border-b border-dark-700/50">
                  <td className="px-4 py-3 text-sm flex items-center gap-1">{o.currency === 'diamond' ? <DiamondIcon /> : <CoinIcon />} {o.currency}</td>
                  <td className="px-4 py-3 text-sm">{o.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">৳{o.amountBdt?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`text-xs px-2 py-0.5 rounded ${o.status === 'approved' ? 'bg-green-600' : o.status === 'rejected' ? 'bg-red-600' : 'bg-yellow-600'}`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
