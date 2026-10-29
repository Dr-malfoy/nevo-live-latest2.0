import { useEffect, useState, useRef } from 'react';
import {
  PiCaretLeftBold as ArrowLeft,
  PiUploadSimpleBold as Upload,
  PiCheckCircleFill as CheckCircle,
  PiWarningCircleFill as AlertCircle,
  PiLinkBold as Link2,
  PiCaretDownBold as CaretDown,
  PiCopyFill as CopyIcon,
  PiCheckBold as CheckIcon,
  PiShieldCheckFill as ShieldCheck,
  PiLightningFill as Lightning,
  PiHeadsetBold as Headset,
  PiWalletFill,
  PiQrCodeFill,
  PiMagnifyingGlassBold,
} from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { paymentApi } from '../api/payment.api';
import { agencyApi } from '../api/agency.api';
import { useAuthStore } from '../stores';
import { DiamondIcon, CoinIcon } from '../components/ui/CurrencyIcon';
import { VerificationGateModal } from '../components/ui';
import { canUseTradeFeatures } from '../services/verification';
import {
  BkashLogo,
  NagadLogo,
  RocketLogo,
  BinanceLogo,
  BybitLogo,
} from '../components/payment/PaymentLogos';

interface PaymentMethodItem {
  key: string;
  label: string;
  category: 'mobile' | 'crypto' | 'custom';
  subtitle: string;
  color: string;
  bgActive: string;
  logo: React.ReactNode;
  isBD: boolean;
}

const DEFAULT_METHODS: PaymentMethodItem[] = [
  {
    key: 'binance',
    label: 'Binance Pay',
    category: 'crypto',
    subtitle: 'USDT / Crypto Transfer',
    color: '#F3BA2F',
    bgActive: 'bg-amber-50',
    logo: <BinanceLogo className="w-10 h-10 shadow-sm rounded-xl shrink-0" />,
    isBD: false,
  },
  {
    key: 'bybit',
    label: 'Bybit Pay',
    category: 'crypto',
    subtitle: 'Crypto / Web3',
    color: '#F7A600',
    bgActive: 'bg-amber-50',
    logo: <BybitLogo className="w-10 h-10 shadow-sm rounded-xl shrink-0" />,
    isBD: false,
  },
  {
    key: 'bkash',
    label: 'bKash',
    category: 'mobile',
    subtitle: 'Instant Mobile Banking',
    color: '#E2136E',
    bgActive: 'bg-pink-50',
    logo: <BkashLogo className="w-10 h-10 shadow-sm rounded-xl shrink-0" />,
    isBD: true,
  },
  {
    key: 'nagad',
    label: 'Nagad',
    category: 'mobile',
    subtitle: 'Fast Mobile Banking',
    color: '#F7941D',
    bgActive: 'bg-orange-50',
    logo: <NagadLogo className="w-10 h-10 shadow-sm rounded-xl shrink-0" />,
    isBD: true,
  },
  {
    key: 'rocket',
    label: 'Rocket',
    category: 'mobile',
    subtitle: 'DBBL Banking',
    color: '#8C3494',
    bgActive: 'bg-purple-50',
    logo: <RocketLogo className="w-10 h-10 shadow-sm rounded-xl shrink-0" />,
    isBD: true,
  },
];

export interface RechargePackage {
  usd: number;
  diamonds: number;
  bdt: number;
  badge?: string;
  popular?: boolean;
}

export const RECHARGE_PACKAGES: RechargePackage[] = [
  { usd: 0.99, diamonds: 15000, bdt: 121 },
  { usd: 4.99, diamonds: 78000, bdt: 609 },
  { usd: 9.99, diamonds: 156000, bdt: 1219, popular: true, badge: 'Popular' },
  { usd: 19.99, diamonds: 315000, bdt: 2439 },
  { usd: 49.99, diamonds: 790000, bdt: 6099, badge: 'Best Value' },
  { usd: 99.99, diamonds: 1586000, bdt: 12199, badge: 'VIP Pack' },
];

