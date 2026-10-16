import { useEffect, useState, useRef } from 'react';
import {
  ArrowRight,
  UserCheck,
  ShieldCheck,
  Sparkles,
  Search,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Eye,
  X,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  ShoppingCart,
  Handshake,
  Send,
} from 'lucide-react';
import { adminApi } from '../api';
import { DiamondIcon, CoinIcon } from '../components/CurrencyIcon';
import { getMediaUrl } from '../lib/media';

const RATE_PER_BDT = 130; // 130 Coins = 1 BDT, 130 Diamonds = 1 BDT

export const AdminWallet = () => {
  // Navigation Tabs: 'transactions' (default) | 'orders' (buy) | 'withdrawals' (withdraw) | 'transfer' (send currency)
  const [activeTab, setActiveTab] = useState<'transactions' | 'orders' | 'withdrawals' | 'transfer'>('transactions');

  // Platform Wallet reserve data
  const [wallet, setWallet] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [reserveLoading, setReserveLoading] = useState(true);

  // All Wallet Transactions State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txStats, setTxStats] = useState<any>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txTotalCount, setTxTotalCount] = useState(0);

  // Filters for Transactions
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'buy' | 'withdraw' | 'transfer' | 'game' | 'reward'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Selected Transaction for Details Modal
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Limitless Transfer Form State
  const [targetId, setTargetId] = useState('');
  const [currency, setCurrency] = useState<'diamond' | 'coin'>('diamond');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState<any>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferMsg, setTransferMsg] = useState('');
  const [transferErr, setTransferErr] = useState('');
  const lookupTimeoutRef = useRef<any>(null);

  // Buy Orders State (for Buy tab)
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');

  // Withdrawals State (for Withdraw tab)
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [withdrawalsTotalPages, setWithdrawalsTotalPages] = useState(1);
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState('');

  // Load Platform Reserve
  const loadReserve = async () => {
    setReserveLoading(true);
    try {
      const [w, a] = await Promise.all([adminApi.getWallet(), adminApi.getAgents()]);
      if (w?.data?.success) {
        setWallet(w.data.data?.wallet);
        setHistory(w.data.data?.history || []);
      }
      if (a?.data?.success) setAgents(a.data.data?.agents || []);
    } catch {
    } finally {
      setReserveLoading(false);
    }
  };

  // Load Wallet Transactions with search & filters
  const loadTransactions = async () => {
    setTxLoading(true);
    try {
      const params: any = {
        page: txPage,
        limit: 20,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (currencyFilter) params.currency = currencyFilter;
      if (statusFilter) params.status = statusFilter;

      const { data } = await adminApi.getTransactions(params);
      if (data?.success) {
        setTransactions(data.data || []);
        setTxStats(data.stats || null);
        setTxTotalPages(data.pagination?.totalPages || 1);
        setTxTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setTxLoading(false);
    }
  };

  // Load Buy Orders
  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const params: any = { page: ordersPage, limit: 20 };
      if (orderStatusFilter) params.status = orderStatusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const { data } = await adminApi.getOrders(params);
      if (data?.success) {
        setOrders(data.data || []);
        setOrdersTotalPages(data.pagination?.totalPages || 1);
      }
    } catch {} finally {
      setOrdersLoading(false);
    }
  };

  // Load Withdrawals
  const loadWithdrawals = async () => {
    setWithdrawalsLoading(true);
    try {
      const params: any = { page: withdrawalsPage, limit: 20 };
      if (withdrawalStatusFilter) params.status = withdrawalStatusFilter;
      const { data } = await adminApi.getWithdrawalRequests(params);
      if (data?.success) {
        setWithdrawals(data.data || []);
        setWithdrawalsTotalPages(data.pagination?.totalPages || 1);
      }
    } catch {} finally {
      setWithdrawalsLoading(false);
    }
  };

  useEffect(() => {
    loadReserve();
  }, []);

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    } else if (activeTab === 'orders') {
      loadOrders();
    } else if (activeTab === 'withdrawals') {
      loadWithdrawals();
    }
  }, [activeTab, txPage, categoryFilter, currencyFilter, statusFilter, ordersPage, orderStatusFilter, withdrawalsPage, withdrawalStatusFilter]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'transactions') {
      setTxPage(1);
      loadTransactions();
    } else if (activeTab === 'orders') {
      setOrdersPage(1);
      loadOrders();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (activeTab === 'transactions') {
      setTxPage(1);
      setTimeout(loadTransactions, 50);
    } else if (activeTab === 'orders') {
      setOrdersPage(1);
      setTimeout(loadOrders, 50);
    }
  };

  // Copy TX ID
  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Recipient Lookup for Limitless Transfer
  useEffect(() => {
    const cleanId = targetId.trim();
    if (!cleanId) {
      setRecipient(null);
      setLookupError('');
      return;
    }

    if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);

    lookupTimeoutRef.current = setTimeout(async () => {
      setLookingUp(true);
      setLookupError('');
      try {
        const { data } = await adminApi.lookupUser(cleanId);
        if (data?.success && data?.data) {
          setRecipient(data.data);
          setLookupError('');
        } else {
          setRecipient(null);
          setLookupError('User / Agent not found');
        }
      } catch (e: any) {
        setRecipient(null);
        setLookupError(e.response?.data?.error || 'User / Agent not found');
      } finally {
        setLookingUp(false);
      }
    }, 400);

    return () => {
      if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);
    };
  }, [targetId]);

  const handleSelectAgent = (agent: any) => {
    if (!agent) {
      setTargetId('');
      setRecipient(null);
      return;
    }
    setTargetId(agent.uid || agent._id);
    setRecipient(agent);
    setLookupError('');
  };

  const handleAddAmount = (add: number) => {
    const current = parseInt(amount) || 0;
    setAmount(String(current + add));
  };

  const handleTransfer = async () => {
    const cleanId = targetId.trim();
    const numAmount = parseInt(amount, 10);

    if (!cleanId) {
      setTransferErr('Please enter a User ID (UID), Agent ID, or select an Agent');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setTransferErr('Please enter a valid positive amount');
      return;
    }

    setTransferSaving(true);
    setTransferMsg('');
    setTransferErr('');
    try {
      const res = await adminApi.transferCurrency({
        targetId: cleanId,
        currency,
        amount: numAmount,
      });

      const updatedRecipient = res.data.data?.recipient;
      setTransferMsg(
        `Successfully sent ${numAmount.toLocaleString()} ${currency}s to ${
          updatedRecipient?.nickname || recipient?.nickname || cleanId
        } (UID: ${updatedRecipient?.uid || cleanId})!`
      );
      setAmount('');
      if (updatedRecipient) {
        setRecipient(updatedRecipient);
      }
      loadReserve();
      loadTransactions();
    } catch (err: any) {
      setTransferErr(err.response?.data?.error || 'Transfer failed. Please check the recipient ID.');
    } finally {
      setTransferSaving(false);
    }
  };

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'agent':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'host':
        return 'bg-pink-500/20 text-pink-400 border-pink-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  const categoryBadge = (type: string, category?: string) => {
    if (type === 'recharge' || type === 'agent_recharge' || category === 'buy') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <ArrowDownLeft className="w-3 h-3 text-emerald-400" /> Buy / Recharge
        </span>
      );
    }
    if (type === 'withdraw' || type === 'coin_sale' || category === 'withdraw') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <ArrowUpRight className="w-3 h-3 text-amber-400" /> Withdraw
        </span>
      );
    }
    if (type === 'transfer' || type === 'transfer_in' || category === 'transfer') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          <ArrowLeftRight className="w-3 h-3 text-indigo-400" /> Transfer
        </span>
      );
    }
    if (type === 'game_win' || type === 'game_bet' || category === 'game') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
          🎮 Game
        </span>
      );
    }
    if (type?.includes('reward') || type === 'ranking_prize' || category === 'reward') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30">
          🎁 Reward
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-dark-700 text-dark-300 border border-dark-600 capitalize">
        {type?.replace('_', ' ') || 'Other'}
      </span>
    );
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'confirmed':
      case 'paid':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
            Completed
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            Pending
          </span>
        );
      case 'failed':
      case 'rejected':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            {status}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-dark-700 text-dark-300">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2.5 text-white">
            <Wallet className="w-7 h-7 text-primary-400" /> Platform Wallet & Transactions
          </h2>
          <p className="text-sm text-dark-400 mt-1">
            Search, inspect, and verify all wallet transactions (Buy, Withdraw, Transfers) by Transaction ID with 130:1 BDT valuation.
          </p>
        </div>

        <button
          onClick={() => {
            loadReserve();
            if (activeTab === 'transactions') loadTransactions();
            else if (activeTab === 'orders') loadOrders();
            else if (activeTab === 'withdrawals') loadWithdrawals();
          }}
          disabled={reserveLoading || txLoading}
          className="flex items-center gap-2 px-3.5 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-xl text-sm font-semibold text-dark-200 transition-colors self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${(reserveLoading || txLoading) ? 'animate-spin text-primary-400' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Summary & Metrics Bar ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Wallet Transactions */}
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-dark-400">Total Transactions</span>
            <div className="w-8 h-8 rounded-xl bg-dark-700/80 flex items-center justify-center text-primary-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white tabular-nums">
            {(txStats?.totalTransactions ?? txTotalCount).toLocaleString()}
          </p>
          <p className="text-[11px] text-dark-400 mt-1">Recorded in central ledger</p>
        </div>

        {/* Buy / Recharge Volume */}
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Buy / Recharges</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 tabular-nums">
            {(txStats?.totalBuys ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-dark-400 mt-1">Deposit purchases executed</p>
        </div>

        {/* Withdraw Volume */}
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Total Withdrawals</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400 tabular-nums">
            {(txStats?.totalWithdraws ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-dark-400 mt-1">Cashout requests processed</p>
        </div>

        {/* Platform Reserve Balances */}
        <div className="bg-gradient-to-br from-primary-950/40 via-dark-800 to-dark-800 border border-primary-500/30 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-300">Platform Reserves</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
              LIMITLESS
            </span>
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <div>
              <p className="text-xs text-dark-400">Diamonds</p>
              <p className="text-lg font-bold text-cyan-400 tabular-nums flex items-center gap-1">
                <DiamondIcon className="w-3.5 h-3.5" />
                {wallet?.diamonds?.toLocaleString() ?? '0'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-dark-400">Coins (130:1)</p>
              <p className="text-lg font-bold text-yellow-400 tabular-nums flex items-center gap-1 justify-end">
                <CoinIcon className="w-3.5 h-3.5" />
                {wallet?.coins?.toLocaleString() ?? '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Tab Navigation ────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-dark-700 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => { setActiveTab('transactions'); setTxPage(1); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
            activeTab === 'transactions'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
              : 'bg-dark-800 hover:bg-dark-700 text-dark-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>All Wallet Transactions</span>
          {txTotalCount > 0 && (
            <span className="text-xs px-2 py-0.2 rounded-full bg-black/30">
              {txTotalCount.toLocaleString()}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('orders'); setOrdersPage(1); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
            activeTab === 'orders'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
              : 'bg-dark-800 hover:bg-dark-700 text-dark-300'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Buy / Recharge Orders</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('withdrawals'); setWithdrawalsPage(1); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
            activeTab === 'withdrawals'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
              : 'bg-dark-800 hover:bg-dark-700 text-dark-300'
          }`}
        >
          <Handshake className="w-4 h-4" />
          <span>Withdrawal Requests</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transfer')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
            activeTab === 'transfer'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
              : 'bg-dark-800 hover:bg-dark-700 text-dark-300'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Send / Issue Currency</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: ALL WALLET TRANSACTIONS & TX ID SEARCH ───────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Search & Filter Header Bar */}
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-4 shadow-sm space-y-3">
            {/* Search Input Form */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Transaction ID (e.g. TRX123456, DEP..., WTH...), User UID, Phone, or Nickname..."
                  className="w-full bg-dark-900 border border-dark-600 rounded-xl pl-10 pr-24 py-3 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-mono"
                />
                <Search className="w-4 h-4 text-dark-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-20 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white p-1"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Filter Pills */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-dark-700/60">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-dark-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Type:
                </span>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'buy', label: 'Buy / Recharge' },
                  { key: 'withdraw', label: 'Withdraw' },
                  { key: 'transfer', label: 'Transfers' },
                  { key: 'game', label: 'Games' },
                  { key: 'reward', label: 'Rewards' },
                ].map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(c.key as any);
                      setTxPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      categoryFilter === c.key
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-dark-700 hover:bg-dark-600 text-dark-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Currency & Status Dropdowns */}
              <div className="flex items-center gap-2">
                <select
                  value={currencyFilter}
                  onChange={(e) => { setCurrencyFilter(e.target.value); setTxPage(1); }}
                  aria-label="Filter by Currency"
                  className="bg-dark-700 border border-dark-600 rounded-lg px-2.5 py-1.5 text-xs text-dark-200 focus:outline-none focus:border-primary-500"
                >
                  <option value="">All Currencies</option>
                  <option value="coin">Coins (🪙 130:1)</option>
                  <option value="diamond">Diamonds (💎 130:1)</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setTxPage(1); }}
                  aria-label="Filter by Status"
                  className="bg-dark-700 border border-dark-600 rounded-lg px-2.5 py-1.5 text-xs text-dark-200 focus:outline-none focus:border-primary-500"
                >
                  <option value="">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden shadow-lg">
            {txLoading ? (
              <div className="p-12 text-center text-dark-400 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-7 h-7 animate-spin text-primary-400" />
                <span className="text-sm font-medium">Loading wallet transactions...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center text-dark-400 space-y-2">
                <FileText className="w-10 h-10 mx-auto text-dark-500" />
                <p className="text-base font-bold text-white">No transactions found</p>
                <p className="text-xs text-dark-400 max-w-sm mx-auto">
                  {searchQuery ? `No transaction matches "${searchQuery}". Try searching by a different Transaction ID or UID.` : 'No transactions recorded under the current filters.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="mt-2 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-xs font-semibold text-white rounded-lg transition-colors"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700 bg-dark-900/60">
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Transaction ID</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Type</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">User / Actor</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Amount</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Valuation (130:1 BDT)</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Status</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Date & Time</th>
                      <th className="text-right px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/50">
                    {transactions.map((t: any) => {
                      const userObj = typeof t.userId === 'object' ? t.userId : null;
                      const isDiamond = t.currency === 'diamond';
                      const bdtVal = t.bdtValue ?? (t.amount ? t.amount / RATE_PER_BDT : 0);

                      return (
                        <tr key={t._id} className="hover:bg-dark-700/30 transition-colors">
                          {/* Transaction ID */}
                          <td className="px-5 py-3.5 text-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-white tracking-wide">
                                {t.txId || t._id?.slice(-8)?.toUpperCase()}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(t.txId || t._id)}
                                className="text-dark-500 hover:text-white p-1 rounded transition-colors"
                                title="Copy TX ID"
                              >
                                {copiedId === (t.txId || t._id) ? (
                                  <Check className="w-3.5 h-3.5 text-green-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Type Badge */}
                          <td className="px-5 py-3.5 text-sm">
                            {categoryBadge(t.type, t.category)}
                          </td>

                          {/* User Info */}
                          <td className="px-5 py-3.5 text-sm">
                            {userObj ? (
                              <div className="flex items-center gap-2.5">
                                {userObj.avatar ? (
                                  <img
                                    src={getMediaUrl(userObj.avatar)}
                                    alt={userObj.nickname}
                                    className="w-8 h-8 rounded-full object-cover border border-dark-600"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary-600/20 text-primary-300 font-bold flex items-center justify-center text-xs">
                                    {userObj.nickname?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-white leading-tight">{userObj.nickname || 'Unknown'}</p>
                                  <p className="text-[11px] text-dark-400 font-mono">UID: {userObj.uid || '—'}</p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-dark-400 text-xs font-mono">{String(t.userId || '—')}</span>
                            )}
                          </td>

                          {/* Amount */}
                          <td className="px-5 py-3.5 text-sm font-bold font-mono">
                            <span className={`inline-flex items-center gap-1 ${isDiamond ? 'text-cyan-400' : 'text-yellow-400'}`}>
                              {isDiamond ? <DiamondIcon className="w-3.5 h-3.5" /> : <CoinIcon className="w-3.5 h-3.5" />}
                              {t.amount?.toLocaleString()}
                            </span>
                          </td>

                          {/* BDT Valuation */}
                          <td className="px-5 py-3.5 text-sm font-bold font-mono text-emerald-400">
                            ≈ ৳{bdtVal.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5 text-sm">
                            {statusBadge(t.status)}
                          </td>

                          {/* Date & Time */}
                          <td className="px-5 py-3.5 text-xs text-dark-400 whitespace-nowrap">
                            {new Date(t.createdAt).toLocaleString()}
                          </td>

                          {/* Action Button */}
                          <td className="px-5 py-3.5 text-right text-sm">
                            <button
                              type="button"
                              onClick={() => setSelectedTx(t)}
                              className="px-2.5 py-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-dark-200 hover:text-white text-xs font-semibold transition-colors inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {txTotalPages > 1 && (
              <div className="p-4 border-t border-dark-700 flex items-center justify-between">
                <span className="text-xs text-dark-400">
                  Page {txPage} of {txTotalPages} ({txTotalCount.toLocaleString()} total transactions)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={txPage <= 1 || txLoading}
                    onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 disabled:opacity-40 text-dark-300 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 bg-dark-700 rounded-lg text-xs font-bold text-white font-mono">
                    {txPage}
                  </span>
                  <button
                    disabled={txPage >= txTotalPages || txLoading}
                    onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))}
                    className="p-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 disabled:opacity-40 text-dark-300 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: BUY / RECHARGE ORDERS (PURCHASE ORDERS) ──────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-dark-800 border border-dark-700 rounded-2xl p-4">
            <h3 className="text-base font-bold text-white">Buy / Recharge Orders</h3>
            <div className="flex gap-1.5">
              {['', 'pending', 'confirmed', 'rejected'].map((st) => (
                <button
                  key={st}
                  onClick={() => { setOrderStatusFilter(st); setOrdersPage(1); }}
                  className={`text-xs px-3 py-1.5 rounded-lg capitalize font-semibold transition-colors ${
                    orderStatusFilter === st ? 'bg-primary-600 text-white' : 'bg-dark-700 hover:bg-dark-600 text-dark-300'
                  }`}
                >
                  {st || 'All Orders'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden shadow-lg">
            {ordersLoading ? (
              <div className="p-12 text-center text-dark-400 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-7 h-7 animate-spin text-primary-400" />
                <span className="text-sm">Loading purchase orders...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center text-dark-400">No purchase orders found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700 bg-dark-900/60">
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Order / TX ID</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">User</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Method</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Amount (BDT)</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Credited Units</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Status</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/50">
                    {orders.map((o: any) => {
                      const userObj = typeof o.userId === 'object' ? o.userId : null;
                      return (
                        <tr key={o._id} className="hover:bg-dark-700/30 transition-colors">
                          <td className="px-5 py-3.5 text-sm font-mono font-bold text-white">
                            {o.transactionId || o.orderId || o._id?.slice(-8)}
                          </td>
                          <td className="px-5 py-3.5 text-sm">
                            <span className="text-white font-medium">{userObj?.nickname || userObj?.uid || '—'}</span>
                          </td>
                          <td className="px-5 py-3.5 text-sm capitalize text-dark-300">
                            {o.paymentMethod}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-bold text-emerald-400 font-mono">
                            ৳{o.amountBdt?.toLocaleString()} BDT
                          </td>
                          <td className="px-5 py-3.5 text-sm font-bold font-mono">
                            {o.diamonds > 0 ? (
                              <span className="text-cyan-400 flex items-center gap-1"><DiamondIcon className="w-3.5 h-3.5" />+{o.diamonds?.toLocaleString()}</span>
                            ) : (
                              <span className="text-yellow-400 flex items-center gap-1"><CoinIcon className="w-3.5 h-3.5" />+{o.coins?.toLocaleString()}</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-sm">{statusBadge(o.status)}</td>
                          <td className="px-5 py-3.5 text-xs text-dark-400">{new Date(o.createdAt).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: WITHDRAWAL REQUESTS (CASHOUT) ────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-dark-800 border border-dark-700 rounded-2xl p-4">
            <h3 className="text-base font-bold text-white">Withdrawal Requests</h3>
            <div className="flex gap-1.5">
              {['', 'pending', 'approved', 'rejected', 'paid'].map((st) => (
                <button
                  key={st}
                  onClick={() => { setWithdrawalStatusFilter(st); setWithdrawalsPage(1); }}
                  className={`text-xs px-3 py-1.5 rounded-lg capitalize font-semibold transition-colors ${
                    withdrawalStatusFilter === st ? 'bg-primary-600 text-white' : 'bg-dark-700 hover:bg-dark-600 text-dark-300'
                  }`}
                >
                  {st || 'All Withdrawals'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden shadow-lg">
            {withdrawalsLoading ? (
              <div className="p-12 text-center text-dark-400 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-7 h-7 animate-spin text-primary-400" />
                <span className="text-sm">Loading withdrawal requests...</span>
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="p-12 text-center text-dark-400">No withdrawal requests found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700 bg-dark-900/60">
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Request ID</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">User</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Coins Debited</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Valuation (130:1)</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Method & Account</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Status</th>
                      <th className="text-left px-5 py-3.5 text-xs text-dark-400 uppercase font-semibold">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/50">
                    {withdrawals.map((w: any) => {
                      const userObj = typeof w.userId === 'object' ? w.userId : null;
                      const bdtVal = w.amountBdt ?? Math.floor(w.amount / RATE_PER_BDT);
                      return (
                        <tr key={w._id} className="hover:bg-dark-700/30 transition-colors">
                          <td className="px-5 py-3.5 text-sm font-mono font-bold text-white">
                            {w._id?.slice(-8)?.toUpperCase()}
                          </td>
                          <td className="px-5 py-3.5 text-sm">
                            <span className="text-white font-medium">{userObj?.nickname || userObj?.uid || '—'}</span>
                          </td>
                          <td className="px-5 py-3.5 text-sm font-bold font-mono text-yellow-400 flex items-center gap-1">
                            <CoinIcon className="w-3.5 h-3.5" />
                            {w.amount?.toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-bold text-emerald-400 font-mono">
                            ৳{bdtVal?.toLocaleString()} BDT
                          </td>
                          <td className="px-5 py-3.5 text-xs">
                            <span className="capitalize font-bold text-white">{w.method}</span>
                            <span className="block text-dark-400 font-mono">{w.accountNumber || '—'}</span>
                          </td>
                          <td className="px-5 py-3.5 text-sm">{statusBadge(w.status)}</td>
                          <td className="px-5 py-3.5 text-xs text-dark-400">{new Date(w.createdAt).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: SEND / ISSUE CURRENCY (LIMITLESS TRANSFER) ───────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'transfer' && (
        <div className="space-y-6">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-dark-700 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary-400" /> Send Diamonds / Coins (Limitless Mode)
                </h3>
                <p className="text-xs text-dark-400 mt-0.5">
                  Issue unlimited Diamonds and Coins directly to any User, Agent, or Host.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form */}
              <div className="lg:col-span-7 space-y-5">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-dark-300 mb-1.5 block">
                    Recipient (User ID / UID / Agent ID / Phone) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      placeholder="e.g. 168001 or Agent / User UID"
                      className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-mono"
                    />
                    <div className="absolute right-3 top-3.5 flex items-center gap-2 pointer-events-none text-dark-400">
                      {lookingUp ? <RefreshCw className="w-4 h-4 animate-spin text-primary-400" /> : <Search className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Quick Select Agent Dropdown */}
                  {agents.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-dark-400">Quick Agent Select:</span>
                      <select
                        onChange={(e) => {
                          const sel = agents.find((a) => a.uid === e.target.value || a._id === e.target.value);
                          if (sel) handleSelectAgent(sel);
                        }}
                        value=""
                        aria-label="Quick Agent Select"
                        className="bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-lg px-2.5 py-1 text-xs text-dark-200 focus:outline-none focus:border-primary-500"
                      >
                        <option value="">Choose an agent...</option>
                        {agents.map((a: any) => (
                          <option key={a._id} value={a.uid || a._id}>
                            {a.nickname} (UID: {a.uid})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Currency Selector */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-dark-300 mb-1.5 block">
                    Select Currency *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrency('diamond')}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                        currency === 'diamond'
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-500/10'
                          : 'bg-dark-900 border-dark-700 text-dark-400 hover:border-dark-600'
                      }`}
                    >
                      <DiamondIcon className="w-5 h-5 text-cyan-400" />
                      <span>Diamond (💎)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrency('coin')}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                        currency === 'coin'
                          ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300 shadow-lg shadow-yellow-500/10'
                          : 'bg-dark-900 border-dark-700 text-dark-400 hover:border-dark-600'
                      }`}
                    >
                      <CoinIcon className="w-5 h-5 text-yellow-400" />
                      <span>Coin (🪙)</span>
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-dark-300 mb-1.5 block">
                    Amount to Send *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount (e.g. 50000)"
                    className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-mono"
                  />

                  {/* Quick Amount Add Chips */}
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-dark-400 mr-1">Quick Add:</span>
                    {[1000, 10000, 50000, 100000, 500000, 1000000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleAddAmount(val)}
                        className="px-2.5 py-1 bg-dark-700 hover:bg-dark-600 active:bg-dark-500 text-dark-300 hover:text-white rounded-lg text-xs font-mono transition-colors"
                      >
                        +{val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}k`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Preview */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                <div className="bg-dark-900 border border-dark-700/80 rounded-xl p-5 h-full flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-dark-400 mb-3 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-primary-400" /> Recipient Verification
                    </p>

                    {lookingUp ? (
                      <div className="py-8 text-center text-dark-400 text-sm flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-primary-400" />
                        <span>Searching for recipient...</span>
                      </div>
                    ) : recipient ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3.5 pb-4 border-b border-dark-800">
                          {recipient.avatar ? (
                            <img
                              src={getMediaUrl(recipient.avatar)}
                              alt={recipient.nickname}
                              className="w-12 h-12 rounded-full object-cover border-2 border-primary-500/50 bg-dark-800"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary-600/30 border border-primary-500 flex items-center justify-center text-primary-300 font-bold text-lg">
                              {recipient.nickname?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-white text-base">{recipient.nickname}</h4>
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${roleBadgeColor(recipient.role || 'user')}`}>
                                {recipient.role || 'user'}
                              </span>
                            </div>
                            <p className="text-xs text-dark-400 font-mono mt-0.5">UID: {recipient.uid}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-dark-800/80 rounded-lg p-3">
                          <div>
                            <p className="text-[11px] text-dark-400 uppercase">Current Diamonds</p>
                            <p className="text-sm font-bold text-cyan-400 mt-0.5 flex items-center gap-1">
                              <DiamondIcon className="w-3.5 h-3.5" />
                              {recipient.diamonds?.toLocaleString() ?? '0'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] text-dark-400 uppercase">Current Coins</p>
                            <p className="text-sm font-bold text-yellow-400 mt-0.5 flex items-center gap-1">
                              <CoinIcon className="w-3.5 h-3.5" />
                              {recipient.coins?.toLocaleString() ?? '0'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : lookupError ? (
                      <div className="py-8 text-center text-red-400 text-sm flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="w-6 h-6 text-red-400" />
                        <span>{lookupError}</span>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-dark-500 text-sm">
                        Enter a User UID or Agent ID above to view recipient details.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback */}
            {transferErr && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-300 text-sm p-4 rounded-xl flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{transferErr}</span>
              </div>
            )}
            {transferMsg && (
              <div className="bg-green-900/20 border border-green-500/50 text-green-300 text-sm p-4 rounded-xl flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                <span>{transferMsg}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleTransfer}
              disabled={transferSaving || !targetId || !amount || parseInt(amount) <= 0}
              className="px-6 py-3.5 bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/20 flex items-center gap-2"
            >
              {transferSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Send {currency === 'diamond' ? 'Diamonds' : 'Coins'} Now
            </button>
          </div>

          {/* Admin Transfer Log Table */}
          <div className="bg-dark-800 border border-dark-700 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-dark-700 flex items-center justify-between">
              <h4 className="font-bold text-white text-sm">Recent Platform Transfers</h4>
              <span className="text-xs text-dark-400">{history.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700 bg-dark-900/50">
                    <th className="text-left px-5 py-3 text-xs text-dark-400 uppercase font-semibold">Recipient</th>
                    <th className="text-left px-5 py-3 text-xs text-dark-400 uppercase font-semibold">Amount</th>
                    <th className="text-left px-5 py-3 text-xs text-dark-400 uppercase font-semibold">Currency</th>
                    <th className="text-left px-5 py-3 text-xs text-dark-400 uppercase font-semibold">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/50">
                  {history.map((h: any) => {
                    const u = typeof h.userId === 'object' ? h.userId : null;
                    return (
                      <tr key={h._id} className="hover:bg-dark-700/20 text-sm">
                        <td className="px-5 py-3 text-white">
                          {u?.nickname || '—'} <span className="text-xs text-dark-400 font-mono">(UID: {u?.uid || '—'})</span>
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-green-400">+{h.amount?.toLocaleString()}</td>
                        <td className="px-5 py-3 capitalize text-xs text-dark-300">{h.currency}</td>
                        <td className="px-5 py-3 text-xs text-dark-400">{new Date(h.createdAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TRANSACTION DETAILS MODAL ──────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-dark-800 border border-dark-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-dark-700 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-dark-400">Transaction Details</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-lg font-black font-mono text-white">
                    {selectedTx.txId || selectedTx._id}
                  </h3>
                  <button
                    onClick={() => copyToClipboard(selectedTx.txId || selectedTx._id)}
                    className="p-1 rounded text-dark-400 hover:text-white"
                    title="Copy TX ID"
                  >
                    {copiedId === (selectedTx.txId || selectedTx._id) ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 rounded-full bg-dark-700 hover:bg-dark-600 flex items-center justify-center text-dark-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2">
              {categoryBadge(selectedTx.type, selectedTx.category)}
              {statusBadge(selectedTx.status)}
            </div>

            {/* Value Highlights */}
            <div className="p-4 rounded-2xl bg-dark-900/90 border border-dark-700 flex items-center justify-between">
              <div>
                <p className="text-xs text-dark-400">Amount & Asset</p>
                <p className={`text-2xl font-black font-mono mt-0.5 flex items-center gap-1.5 ${
                  selectedTx.currency === 'diamond' ? 'text-cyan-400' : 'text-yellow-400'
                }`}>
                  {selectedTx.currency === 'diamond' ? <DiamondIcon className="w-5 h-5" /> : <CoinIcon className="w-5 h-5" />}
                  {selectedTx.amount?.toLocaleString()} {selectedTx.currency?.toUpperCase()}S
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-dark-400">Valuation in BDT (130:1)</p>
                <p className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                  ≈ ৳{(selectedTx.bdtValue ?? (selectedTx.amount / RATE_PER_BDT)).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                </p>
              </div>
            </div>

            {/* Detail Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700/60">
                <p className="text-dark-400 uppercase font-semibold text-[10px]">User Nickname</p>
                <p className="font-bold text-white mt-0.5">{selectedTx.userId?.nickname || '—'}</p>
              </div>

              <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700/60">
                <p className="text-dark-400 uppercase font-semibold text-[10px]">User UID</p>
                <p className="font-mono font-bold text-white mt-0.5">{selectedTx.userId?.uid || '—'}</p>
              </div>

              <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700/60">
                <p className="text-dark-400 uppercase font-semibold text-[10px]">User Role</p>
                <p className="font-bold text-white mt-0.5 capitalize">{selectedTx.userId?.role || 'user'}</p>
              </div>

              <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700/60">
                <p className="text-dark-400 uppercase font-semibold text-[10px]">Phone Number</p>
                <p className="font-mono font-bold text-white mt-0.5">{selectedTx.userId?.phone || '—'}</p>
              </div>

              <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700/60 col-span-2">
                <p className="text-dark-400 uppercase font-semibold text-[10px]">Created Date & Timestamp</p>
                <p className="font-mono font-bold text-white mt-0.5">{new Date(selectedTx.createdAt).toLocaleString()}</p>
              </div>

              {selectedTx.targetId && (
                <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700/60 col-span-2">
                  <p className="text-dark-400 uppercase font-semibold text-[10px]">Target Recipient</p>
                  <p className="font-bold text-white mt-0.5">
                    {selectedTx.targetId?.nickname} (UID: {selectedTx.targetId?.uid})
                  </p>
                </div>
              )}

              <div className="bg-dark-900/50 p-3 rounded-xl border border-dark-700/60 col-span-2">
                <p className="text-dark-400 uppercase font-semibold text-[10px]">Database Document ID (_id)</p>
                <p className="font-mono text-dark-300 mt-0.5 select-all">{selectedTx._id}</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="w-full py-3 bg-dark-700 hover:bg-dark-600 rounded-xl text-xs font-bold text-white transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWallet;
