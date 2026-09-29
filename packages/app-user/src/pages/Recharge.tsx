import { useEffect, useState, useRef } from 'react';
import { PiCaretLeftBold as ArrowLeft, PiUploadSimpleBold as Upload, PiCheckCircleFill as CheckCircle, PiInfoFill as AlertCircle, PiLinkBold as Link2, PiCaretDownBold as CaretDown, PiWalletFill, PiCurrencyCircleDollarFill } from 'react-icons/pi';
import { SiBinance } from 'react-icons/si';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { paymentApi } from '../api/payment.api';
import { agencyApi } from '../api/agency.api';
import { useAuthStore } from '../stores';
import { DiamondIcon, CoinIcon } from '../components/ui/CurrencyIcon';
import { VerificationGateModal } from '../components/ui';
import { canUseTradeFeatures } from '../services/verification';

const DEFAULT_METHODS: { key: string; label: string; color: string; icon: React.ReactNode }[] = [
  { key: 'bkash', label: 'bKash', color: 'text-pink-500', icon: <PiWalletFill className="w-8 h-8 mx-auto" /> },
  { key: 'nagad', label: 'Nagad', color: 'text-orange-500', icon: <PiWalletFill className="w-8 h-8 mx-auto" /> },
  { key: 'rocket', label: 'Rocket', color: 'text-purple-500', icon: <PiWalletFill className="w-8 h-8 mx-auto" /> },
  { key: 'binance', label: 'Binance', color: 'text-yellow-500', icon: <SiBinance className="w-8 h-8 mx-auto" /> },
  { key: 'bybit', label: 'Bybit', color: 'text-yellow-600', icon: <PiCurrencyCircleDollarFill className="w-8 h-8 mx-auto" /> },
];

