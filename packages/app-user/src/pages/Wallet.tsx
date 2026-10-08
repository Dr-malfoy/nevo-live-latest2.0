import { useEffect, useState } from 'react';
import {
  PiCaretLeftBold as ArrowLeft,
  PiPlusBold as Plus,
  PiDownloadSimpleBold as ArrowDownToLine,
  PiFlagFill as Flag,
  PiCopyFill as Copy,
  PiCheckBold as Check,
  PiArrowsClockwiseBold as RefreshIcon,
  PiReceiptFill as ReceiptIcon,
  PiWalletFill as WalletIcon,
  PiCreditCardFill as CreditCardIcon,
  PiShieldCheckFill as ShieldCheck,
  PiChatDotsBold as ChatIcon,
  PiXBold as XIcon,
  PiArrowUpRightBold as ArrowUpRight,
  PiArrowDownLeftBold as ArrowDownLeft,
  PiCaretRightBold as ChevronRight,
  PiClockFill as ClockIcon,
  PiCheckCircleFill as CheckCircle,
  PiXCircleFill as XCircle,
} from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores';
import client from '../api/client';
import { paymentApi } from '../api/payment.api';
import { chatApi } from '../api/chat.api';
import { ReportModal } from '../components/report/ReportModal';
import { DiamondIcon, CoinIcon } from '../components/ui/CurrencyIcon';
import {
  BkashLogo,
  NagadLogo,
  RocketLogo,
  BinanceLogo,
  BybitLogo,
  UsdtLogo,
} from '../components/payment/PaymentLogos';
import type { Transaction } from '../types';