export const Recharge = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { user, updateUser } = useAuthStore();
  const [methods, setMethods] = useState<any>({
    bybitEnabled: true,
    binanceEnabled: true,
    bkashEnabled: true,
    nagadEnabled: true,
    rocketEnabled: true,
    diamondRate: 128,
    dollarRate: 15600,
    usdBdtRate: 122,
    coinRate: 1,
    rechargeRate: 128,
    bonusRate: 0,
  });
  const [customMethods, setCustomMethods] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('official');
  const [agentSearch, setAgentSearch] = useState<string>('');
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState<boolean>(false);
  const [linkedAgentId, setLinkedAgentId] = useState<string>('');
  const [linkedAgentInfo, setLinkedAgentInfo] = useState<any>(null);
  const [currency] = useState<'diamond'>('diamond');
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'BDT'>('USD');
  const [paymentMethod, setPaymentMethod] = useState<string>('binance');
  const [amount, setAmount] = useState<string>('9.99');
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
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    Promise.all([
      paymentApi.getMethods(),
      paymentApi.getCustomMethods(),
      paymentApi.getAgents(),
      paymentApi.getOrders({ limit: 10 }),
    ])
      .then(([m, cm, a, o]: any) => {
        if (m?.data?.success) {
          const cfg = m.data.data;
          setMethods(cfg);
          if (!cfg.binanceEnabled) {
            if (cfg.bybitEnabled) {
              setPaymentMethod('bybit');
              setCurrencyMode('USD');
              setAmount('10');
            } else if (cfg.bkashEnabled) {
              setPaymentMethod('bkash');
              setCurrencyMode('BDT');
              setAmount('1000');
            }
          }
        }
        if (cm?.data?.success) setCustomMethods(cm.data.data);
        if (a?.data?.success) {
          const list = a.data.data || [];
          setAgents(list);
          const official = list.find((ag: any) => ag.isOfficial || ag._id === 'official');
          if (official) {
            setSelectedAgent(official._id);
          } else if (list.length > 0) {
            setSelectedAgent(list[0]._id);
          }
        }
        if (o?.data?.success) setOrders(o.data.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch linked agent info for badge, but keep Nova Agent (Official) as the default selection
  useEffect(() => {
    let cancelled = false;
    agencyApi
      .getMyAgency()
      .then(({ data: d }: any) => {
        if (cancelled) return;
        if (d?.success && d.data?.agentId) {
          const agent = typeof d.data.agentId === 'object' ? d.data.agentId : null;
          const agentId = agent?._id || (typeof d.data.agentId === 'string' ? d.data.agentId : null);
          if (agentId) {
            const full = agents.find((a: any) => a._id === agentId);
            setLinkedAgentInfo(full ? full : { ...(agent || {}), _id: agentId, paymentInfo: {} });
            setLinkedAgentId(agentId);
            if (d.data._id && user?.agencyId !== d.data._id.toString()) {
              updateUser({ agencyId: d.data._id.toString() });
            }
          }
        } else if (d?.success) {
          setLinkedAgentId('');
          setLinkedAgentInfo(null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.agencyId, agents.length]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await client.post('/upload', formData);
      if (data?.success) setScreenshot(data.data?.url || data.data);
    } catch {
      setError('Failed to upload screenshot. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const isBdMethod = (key: string) => {
    if (['bkash', 'nagad', 'rocket', 'bank_bdt'].includes(key)) return true;
    const custom = customMethods.find((cm) => cm.key === key);
    if (custom && (custom.isBD === true || custom.country === 'BD' || custom.currency === 'BDT')) {
      return true;
    }
    return false;
  };

  const isUsdOrder = (o: any) => {
    if (o.currencyMode === 'USD') return true;
    if (o.currencyMode === 'BDT') return false;
    const method = (o.paymentMethod || o.method || '').toLowerCase();
    if (['bkash', 'nagad', 'rocket', 'bank_bdt'].includes(method)) return false;
    if (['binance', 'bybit', 'usdt', 'crypto'].some((m) => method.includes(m))) return true;
    return Boolean(o.amountUsd && !o.amountBdt);
  };

  const handleSelectMethod = (key: string) => {
    setPaymentMethod(key);
    if (isBdMethod(key)) {
      if (currencyMode !== 'BDT') {
        setCurrencyMode('BDT');
        const parsed = parseFloat(amount) || 0;
        const matched = RECHARGE_PACKAGES.find((p) => Math.abs(p.usd - parsed) <= 0.05);
        setAmount(matched ? matched.bdt.toString() : '1219');
      }
    } else {
      if (currencyMode !== 'USD') {
        setCurrencyMode('USD');
        const parsed = parseFloat(amount) || 0;
        const matched = RECHARGE_PACKAGES.find((p) => Math.abs(p.bdt - parsed) <= 3);
        setAmount(matched ? matched.usd.toString() : '9.99');
      }
    }
  };

  const handleToggleCurrency = (mode: 'USD' | 'BDT') => {
    setCurrencyMode(mode);
    if (mode === 'USD') {
      const parsed = parseFloat(amount) || 0;
      const matched = RECHARGE_PACKAGES.find((p) => Math.abs(p.bdt - parsed) <= 3);
      setAmount(matched ? matched.usd.toString() : '9.99');
      if (isBdMethod(paymentMethod)) {
        const firstUsd = enabledMethods.find((m) => !isBdMethod(m.key));
        if (firstUsd) setPaymentMethod(firstUsd.key);
      }
    } else {
      const parsed = parseFloat(amount) || 0;
      const matched = RECHARGE_PACKAGES.find((p) => Math.abs(p.usd - parsed) <= 0.05);
      setAmount(matched ? matched.bdt.toString() : '1219');
      if (!isBdMethod(paymentMethod)) {
        const firstBd = enabledMethods.find((m) => isBdMethod(m.key));
        if (firstBd) setPaymentMethod(firstBd.key);
      }
    }
  };

  const handleSubmit = async () => {
    if (!canUseTradeFeatures(user?.verification, user?.role)) {
      setShowGate(true);
      return;
    }

    if (!selectedAgent) {
      setError('Please select an agent to proceed with payment');
      return;
    }
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError(`Please enter a valid recharge amount in ${currencyMode}`);
      return;
    }
    if (isBdMethod(paymentMethod) && !accountNumber) {
      setError('Please enter your sender account number');
      return;
    }
    if (!transactionId) {
      setError('Please enter your transaction ID / Hash');
      return;
    }
    if (!screenshot) {
      setError('Please upload your payment screenshot as proof');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const isUsd = currencyMode === 'USD';
      let amountUsd = isUsd ? numAmount : Number((numAmount / (methods.usdBdtRate || 122)).toFixed(2));
      let amountBdt = !isUsd ? Math.round(numAmount) : Math.round(numAmount * (methods.usdBdtRate || 122));
      if (matchedPackage) {
        amountUsd = matchedPackage.usd;
        amountBdt = matchedPackage.bdt;
      }

      await paymentApi.createOrder({
        paymentMethod,
        currencyMode,
        amountUsd: isUsd ? amountUsd : undefined,
        amountBdt,
        amount: numAmount,
        screenshot,
        transactionId,
        currency,
        agentId: selectedAgent,
        accountNumber: accountNumber || undefined,
        isOfficial: selectedAgentInfo?.isOfficial || selectedAgent === 'official',
      });
      setSuccess(true);
      setAmount(isUsd ? '9.99' : '1219');
      setTransactionId('');
      setScreenshot('');
      setAccountNumber('');
      const { data } = await paymentApi.getOrders({ limit: 10 });
      if (data?.success) setOrders(data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit recharge order');
    } finally {
      setSubmitting(false);
    }
  };

  // Diamond recharge calculation with exact package matching:
  // $0.99 - 15000 | $4.99 - 78000 | $9.99 - 156000 | $19.99 - 315000 | $49.99 - 790000 | $99.99 - 1586000
  // 1 USD = 122 BDT (১ ডলার = ১২২ টাকা)
  const parsedAmount = parseFloat(amount) || 0;
  const matchedPackage = RECHARGE_PACKAGES.find((pkg) => {
    if (currencyMode === 'USD') {
      return Math.abs(pkg.usd - parsedAmount) <= 0.05;
    } else {
      return Math.abs(pkg.bdt - parsedAmount) <= 3;
    }
  });

  const rate = currencyMode === 'USD' ? (methods.dollarRate || 15600) : (methods.diamondRate || 128);
  const units = matchedPackage ? matchedPackage.diamonds : Math.floor(parsedAmount * rate);
  const bonus =
    methods.bonusRate > 0
      ? Math.floor(units * (methods.bonusRate / 100))
      : 0;
  const totalUnits = units + bonus;

  // Pre-seed official agent if not loaded yet
  const defaultOfficialAgent = {
    _id: 'official',
    uid: 'NOVA-OFFICIAL',
    nickname: 'Nova Agent (Official)',
    isOfficial: true,
    bio: 'Official Nova Live Platform Payment Gateway',
    paymentInfo: {},
  };

  const officialInList = agents.find((a: any) => a.isOfficial || a._id === 'official');
  const baseOfficial = officialInList || defaultOfficialAgent;
  const nonOfficialAgents = agents.filter((a: any) => a._id !== 'official' && !a.isOfficial);

  // Payable agents order: Nova Agent (Official) ALWAYS first, then linked agent, then other agents
  const payableAgents = [
    baseOfficial,
    ...(linkedAgentId && linkedAgentInfo && linkedAgentId !== 'official'
      ? [linkedAgentInfo, ...nonOfficialAgents.filter((a: any) => a._id !== linkedAgentId)]
      : nonOfficialAgents),
  ];

  const selectedAgentInfo =
    payableAgents.find((a: any) => a._id === selectedAgent) || baseOfficial;

  const filteredAgents = payableAgents.filter((a: any) => {
    if (!agentSearch.trim()) return true;
    const q = agentSearch.toLowerCase().trim();
    const nameMatch = a.nickname?.toLowerCase()?.includes(q);
    const uidMatch = a.uid?.toString()?.toLowerCase()?.includes(q);
    const phoneMatch = a.phone?.toString()?.toLowerCase()?.includes(q);
    return nameMatch || uidMatch || phoneMatch;
  });

  // Agent payment details based on method
  const agentPaymentDetails = (() => {
    if (!selectedAgentInfo?.paymentInfo) return null;
    const pi = selectedAgentInfo.paymentInfo;
    if (paymentMethod === 'bybit') return pi.bybit;
    if (paymentMethod === 'binance') return pi.binance;
    if (paymentMethod === 'bkash') return pi.bkash;
    if (paymentMethod === 'nagad') return pi.nagad;
    if (paymentMethod === 'rocket') return pi.rocket;
    return pi[paymentMethod] || null;
  })();

  const agentWalletOrNumber =
    agentPaymentDetails?.walletAddress ||
    agentPaymentDetails?.number ||
    agentPaymentDetails?.phone ||
    agentPaymentDetails?.accountNumber ||
    (typeof agentPaymentDetails === 'string' ? agentPaymentDetails : '') ||
    (isBdMethod(paymentMethod) ? (selectedAgentInfo?.phone || '') : '');

  const agentQrCode = agentPaymentDetails?.qrCode || '';

  const enabledMethods: PaymentMethodItem[] = [
    ...DEFAULT_METHODS.filter((m) => {
      if (m.key === 'bkash') return methods.bkashEnabled;
      if (m.key === 'nagad') return methods.nagadEnabled;
      if (m.key === 'rocket') return methods.rocketEnabled;
      if (m.key === 'binance') return methods.binanceEnabled;
      return methods.bybitEnabled;
    }),
    ...customMethods
      .filter((m) => m.enabled)
      .map((m) => {
        const isBD = m.isBD === true || m.country === 'BD' || m.currency === 'BDT';
        return {
          key: m.key,
          label: m.name,
          category: 'custom' as const,
          subtitle: isBD ? 'BD Mobile Banking' : 'Crypto / Global',
          color: m.color || '#3B82F6',
          bgActive: 'bg-blue-50',
          isBD,
          logo: m.iconUrl ? (
            <img src={m.iconUrl} alt={m.name} className="w-10 h-10 rounded-xl object-contain shadow-sm" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-sm font-bold text-sm">
              <PiWalletFill className="w-6 h-6" />
            </div>
          ),
        };
      }),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-black rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading payment options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16 font-sans">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Recharge & Top Up</h1>
            <p className="text-[11px] font-medium text-slate-500">Official Instant Agency Transfer</p>
          </div>
        </div>

        {/* Current User Balance Pills */}
        <div className="flex items-center gap-1.5">
          <div className="bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <DiamondIcon className="w-3.5 h-3.5 text-cyan-500" />
            <span className="text-xs font-bold text-cyan-900 tabular-nums">
              {user?.diamonds?.toLocaleString() || 0}
            </span>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <CoinIcon className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-amber-900 tabular-nums">
              {user?.coins?.toLocaleString() || 0}
            </span>
          </div>
        </div>
      </header>

      {success ? (
        /* ── Success Screen ────────────────────────────────────────── */
        <div className="max-w-md mx-auto p-6 pt-10 text-center">
          <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500 shadow-sm animate-bounce">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Order Submitted!</h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            Your recharge order has been sent to the agent. Once verified, your Diamonds will be credited immediately.
          </p>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6 text-left space-y-2.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Status</span>
              <span className="font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">Pending Verification</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Amount Paid</span>
              <span className="font-bold text-slate-900">
                {currencyMode === 'USD' ? `$${parsedAmount} USD` : `৳${parsedAmount.toLocaleString()} BDT`}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Payment Method</span>
              <span className="font-semibold text-slate-800 capitalize">{paymentMethod}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Estimated Delivery</span>
              <span className="font-semibold text-slate-800">1 - 5 Minutes</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setSuccess(false)}
              className="w-full py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.99]"
            >
              Submit Another Recharge
            </button>
            <button
              onClick={() => navigate('/wallet')}
              className="w-full py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold text-sm transition-all"
            >
              View My Wallet
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-lg mx-auto p-4 space-y-5">
          {/* ── Currency / Country Mode Selector: USD ($) vs BDT (৳) ──── */}
          <div className="bg-slate-200/80 p-1 rounded-2xl flex gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => handleToggleCurrency('USD')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                currencyMode === 'USD'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🌐 Dollar ($ USD)</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                currencyMode === 'USD' ? 'bg-slate-700 text-amber-300' : 'bg-slate-300 text-slate-700'
              }`}>
                Default
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleCurrency('BDT')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                currencyMode === 'BDT'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🇧🇩 Bangladesh (৳ BDT)</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                currencyMode === 'BDT' ? 'bg-slate-700 text-emerald-300' : 'bg-slate-300 text-slate-700'
              }`}>
                Local
              </span>
            </button>
          </div>

          {/* ── 1. Currency (Diamonds Only) ────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Select Currency
              </label>
              {methods.bonusRate > 0 && (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lightning className="w-3 h-3 text-emerald-500" /> +{methods.bonusRate}% Extra Bonus
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Diamonds Card */}
              <div
                className="relative p-3.5 rounded-2xl border-2 border-cyan-500 bg-white shadow-md shadow-cyan-500/10 ring-2 ring-cyan-500/20 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center border border-cyan-100">
                    <DiamondIcon className="w-6 h-6 text-cyan-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">Diamonds</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">Recharge is exclusively for Diamonds (Gifting & VIP Features)</span>
                  </div>
                </div>
                <span className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs shadow-sm">
                  <CheckIcon className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>

          {/* ── 2. Payment Method Cards with Pictures ──────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Choose Payment Method
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {currencyMode === 'USD' ? 'Global & Crypto Channels' : 'Bangladesh Mobile Banking'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {enabledMethods.map((m) => {
                const isSelected = paymentMethod === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => handleSelectMethod(m.key)}
                    style={{ borderColor: isSelected ? m.color : undefined }}
                    className={`relative p-3 rounded-2xl border-2 transition-all flex items-center gap-2.5 text-left ${
                      isSelected
                        ? `${m.bgActive} shadow-sm ring-2 ring-slate-900/10`
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {m.logo}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{m.label}</p>
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full border ${
                          m.isBD
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {m.isBD ? '৳ BDT' : '$ USD'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium truncate">{m.subtitle}</p>
                    </div>

                    {isSelected && (
                      <div
                        className="absolute top-2 right-2 w-4 h-4 rounded-full text-white flex items-center justify-center text-[10px] shadow-sm"
                        style={{ backgroundColor: m.color }}
                      >
                        <CheckIcon className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 3. Quick Package Selection & Custom Amount ─────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                3. Select Package or Enter Amount ({currencyMode === 'USD' ? '$ USD' : '৳ BDT'})
              </label>
            </div>

            {/* Quick Presets Grid with 6 Packages */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-3">
              {RECHARGE_PACKAGES.map((pkg) => {
                const isSelected = currencyMode === 'USD'
                  ? Math.abs(pkg.usd - parsedAmount) <= 0.05
                  : Math.abs(pkg.bdt - parsedAmount) <= 3;
                return (
                  <button
                    key={pkg.usd}
                    type="button"
                    onClick={() => setAmount(currencyMode === 'USD' ? pkg.usd.toString() : pkg.bdt.toString())}
                    className={`relative p-3 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    {pkg.badge && (
                      <span className={`absolute -top-2 right-2 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                        isSelected ? 'bg-amber-400 text-slate-900' : 'bg-cyan-500 text-white shadow-2xs'
                      }`}>
                        {pkg.badge}
                      </span>
                    )}
                    <p className="text-sm font-black tracking-tight">
                      {currencyMode === 'USD' ? `$${pkg.usd}` : `৳${pkg.bdt.toLocaleString()}`}
                    </p>
                    <p
                      className={`text-xs font-extrabold mt-1 flex items-center justify-center gap-1 ${
                        isSelected ? 'text-cyan-300' : 'text-cyan-600'
                      }`}
                    >
                      <DiamondIcon className="w-3.5 h-3.5 text-cyan-400" />
                      {pkg.diamonds.toLocaleString()} 💎
                    </p>
                    <p className={`text-[10px] mt-0.5 font-medium ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                      {currencyMode === 'USD' ? `≈ ৳${pkg.bdt.toLocaleString()} BDT` : `≈ $${pkg.usd} USD`}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Custom Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <span className="text-slate-500 font-bold text-sm">
                  {currencyMode === 'USD' ? '$ USD' : '৳ BDT'}
                </span>
              </div>
              <input
                type="number"
                min="0.1"
                step={currencyMode === 'USD' ? '0.01' : '1'}
                placeholder={currencyMode === 'USD' ? 'Enter USD amount (e.g. 9.99)' : 'Enter BDT amount (e.g. 1219)'}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-20 pr-4 py-3 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 shadow-sm"
              />
            </div>

            {/* Live Calculation Summary Banner */}
            {parsedAmount > 0 && (
              <div className="mt-3 p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl text-white shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-300 font-medium">You will receive</p>
                  <p className="text-lg font-black flex items-center gap-1.5 text-white">
                    <DiamondIcon className="w-5 h-5 text-cyan-400" />
                    {totalUnits.toLocaleString()}{' '}
                    <span className="text-xs font-semibold text-slate-300">Diamonds</span>
                  </p>
                  {bonus > 0 && (
                    <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                      Includes +{bonus.toLocaleString()} bonus diamonds ({methods.bonusRate}%)
                    </p>
                  )}
                </div>
                <div className="text-right border-l border-slate-700/80 pl-3">
                  <p className="text-[10px] text-slate-400">Exchange Rate</p>
                  <p className="text-xs font-bold text-slate-200">
                    {matchedPackage ? (
                      `${currencyMode === 'USD' ? `$${matchedPackage.usd}` : `৳${matchedPackage.bdt}`} = ${matchedPackage.diamonds.toLocaleString()} 💎`
                    ) : currencyMode === 'USD' ? (
                      `1 USD ≈ ${(methods.dollarRate || 15600).toLocaleString()} 💎`
                    ) : (
                      `1 BDT ≈ ${(methods.diamondRate || 128).toLocaleString()} 💎`
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── 4. Agent Selector with Search ─────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                4. Select Diamond Seller
              </label>
              {selectedAgentInfo?.isOfficial || selectedAgent === 'official' ? (
                <span className="text-[11px] font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-cyan-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" /> Default Official Agent
                </span>
              ) : (selectedAgentInfo?.isDiamondSeller || selectedAgentInfo?.sellerType === 'diamond_seller') ? (
                <span className="text-[11px] font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-cyan-200">
                  💎 Certified Diamond Seller
                </span>
              ) : linkedAgentId && selectedAgent === linkedAgentId ? (
                <span className="text-[11px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-sky-200">
                  <Link2 className="w-3 h-3" /> Linked Agent
                </span>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
                className={`w-full bg-white border rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 flex items-center justify-between shadow-sm transition-all focus:outline-none focus:ring-2 ${
                  selectedAgentInfo?.isOfficial || selectedAgent === 'official'
                    ? 'border-cyan-400 ring-1 ring-cyan-400/30'
                    : 'border-slate-200 hover:border-slate-300 focus:ring-slate-900/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full text-white font-bold text-xs flex items-center justify-center shadow-sm ${
                      selectedAgentInfo?.isOfficial || selectedAgent === 'official'
                        ? 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600'
                        : 'bg-gradient-to-tr from-indigo-500 to-purple-500'
                    }`}
                  >
                    {selectedAgentInfo?.isOfficial || selectedAgent === 'official' ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      selectedAgentInfo?.nickname?.charAt(0)?.toUpperCase() || 'A'
                    )}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-xs">
                        {selectedAgentInfo?.nickname || 'Nova Agent (Official)'}
                      </p>
                      {(selectedAgentInfo?.isOfficial || selectedAgent === 'official') && (
                        <span className="text-[9px] font-black bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded-full border border-cyan-200 uppercase">
                          Official
                        </span>
                      )}
                      {(selectedAgentInfo?.isDiamondSeller || selectedAgentInfo?.sellerType === 'diamond_seller') && (
                        <span className="text-[9px] font-black bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded-full border border-cyan-200 uppercase">
                          💎 Diamond Seller
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      UID: {selectedAgentInfo?.uid || 'NOVA-OFFICIAL'}
                    </p>
                  </div>
                </div>
                <CaretDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    isAgentDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isAgentDropdownOpen && (
                <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-72 flex flex-col overflow-hidden">
                  {/* Search Input Box */}
                  <div className="p-2.5 bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <PiMagnifyingGlassBold className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        value={agentSearch}
                        onChange={(e) => setAgentSearch(e.target.value)}
                        placeholder="Search agent by name or UID..."
                        className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                        autoFocus
                      />
                      {agentSearch && (
                        <button
                          type="button"
                          onClick={() => setAgentSearch('')}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[10px] font-bold text-slate-400 hover:text-slate-600"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Agents Scrollable List */}
                  <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                    {filteredAgents.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 font-medium">
                        No agent found matching "{agentSearch}"
                      </div>
                    ) : (
                      filteredAgents.map((a: any) => {
                        const isOfficial = a.isOfficial || a._id === 'official';
                        const isLinked = linkedAgentId === a._id;
                        const isCurrent = selectedAgent === a._id;
                        return (
                          <button
                            key={a._id}
                            type="button"
                            onClick={() => {
                              setSelectedAgent(a._id);
                              setIsAgentDropdownOpen(false);
                              setAgentSearch('');
                            }}
                            className={`w-full text-left p-3.5 flex items-center justify-between transition-colors ${
                              isCurrent ? 'bg-cyan-50/60 font-bold' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center shadow-sm ${
                                  isOfficial
                                    ? 'bg-gradient-to-tr from-cyan-500 to-blue-600'
                                    : 'bg-slate-700'
                                }`}
                              >
                                {isOfficial ? (
                                  <ShieldCheck className="w-4 h-4" />
                                ) : (
                                  a.nickname?.charAt(0)?.toUpperCase() || 'A'
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-bold text-slate-900">{a.nickname}</p>
                                  {isOfficial && (
                                    <span className="text-[9px] font-extrabold bg-cyan-100 text-cyan-800 px-1.5 py-0.2 rounded-full border border-cyan-200">
                                      Official
                                    </span>
                                  )}
                                  {(a.isDiamondSeller || a.sellerType === 'diamond_seller') && (
                                    <span className="text-[9px] font-extrabold bg-cyan-100 text-cyan-800 px-1.5 py-0.2 rounded-full border border-cyan-200">
                                      💎 Seller
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono">UID: {a.uid}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isLinked && (
                                <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                                  Linked
                                </span>
                              )}
                              {isCurrent && (
                                <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs shadow-sm">
                                  <CheckIcon className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── 5. Payment Details (Official or Selected Agent) ─── */}
          {selectedAgentInfo && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <PiQrCodeFill className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Pay To:{' '}
                    <span className="text-slate-900">{selectedAgentInfo.nickname}</span>
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {(selectedAgentInfo.isOfficial || selectedAgent === 'official') && (
                    <span className="text-[10px] font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full border border-cyan-200">
                      Direct to Admin
                    </span>
                  )}
                  <span className="text-[11px] font-bold text-slate-500 uppercase">{paymentMethod}</span>
                </div>
              </div>

              {agentQrCode && (
                <div className="text-center py-1">
                  <div className="inline-block p-2.5 bg-white border-2 border-dashed border-slate-200 rounded-2xl shadow-sm">
                    <img
                      src={agentQrCode}
                      alt="Agent Payment QR"
                      className="w-36 h-36 object-contain rounded-lg"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Scan QR code with your {paymentMethod} app
                  </p>
                </div>
              )}

              {agentWalletOrNumber ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      {['bkash', 'nagad', 'rocket'].includes(paymentMethod)
                        ? 'Agent Number'
                        : 'Agent Wallet Address'}
                    </p>
                    <p className="text-xs font-mono font-bold text-slate-900 truncate">
                      {agentWalletOrNumber}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(agentWalletOrNumber)}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95"
                  >
                    {copiedText ? (
                      <>
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <p className="text-xs text-amber-800 font-medium">
                    {selectedAgentInfo.nickname} has not provided a specific {paymentMethod} address. You can contact them or choose another agent above.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── 6. Payment Proof & Transaction Details ─────────────── */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
              5. Submit Payment Proof
            </h3>

            {/* Sender Account Number (Mobile Banking) */}
            {isBdMethod(paymentMethod) && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Your Sender Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                />
              </div>
            )}

            {/* Transaction ID */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Transaction ID / TxHash <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. 9J8A7K3L or 0x8a..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
              />
            </div>

            {/* Screenshot Upload */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Payment Screenshot Proof <span className="text-rose-500">*</span>
              </label>

              {screenshot ? (
                <div className="relative border-2 border-emerald-500/40 bg-emerald-50/20 rounded-xl p-3 text-center">
                  <img
                    src={screenshot}
                    alt="Payment proof"
                    className="w-32 h-32 mx-auto object-cover rounded-lg border border-slate-200 shadow-sm mb-2"
                  />
                  <button
                    type="button"
                    onClick={() => setScreenshot('')}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-white border border-rose-200 px-3 py-1 rounded-full shadow-sm transition-colors"
                  >
                    Remove & Re-upload
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 rounded-xl p-5 text-center cursor-pointer transition-all"
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                  />
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center mx-auto mb-2 shadow-sm">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {uploading ? 'Uploading Screenshot...' : 'Click to Upload Payment Screenshot'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                    JPG, PNG or WEBP from your payment app
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Error Banner ────────────────────────────────────────── */}
          {error && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3.5 rounded-xl shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Submit Button ───────────────────────────────────────── */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !amount || !transactionId || !screenshot}
            className="w-full py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-black hover:bg-black text-white rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-slate-900/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting Order...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                Confirm & Recharge {currencyMode === 'USD' ? `$${parsedAmount || 0} USD` : `৳${parsedAmount.toLocaleString() || '0'} BDT`}
              </span>
            )}
          </button>

          {/* ── Trust & Security Badges ─────────────────────────────── */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="flex flex-col items-center p-2 rounded-xl bg-white border border-slate-200 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-500 mb-1" />
              <span className="text-[10px] font-bold text-slate-800">100% Secure</span>
              <span className="text-[9px] text-slate-400">Official Agents</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-xl bg-white border border-slate-200 shadow-sm">
              <Lightning className="w-4 h-4 text-amber-500 mb-1" />
              <span className="text-[10px] font-bold text-slate-800">Fast Credit</span>
              <span className="text-[9px] text-slate-400">1 - 5 mins</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-xl bg-white border border-slate-200 shadow-sm">
              <Headset className="w-4 h-4 text-sky-500 mb-1" />
              <span className="text-[10px] font-bold text-slate-800">24/7 Help</span>
              <span className="text-[9px] text-slate-400">Support Team</span>
            </div>
          </div>

          {/* ── Order History Section ──────────────────────────────── */}
          {orders.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Recent Recharge Orders
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Last 10 Orders</span>
              </div>

              <div className="space-y-2">
                {orders.map((o: any) => {
                  const isConfirmed = o.status === 'confirmed';
                  const isPending = o.status === 'pending';
                  return (
                    <div
                      key={o._id}
                      className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-sm"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>
                            {isUsdOrder(o)
                              ? `$${(o.amountUsd || o.amount)?.toLocaleString()} USD`
                              : `৳${(o.amountBdt || o.amount)?.toLocaleString()} BDT`}
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">→</span>
                          {o.diamonds > 0 ? (
                            <span className="inline-flex items-center gap-1 text-cyan-600 font-bold">
                              <DiamondIcon className="w-3.5 h-3.5 text-cyan-500" />
                              {o.diamonds.toLocaleString()}
                            </span>
                          ) : o.coins > 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
                              <CoinIcon className="w-3.5 h-3.5 text-amber-500" />
                              {o.coins.toLocaleString()}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize mt-0.5">
                          {o.paymentMethod} •{' '}
                          {o.isOfficial || !o.agentId ? 'Nova Agent (Official)' : (typeof o.agentId === 'object' ? o.agentId?.nickname || 'Agent' : 'Agent')} •{' '}
                          {new Date(o.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          isConfirmed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isPending
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {o.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* NID Verification Gate Modal */}
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