export const Recharge = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { user, updateUser } = useAuthStore();
  const [methods, setMethods] = useState<any>({ bybitEnabled: true, binanceEnabled: true, bkashEnabled: true, nagadEnabled: true, rocketEnabled: true, diamondRate: 1, coinRate: 1 });
  const [customMethods, setCustomMethods] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState<boolean>(false);
  const [linkedAgentId, setLinkedAgentId] = useState<string>('');
  const [linkedAgentInfo, setLinkedAgentInfo] = useState<any>(null);
  const [currency, setCurrency] = useState<'diamond' | 'coin'>('diamond');
  const [paymentMethod, setPaymentMethod] = useState<string>('bkash');
  const [amountBdt, setAmountBdt] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    Promise.all([
      paymentApi.getMethods(),
      paymentApi.getCustomMethods(),
      paymentApi.getAgents(),
      paymentApi.getOrders({ limit: 10 }),
    ]).then(([m, cm, a, o]: any) => {
      if (m.data.success) setMethods(m.data.data);
      if (cm.data.success) setCustomMethods(cm.data.data);
      if (a.data.success) setAgents(a.data.data || []);
      if (o.data.success) setOrders(o.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  // Default the selection to the user's linked agent (still changeable below).
  // The backend is the source of truth for the link — resolve it whenever the
  // client's agencyId changes (e.g. user relinks to another agent) so the old
  // agent never stays selected, and clear it when the user unlinks.
  useEffect(() => {
    let cancelled = false;
    agencyApi.getMyAgency().then(({ data: d }: any) => {
      if (cancelled) return;
      if (d.success && d.data?.agentId) {
        const agent = typeof d.data.agentId === 'object' ? d.data.agentId : null;
        const agentId = agent?._id || (typeof d.data.agentId === 'string' ? d.data.agentId : null);
        if (agentId) {
          // Resolve full agent info (incl. paymentInfo) from the loaded agents list
          const full = agents.find((a: any) => a._id === agentId);
          setLinkedAgentInfo(full ? full : { ...(agent || {}), _id: agentId, paymentInfo: {} });
          setLinkedAgentId(agentId);
          setSelectedAgent(agentId);
          // Self-heal the persisted client link so future renders agree
          if (d.data._id && user?.agencyId !== d.data._id.toString()) {
            updateUser({ agencyId: d.data._id.toString() });
          }
        }
      } else if (d.success) {
        // No linked agency — clear any stale selection (e.g. a previously
        // auto-selected agent) so it doesn't stay after unlinking.
        setLinkedAgentId('');
        setLinkedAgentInfo(null);
        setSelectedAgent('');
      }
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.agencyId, agents.length]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await client.post('/upload', formData);
      if (data.success) setScreenshot(data.data?.url || data.data);
    } catch {
      setError('Failed to upload screenshot');
    } finally { setUploading(false); }
  };

  const handleSubmit = async () => {
    if (!canUseTradeFeatures(user?.verification, user?.role)) {
      setShowGate(true);
      return;
    }

    if (!selectedAgent) { setError('Select an agent to pay'); return; }
    if (!amountBdt || !transactionId || !screenshot) {
      setError('Please fill all fields and upload screenshot');
      return;
    }
    if (['bkash', 'nagad', 'rocket'].includes(paymentMethod) && !accountNumber) {
      setError('Enter your sender account number');
      return;
    }
    setSubmitting(true); setError('');
    try {
      await paymentApi.createOrder({
        paymentMethod,
        amountBdt: parseInt(amountBdt),
        screenshot,
        transactionId,
        currency,
        agentId: selectedAgent,
        accountNumber: accountNumber || undefined,
      });
      setSuccess(true);
      setAmountBdt(''); setTransactionId(''); setScreenshot(''); setAccountNumber('');
      const { data } = await paymentApi.getOrders({ limit: 10 });
      if (data.success) setOrders(data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit order');
    } finally { setSubmitting(false); }
  };

  // Match backend: rechargeRate for units, bonusRate % bonus on diamonds
  const rate = currency === 'diamond' ? (methods.rechargeRate || methods.diamondRate) : (methods.rechargeRate || methods.coinRate);
  const units = Math.floor((parseInt(amountBdt) || 0) * rate);
  const bonus = currency === 'diamond' && methods.bonusRate > 0 ? Math.floor(units * (methods.bonusRate / 100)) : 0;
  const totalUnits = units + bonus;

  // Always include the linked agent in the payable list (even if they have no
  // payment info yet) so the picker never shows a different "wrong" agent.
  const payableAgents = linkedAgentInfo
    ? [linkedAgentInfo, ...agents.filter((a: any) => a._id !== linkedAgentInfo._id)]
    : agents;
  const selectedAgentInfo = payableAgents.find((a: any) => a._id === selectedAgent) || linkedAgentInfo;
  const agentPayInfo = paymentMethod === 'bybit' ? selectedAgentInfo?.paymentInfo?.bybit : selectedAgentInfo?.paymentInfo?.binance;
  const enabledMethods = [
    ...DEFAULT_METHODS.filter((m) => {
      if (m.key === 'bkash') return methods.bkashEnabled;
      if (m.key === 'nagad') return methods.nagadEnabled;
      if (m.key === 'rocket') return methods.rocketEnabled;
      if (m.key === 'binance') return methods.binanceEnabled;
      return methods.bybitEnabled;
    }),
    ...customMethods.filter(m => m.enabled).map(m => ({
      key: m.key,
      label: m.name,
      color: m.color || 'text-white',
      icon: m.iconUrl ? <img src={m.iconUrl} alt={m.name} className="w-8 h-8 mx-auto object-contain" /> : <PiWalletFill className="w-8 h-8 mx-auto" />
    }))
  ];

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-ink-muted">Loading...</p></div>;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-line">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold">Recharge</h1>
      </div>

      {success ? (
        <div className="p-4 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Order Submitted!</h2>
          <p className="text-ink-muted text-sm mb-6">Your purchase order is pending review by the agent.</p>
          <button onClick={() => { setSuccess(false); }} className="px-6 py-2.5 bg-black text-white rounded-lg font-medium text-sm">Submit Another</button>
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* Agent selection */}
          <div>
            <h3 className="text-sm font-medium text-ink-muted mb-3">Select Agent</h3>
            {payableAgents.length === 0 ? (
              <p className="text-sm text-ink-muted bg-surface-sunken rounded-xl p-3">
                No agents available yet. Try again later.
              </p>
            ) : (
              <>
                {linkedAgentId && selectedAgent === linkedAgentId && (
                  <p className="text-xs text-sky-400 flex items-center gap-1 mb-2">
                    <Link2 className="w-3.5 h-3.5" /> Your linked agent is pre-selected — you can change it below.
                  </p>
                )}
                <div className="relative">
                  <button
                    onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
                    className="w-full bg-surface-sunken border border-line-strong rounded-xl px-4 py-3 text-sm font-medium text-ink flex items-center justify-between focus:outline-none focus:border-accent-500"
                  >
                    <span>
                      {selectedAgent 
                        ? (payableAgents.find((a: any) => a._id === selectedAgent)?.nickname || 'Select an agent...')
                        : 'Select an agent...'}
                    </span>
                    <CaretDown className={`w-4 h-4 text-ink-muted transition-transform ${isAgentDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isAgentDropdownOpen && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-2 bg-surface-sunken border border-line-strong rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {payableAgents.map((a: any) => (
                        <button
                          key={a._id}
                          onClick={() => {
                            setSelectedAgent(a._id);
                            setIsAgentDropdownOpen(false);
                          }}
                          className={`w-full text-left p-3 border-b border-line-strong last:border-b-0 transition-colors ${selectedAgent === a._id ? 'bg-accent-500/10 text-accent-600' : 'hover:bg-black/5'}`}
                        >
                          <p className="text-sm font-medium">{a.nickname}</p>
                          <p className="text-xs text-ink-muted">UID: {a.uid}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Payment method selection */}
          <div>
            <h3 className="text-sm font-medium text-ink-muted mb-3">Payment Method</h3>
            <div className="grid grid-cols-3 gap-2">
              {enabledMethods.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setPaymentMethod(m.key)}
                  className={`p-4 rounded-xl border-2 text-center transition-colors flex items-center justify-center ${paymentMethod === m.key ? 'border-accent-500 bg-black/10 text-white' : 'border-line-strong bg-surface-sunken'}`}
                >
                  <div className={m.color}>{m.icon}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Currency selection */}
          <div>
            <h3 className="text-sm font-medium text-ink-muted mb-3">Buy</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCurrency('diamond')}
                className={`p-4 rounded-xl border-2 text-center transition-colors ${currency === 'diamond' ? 'border-cyan-500 bg-cyan-600/10' : 'border-line-strong bg-surface-sunken'}`}
              >
                <p className="font-bold text-lg flex items-center justify-center gap-2"><DiamondIcon /> Diamonds</p>
              </button>
              <button
                onClick={() => setCurrency('coin')}
                className={`p-4 rounded-xl border-2 text-center transition-colors ${currency === 'coin' ? 'border-yellow-500 bg-yellow-600/10' : 'border-line-strong bg-surface-sunken'}`}
              >
                <p className="font-bold text-lg flex items-center justify-center gap-2"><CoinIcon /> Coins</p>
              </button>
            </div>
          </div>

          {/* Agent payment info (QR + wallet) */}
          {selectedAgentInfo && agentPayInfo && (agentPayInfo.qrCode || agentPayInfo.walletAddress) ? (
            <div className="bg-surface-sunken rounded-xl p-4 text-center">
              <h3 className="text-sm font-medium mb-3">Pay to {selectedAgentInfo.nickname}</h3>
              <>
                {agentPayInfo?.qrCode && <img src={agentPayInfo.qrCode} alt="QR" className="w-40 h-40 mx-auto object-contain mb-3" />}
                {agentPayInfo?.walletAddress && (
                  <div className="bg-dark-700 rounded-lg p-3">
                    <p className="text-xs text-ink-muted mb-1">Wallet Address</p>
                    <p className="text-sm font-mono break-all">{agentPayInfo.walletAddress}</p>
                  </div>
                )}
              </>
            </div>
          ) : selectedAgentInfo ? (
            <div className="bg-surface-sunken rounded-xl p-4 text-center">
              <p className="text-sm text-ink-muted">
                {selectedAgentInfo.nickname} has not set up {paymentMethod} payment details yet. Contact them directly or choose another agent.
              </p>
            </div>
          ) : null}

          {/* Amount input */}
          <div>
            <h3 className="text-sm font-medium text-ink-muted mb-3">Amount</h3>
            <div className="bg-surface-sunken rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">৳</span>
                <input
                  type="number" min="1" placeholder="Enter amount in BDT"
                  value={amountBdt} onChange={(e) => setAmountBdt(e.target.value)}
                  className="flex-1 bg-dark-700 rounded-lg px-4 py-3 text-lg font-bold focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
              </div>
              {units > 0 && (
                <div className="text-center text-sm" style={{color: currency === 'diamond' ? '#22d3ee' : '#facc15'}}>
                  You will receive <strong className="inline-flex items-center gap-1">{currency === 'diamond' ? <DiamondIcon /> : <CoinIcon />}{totalUnits.toLocaleString()}</strong> {currency}s
                  {bonus > 0 && (
                    <span className="block text-xs text-green-400 mt-1">
                      Including {bonus.toLocaleString()} {currency} bonus ({methods.bonusRate}%)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sender account number (mobile banking) */}
          {['bkash', 'nagad', 'rocket'].includes(paymentMethod) && (
            <div>
              <h3 className="text-sm font-medium text-ink-muted mb-3">Your Sender Account Number</h3>
              <input
                value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full bg-surface-sunken rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
            </div>
          )}

          {/* Screenshot upload */}
          <div>
            <h3 className="text-sm font-medium text-ink-muted mb-3">Payment Screenshot</h3>
            <div className="bg-surface-sunken rounded-xl p-4 text-center">
              {screenshot ? (
                <div>
                  <img src={screenshot} alt="Payment screenshot" className="w-32 h-32 mx-auto object-contain mb-2 rounded-lg" />
                  <button onClick={() => setScreenshot('')} className="text-xs text-red-400">Remove</button>
                </div>
              ) : (
                <div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center justify-center gap-2 mx-auto px-4 py-3 bg-dark-700 rounded-lg text-sm hover:bg-dark-600 transition-colors">
                    <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Screenshot'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Transaction ID */}
          <div>
            <h3 className="text-sm font-medium text-ink-muted mb-3">Transaction ID</h3>
            <input
              value={transactionId} onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Enter payment transaction ID"
              className="w-full bg-surface-sunken rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-600/20 border border-red-600/50 text-red-400 text-sm p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !amountBdt || !transactionId || !screenshot}
            className="w-full py-3 bg-black text-white rounded-xl font-medium disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : (
              <span className="inline-flex items-center gap-1.5">Buy {units.toLocaleString() || 0} {currency === 'diamond' ? <DiamondIcon /> : <CoinIcon />}</span>
            )}
          </button>

          {/* Order history */}
          {orders.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-ink-muted mb-3">My Orders</h3>
              <div className="space-y-2">
                {orders.map((o: any) => (
                  <div key={o._id} className="flex items-center justify-between p-3 bg-surface-sunken rounded-lg">
                    <div>
                      <p className="text-sm">৳{o.amountBdt} {o.diamonds > 0 ? <span className="inline-flex items-center gap-0.5"><DiamondIcon />{o.diamonds}</span> : o.coins > 0 ? <span className="inline-flex items-center gap-0.5"><CoinIcon />{o.coins}</span> : ''}</p>
                      <p className="text-xs text-ink-muted capitalize">{o.paymentMethod} · {typeof o.agentId === 'object' ? o.agentId?.nickname : ''}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${o.status === 'confirmed' ? 'bg-green-600' : o.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'}`}>{o.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <VerificationGateModal
        isOpen={showGate}
        onClose={() => setShowGate(false)}
        type="nid"
        title="NID Verification Required"
        message="NID Verification is required to buy diamonds and recharge. Please verify your Government ID to unlock diamond purchase."
      />
    </div>
  );
};