export const Wallet = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all_orders' | 'recharge' | 'withdraw' | 'history'>('all_orders');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: 'transaction'; id: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);

  const fetchWalletData = async () => {
    try {
      const [t, o, s, u] = await Promise.all([
        client.get('/transactions', { params: { limit: 50 } }),
        client.get('/payment/orders', { params: { limit: 50 } }),
        paymentApi.getWithdrawals({ limit: 50 }),
        client.get('/users/me'),
      ]);
      if (t?.data?.success) setTransactions(t.data.data || []);
      if (o?.data?.success) setOrders(o.data.data || []);
      if (s?.data?.success) setWithdrawals(s.data.data || []);
      if (u?.data?.success && u.data.data) updateUser(u.data.data);
    } catch {}
  };

  useEffect(() => {
    fetchWalletData().finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const copyId = (id: string) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleChatWithAgent = async (agent: any) => {
    const agentUserId = agent?._id || (typeof agent === 'string' ? agent : null);
    if (!agentUserId) return;
    setStartingChat(true);
    try {
      const { data } = await chatApi.getOrCreateChat(agentUserId);
      if (data?.success && data.data?._id) {
        navigate(`/chat/${data.data._id}`);
      }
    } catch (err: any) {
      console.error('Failed to open chat with agent', err);
    } finally {
      setStartingChat(false);
    }
  };

  // Combine and format orders
  const unifiedOrders = [
    ...orders.map((o) => ({
      ...o,
      orderType: 'recharge' as const,
      date: new Date(o.createdAt),
    })),
    ...withdrawals.map((w) => ({
      ...w,
      orderType: 'withdraw' as const,
      date: new Date(w.createdAt),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const filteredOrders =
    activeTab === 'all_orders'
      ? unifiedOrders
      : activeTab === 'recharge'
      ? unifiedOrders.filter((o) => o.orderType === 'recharge')
      : activeTab === 'withdraw'
      ? unifiedOrders.filter((o) => o.orderType === 'withdraw')
      : [];

  const getMethodLogo = (methodKey: string) => {
    const m = (methodKey || '').toLowerCase();
    if (m.includes('bkash')) return <BkashLogo className="w-8 h-8 rounded-xl shrink-0" />;
    if (m.includes('nagad')) return <NagadLogo className="w-8 h-8 rounded-xl shrink-0" />;
    if (m.includes('rocket')) return <RocketLogo className="w-8 h-8 rounded-xl shrink-0" />;
    if (m.includes('binance')) return <BinanceLogo className="w-8 h-8 rounded-xl shrink-0" />;
    if (m.includes('bybit')) return <BybitLogo className="w-8 h-8 rounded-xl shrink-0" />;
    if (m.includes('usdt') || m.includes('trc')) return <UsdtLogo className="w-8 h-8 rounded-xl shrink-0" />;
    return (
      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
        <ReceiptIcon className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16 font-sans">
      {/* ── Sticky Top Header ──────────────────────────────────────── */}
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
            <h1 className="text-base font-bold text-slate-900 leading-tight">My Wallet</h1>
            <p className="text-[11px] font-medium text-slate-500">Balance & Order History</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-all active:scale-95"
          title="Refresh balances"
        >
          <RefreshIcon className={`w-4 h-4 ${refreshing ? 'animate-spin text-slate-900' : ''}`} />
        </button>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-5">
        {/* ── Balance Cards Grid ───────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Diamonds Balance Card */}
          <div className="relative overflow-hidden bg-white border border-cyan-200/80 rounded-2xl p-4 shadow-sm">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-cyan-100/40 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center shadow-xs">
                <DiamondIcon className="w-5 h-5 text-cyan-500" />
              </div>
              <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">
                Gifting
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight">
              {user?.diamonds?.toLocaleString() || 0}
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Diamonds Balance</p>
          </div>

          {/* Coins Balance Card */}
          <div className="relative overflow-hidden bg-white border border-amber-200/80 rounded-2xl p-4 shadow-sm">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-100/40 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shadow-xs">
                <CoinIcon className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Earnings
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight">
              {user?.coins?.toLocaleString() || 0}
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Coins Balance</p>
          </div>
        </div>

        {/* ── Quick Action Buttons ─────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/recharge')}
            className="py-3.5 px-4 bg-gradient-to-r from-slate-900 via-slate-800 to-black hover:bg-black text-white rounded-2xl font-bold text-sm shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Buy / Recharge</span>
          </button>

          <button
            onClick={() => navigate('/withdraw')}
            className="py-3.5 px-4 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50 rounded-2xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <ArrowDownToLine className="w-4 h-4 text-amber-600" />
            <span>Withdraw Coins</span>
          </button>
        </div>

        {/* ── Payout Methods Quick Banner ──────────────────────────── */}
        <div
          onClick={() => navigate('/withdraw-methods')}
          className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between shadow-sm cursor-pointer hover:border-slate-300 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <CreditCardIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Withdraw & Payout Methods</p>
              <p className="text-[11px] text-slate-500 font-medium">Link bKash, Nagad, Rocket or USDT</p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            Manage →
          </span>
        </div>

        {/* ── Orders & Financial History Section ───────────────────── */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Orders & Transaction Records
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">Tap order for full info</span>
          </div>

          {/* Segmented Filter Pills */}
          <div className="bg-slate-200/70 p-1 rounded-2xl flex gap-1 mb-3">
            <button
              onClick={() => setActiveTab('all_orders')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'all_orders'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All Orders</span>
              {unifiedOrders.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === 'all_orders' ? 'bg-slate-100 text-slate-900' : 'bg-slate-300 text-slate-700'
                }`}>
                  {unifiedOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('recharge')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'recharge'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Recharges</span>
              {orders.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === 'recharge' ? 'bg-slate-100 text-slate-900' : 'bg-slate-300 text-slate-700'
                }`}>
                  {orders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'withdraw'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Withdrawals</span>
              {withdrawals.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === 'withdraw' ? 'bg-slate-100 text-slate-900' : 'bg-slate-300 text-slate-700'
                }`}>
                  {withdrawals.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Ledger</span>
              {transactions.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === 'history' ? 'bg-slate-100 text-slate-900' : 'bg-slate-300 text-slate-700'
                }`}>
                  {transactions.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Content List ─────────────────────────────────────────── */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-black rounded-full animate-spin" />
            <p className="text-slate-400 text-xs font-medium">Loading wallet records...</p>
          </div>
        ) : activeTab === 'history' ? (
          /* ── Ledger Transactions Tab ─────────────────────────────── */
          transactions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <ReceiptIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">No Transactions Found</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                All your coin and diamond transfers, gifts, and game records will be listed here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {transactions.map((tx) => {
                const displayId = tx.txId || tx._id;
                const isCopied = copiedId === displayId;
                const isDeduct = ['gift_send', 'withdraw', 'coin_sale', 'game_bet'].includes(tx.type);

                return (
                  <div
                    key={tx._id}
                    onClick={() => navigate(`/transactions/${tx._id}`)}
                    className="p-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl shadow-sm transition-all cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-slate-700">
                          {displayId.slice(0, 10)}...
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyId(displayId);
                          }}
                          className={`p-1 rounded-md transition-colors ${
                            isCopied
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                          }`}
                          title="Copy Transaction ID"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <span
                        className={`text-sm font-black tabular-nums ${
                          isDeduct ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {isDeduct ? '-' : '+'}
                        {tx.amount?.toLocaleString()}
                        <span className="text-[10px] ml-1 uppercase font-bold text-slate-400">
                          {tx.currency}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <p className="font-semibold capitalize text-slate-800">
                        {tx.type?.replace(/_/g, ' ')}
                      </p>
                      <p className="tabular-nums text-[11px] text-slate-400">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {tx.description && (
                      <p className="text-[11px] text-slate-500 truncate pt-0.5 border-t border-slate-100">
                        {tx.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ── Orders (All / Recharge / Withdraw) ───────────────────── */
          filteredOrders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <ReceiptIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">No Orders Found</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {activeTab === 'withdraw'
                  ? 'You have not submitted any withdrawal requests yet.'
                  : 'You have not submitted any recharge or withdrawal orders yet.'}
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={() => navigate('/recharge')}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Buy Diamonds
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredOrders.map((o: any) => {
                const isRecharge = o.orderType === 'recharge';
                const isConfirmed = o.status === 'confirmed' || o.status === 'paid';
                const isPending = o.status === 'pending';
                const isApproved = o.status === 'approved';
                const agent = typeof o.agentId === 'object' ? o.agentId : null;
                const methodName = o.paymentMethod || o.method || 'Transfer';

                return (
                  <div
                    key={o._id}
                    onClick={() => setSelectedOrder(o)}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-3.5 shadow-sm space-y-2.5 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {getMethodLogo(methodName)}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 capitalize">
                              {isRecharge ? 'Recharge' : 'Withdrawal'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">({methodName})</span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {new Date(o.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isConfirmed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isApproved
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : isPending
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {o.status}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>

                    {/* Amount Info */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <span className="font-semibold text-slate-500">
                        {isRecharge ? 'Amount Paid' : 'Cashout Value'}
                      </span>
                      <span className="font-black text-slate-900 tabular-nums">
                        ৳{o.amountBdt?.toLocaleString()} BDT
                      </span>
                    </div>

                    {/* Units & Agent Row */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <div className="flex items-center gap-1 font-bold">
                        {isRecharge ? (
                          o.diamonds > 0 ? (
                            <span className="inline-flex items-center gap-1 text-cyan-600 font-black">
                              <DiamondIcon className="w-3.5 h-3.5 text-cyan-500" />
                              +{o.diamonds.toLocaleString()} Diamonds
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600 font-black">
                              <CoinIcon className="w-3.5 h-3.5 text-amber-500" />
                              +{o.coins?.toLocaleString()} Coins
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-black">
                            <CoinIcon className="w-3.5 h-3.5 text-amber-500" />
                            -{o.amount?.toLocaleString()} {o.currency || 'Coins'}
                          </span>
                        )}
                      </div>

                      {agent?.nickname && (
                        <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                          Agent: {agent.nickname}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── Security Trust Footer ────────────────────────────────── */}
        <div className="p-3 bg-white border border-slate-200 rounded-2xl text-center flex items-center justify-center gap-2 shadow-xs text-slate-500 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Encrypted financial ledger & secure agent network</span>
        </div>
      </div>

      {/* ── FULL ORDER DETAILS MODAL WITH AGENT CHAT SHORTCUT ──────── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="relative bg-white rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-100 animate-slide-up">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-white ${
                  selectedOrder.orderType === 'recharge' ? 'bg-cyan-500' : 'bg-amber-500'
                }`}>
                  {selectedOrder.orderType === 'recharge' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {selectedOrder.orderType === 'recharge' ? 'Recharge Order Details' : 'Withdrawal Request Details'}
                  </h3>
                  <p className="text-[10px] text-slate-400">Order ID: {selectedOrder._id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                aria-label="Close"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Status Banner */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                selectedOrder.status === 'confirmed' || selectedOrder.status === 'paid'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : selectedOrder.status === 'approved'
                  ? 'bg-sky-50/70 border-sky-200 text-sky-900'
                  : selectedOrder.status === 'pending'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center gap-3">
                  {selectedOrder.status === 'confirmed' || selectedOrder.status === 'paid' ? (
                    <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
                  ) : selectedOrder.status === 'approved' ? (
                    <CheckCircle className="w-6 h-6 text-sky-500 shrink-0" />
                  ) : selectedOrder.status === 'pending' ? (
                    <ClockIcon className="w-6 h-6 text-amber-500 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-500 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">
                      {selectedOrder.status === 'confirmed'
                        ? 'Payment Confirmed & Credited'
                        : selectedOrder.status === 'paid'
                        ? 'Withdrawal Paid by Agent'
                        : selectedOrder.status === 'approved'
                        ? 'Approved (Processing Payout)'
                        : selectedOrder.status === 'pending'
                        ? 'Pending Agent Review'
                        : 'Order Rejected'}
                    </p>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {new Date(selectedOrder.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Payment Channel</span>
                  <span className="font-bold text-slate-900 capitalize flex items-center gap-1.5">
                    {selectedOrder.paymentMethod || selectedOrder.method}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">BDT Amount</span>
                  <span className="font-black text-slate-900 text-sm tabular-nums">
                    ৳{selectedOrder.amountBdt?.toLocaleString()} BDT
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">
                    {selectedOrder.orderType === 'recharge' ? 'Units Credited' : 'Coins Debited'}
                  </span>
                  <span className="font-black text-slate-900">
                    {selectedOrder.orderType === 'recharge' ? (
                      selectedOrder.diamonds > 0 ? (
                        <span className="inline-flex items-center gap-1 text-cyan-600">
                          <DiamondIcon className="w-3.5 h-3.5 text-cyan-500" />
                          +{selectedOrder.diamonds?.toLocaleString()} Diamonds
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <CoinIcon className="w-3.5 h-3.5 text-amber-500" />
                          +{selectedOrder.coins?.toLocaleString()} Coins
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <CoinIcon className="w-3.5 h-3.5 text-amber-500" />
                        -{selectedOrder.amount?.toLocaleString()} {selectedOrder.currency || 'Coins'}
                      </span>
                    )}
                  </span>
                </div>

                {selectedOrder.accountNumber && (
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                    <span className="text-slate-500 font-medium">
                      {selectedOrder.orderType === 'recharge' ? 'Sender Phone' : 'Recipient Account'}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedOrder.accountNumber}
                    </span>
                  </div>
                )}

                {selectedOrder.transactionId && (
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                    <span className="text-slate-500 font-medium">Transaction ID</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-slate-800">
                        {selectedOrder.transactionId}
                      </span>
                      <button
                        onClick={() => copyId(selectedOrder.transactionId)}
                        className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                        title="Copy TxID"
                      >
                        {copiedId === selectedOrder.transactionId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Proof Screenshot (if available) */}
              {selectedOrder.screenshot && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Payment Screenshot Proof
                  </label>
                  <div className="border border-slate-200 rounded-2xl p-2 bg-slate-50 text-center">
                    <img
                      src={selectedOrder.screenshot}
                      alt="Payment proof screenshot"
                      className="max-h-48 mx-auto object-contain rounded-xl shadow-xs"
                    />
                  </div>
                </div>
              )}

              {/* ── AGENT INFORMATION & CHAT SHORTCUT ───────────────── */}
              {selectedOrder.agentId && (
                <div className="bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 border border-indigo-200/70 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                        {typeof selectedOrder.agentId === 'object'
                          ? selectedOrder.agentId?.nickname?.charAt(0)?.toUpperCase()
                          : 'A'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900">
                            {typeof selectedOrder.agentId === 'object'
                              ? selectedOrder.agentId?.nickname
                              : 'Official Agent'}
                          </p>
                          <span className="text-[9px] font-extrabold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-full uppercase">
                            Agent
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono font-medium">
                          Agent UID: {typeof selectedOrder.agentId === 'object' ? selectedOrder.agentId?.uid || '—' : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Direct Chat Shortcut Button */}
                  <button
                    type="button"
                    onClick={() => handleChatWithAgent(selectedOrder.agentId)}
                    disabled={startingChat}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <ChatIcon className="w-4 h-4" />
                    <span>{startingChat ? 'Opening Conversation...' : 'Message / Chat with Agent'}</span>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                {selectedOrder.status === 'pending' && (
                  <button
                    onClick={() => {
                      setReportTarget({ type: 'transaction', id: selectedOrder._id });
                      setSelectedOrder(null);
                    }}
                    className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report Order Issue</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportTarget && (
        <ReportModal
          targetType="transaction"
          targetId={reportTarget.id}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
};
