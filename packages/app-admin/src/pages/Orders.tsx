import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  User as UserIcon,
  Phone,
  Eye,
  AlertTriangle,
  X,
  CreditCard,
  Building2,
} from 'lucide-react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';
import { DiamondIcon } from '../components/CurrencyIcon';

interface OrderItem {
  _id: string;
  userId: any;
  agentId: any;
  isOfficial?: boolean;
  paymentMethod: string;
  amountBdt: number;
  amountUsd?: number;
  currencyMode?: 'USD' | 'BDT';
  diamonds: number;
  coins: number;
  screenshot: string;
  transactionId: string;
  accountNumber?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export const Orders = () => {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'official' | 'agent'>('all');
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<OrderItem | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<OrderItem | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState({
    pendingCount: 0,
    officialPendingCount: 0,
    totalConfirmedBdt: 0,
    totalConfirmedDiamonds: 0,
    matchedAcrossAllFilters: false,
    agentOrderMatchCount: 0,
  });

  const isFirstMount = useRef(true);

  const load = async (
    targetPage = page,
    targetStatus = statusFilter,
    targetType = typeFilter,
    targetSearch = search
  ) => {
    setLoading(true);
    try {
      const params: any = { page: targetPage, limit: 20 };
      if (targetStatus) params.status = targetStatus;
      if (targetType !== 'all') params.type = targetType;
      if (targetSearch && targetSearch.trim()) params.search = targetSearch.trim();

      const { data } = await adminApi.getOrders(params);
      if (data.success) {
        setOrders(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search on typing
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      load(1, statusFilter, typeFilter, search);
      return;
    }
    const timer = setTimeout(() => {
      setPage(1);
      load(1, statusFilter, typeFilter, search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Reload when page, statusFilter, or typeFilter change
  useEffect(() => {
    if (!isFirstMount.current) {
      load(page, statusFilter, typeFilter, search);
    }
  }, [page, statusFilter, typeFilter]);

  // Auto-refresh every 20s for new orders
  useEffect(() => {
    const timer = setInterval(() => {
      load(page, statusFilter, typeFilter, search);
    }, 20000);
    return () => clearInterval(timer);
  }, [page, statusFilter, typeFilter, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1, statusFilter, typeFilter, search);
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
    load(1, statusFilter, typeFilter, '');
  };

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleConfirm = async (order: OrderItem) => {
    const isOfficial = order.isOfficial || !order.agentId;
    const destName = isOfficial ? 'Nova Agent (Official)' : (order.agentId?.nickname || 'Agent');
    if (
      !confirm(
        `Are you sure you want to CONFIRM this order?\n\nUser: ${order.userId?.nickname || order.userId?.uid || 'User'}\nAmount: ৳${order.amountBdt?.toLocaleString()}\nDiamonds: 💎${order.diamonds?.toLocaleString()}\nDestination: ${destName}\n\nDiamonds will be credited to the user's account immediately.`
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      await adminApi.confirmOrder(order._id);
      if (selectedScreenshot?._id === order._id) {
        setSelectedScreenshot(null);
      }
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to confirm order');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (order: OrderItem) => {
    setRejectingOrder(order);
    setRejectionNote('');
  };

  const submitReject = async () => {
    if (!rejectingOrder) return;
    setActionLoading(true);
    try {
      await adminApi.rejectOrder(rejectingOrder._id, rejectionNote.trim() || undefined);
      if (selectedScreenshot?._id === rejectingOrder._id) {
        setSelectedScreenshot(null);
      }
      setRejectingOrder(null);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject order');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: 'createdAt',
      label: 'Date & Time',
      render: (r: OrderItem) => {
        const d = new Date(r.createdAt);
        return (
          <div className="text-xs">
            <div className="font-medium text-slate-200">
              {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="text-dark-400 text-[11px]">
              {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[10px] text-dark-500 font-mono mt-0.5">#{r._id.slice(-6)}</div>
          </div>
        );
      },
    },
    {
      key: 'userId',
      label: 'Customer / User',
      render: (r: OrderItem) => {
        const u = r.userId || {};
        return (
          <div className="flex items-center gap-2.5">
            {u.avatar ? (
              <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-dark-700" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-xs font-bold text-dark-300">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
            <div className="text-xs">
              <div className="font-semibold text-slate-100">{u.nickname || 'Unknown User'}</div>
              <div className="text-cyan-400 font-mono text-[11px]">UID: {u.uid || '—'}</div>
              {u.phone && (
                <div className="text-dark-400 text-[10px] flex items-center gap-1">
                  <Phone className="w-3 h-3 inline" /> {u.phone}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'agentId',
      label: 'Destination / Agent',
      render: (r: OrderItem) => {
        const isOfficial = r.isOfficial || !r.agentId;
        if (isOfficial) {
          return (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Nova Agent (Official)</span>
            </div>
          );
        }
        return (
          <div className="text-xs">
            <div className="flex items-center gap-1 text-slate-200 font-medium">
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              <span>{r.agentId?.nickname || 'Agency Agent'}</span>
            </div>
            <div className="text-dark-400 font-mono text-[11px]">UID: {r.agentId?.uid || '—'}</div>
          </div>
        );
      },
    },
    {
      key: 'paymentMethod',
      label: 'Payment Info',
      render: (r: OrderItem) => {
        const methodColors: Record<string, string> = {
          bkash: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
          nagad: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
          rocket: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          binance: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
          bybit: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        };
        const badgeColor = methodColors[r.paymentMethod?.toLowerCase()] || 'bg-slate-700/50 text-slate-300 border-slate-600';

        const cleanSearch = search.trim().toLowerCase().replace(/^(transaction\s*id|transactionid|trxid|trx\s*id|txid|tx\s*id|trx|tx|texid|tex\s*id)\s*[:#=\-\s]\s*/i, '').replace(/^#+/, '').trim();
        const isTrxMatch = Boolean(
          cleanSearch &&
          r.transactionId &&
          (r.transactionId.toLowerCase().includes(cleanSearch) || cleanSearch.includes(r.transactionId.toLowerCase()))
        );
        const isAccMatch = Boolean(
          cleanSearch &&
          r.accountNumber &&
          (r.accountNumber.toLowerCase().includes(cleanSearch) || cleanSearch.includes(r.accountNumber.toLowerCase()))
        );

        return (
          <div className="text-xs space-y-1">
            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border capitalize ${badgeColor}`}>
              {r.paymentMethod}
            </span>
            {r.accountNumber && (
              <div className="flex items-center gap-1 text-dark-300 text-[11px]">
                <span className="text-dark-400">Sender:</span>
                <span className={`font-mono px-1 rounded ${isAccMatch ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40 font-bold' : ''}`}>
                  {r.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(r.accountNumber!, `acc-${r._id}`)}
                  className="text-dark-400 hover:text-white"
                  title="Copy Account Number"
                >
                  {copiedKey === `acc-${r._id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            )}
            <div className="flex items-center gap-1 text-dark-300 text-[11px]">
              <span className="text-dark-400">TrxID:</span>
              <span className={`font-mono font-semibold px-1 rounded ${
                isTrxMatch
                  ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 shadow-sm'
                  : 'text-cyan-300'
              }`}>
                {r.transactionId || '—'}
              </span>
              {r.transactionId && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(r.transactionId, `trx-${r._id}`)}
                  className="text-dark-400 hover:text-white"
                  title="Copy Transaction ID"
                >
                  {copiedKey === `trx-${r._id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'amountBdt',
      label: 'Amount & Diamonds',
      render: (r: OrderItem) => (
        <div className="text-xs space-y-0.5">
          {r.currencyMode === 'USD' || (r.amountUsd && r.amountUsd > 0) ? (
            <div>
              <div className="font-bold text-emerald-400 text-sm">${r.amountUsd?.toLocaleString()} USD</div>
              <div className="text-[10px] text-dark-400">≈ ৳{r.amountBdt?.toLocaleString()} BDT</div>
            </div>
          ) : (
            <div className="font-bold text-emerald-400 text-sm">৳{r.amountBdt?.toLocaleString()} BDT</div>
          )}
          <div className="text-cyan-400 font-semibold inline-flex items-center gap-1">
            <DiamondIcon className="w-3.5 h-3.5" />
            <span>{r.diamonds?.toLocaleString()}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'screenshot',
      label: 'Slip / Proof',
      render: (r: OrderItem) => {
        if (!r.screenshot) {
          return <span className="text-xs text-dark-500 italic">No slip</span>;
        }
        return (
          <button
            type="button"
            onClick={() => setSelectedScreenshot(r)}
            className="group relative block w-14 h-14 rounded-lg overflow-hidden border border-dark-700 hover:border-cyan-500 transition-all bg-dark-900"
            title="Click to view full screenshot"
          >
            <img src={r.screenshot} alt="Payment Slip" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 bg-dark-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Eye className="w-4 h-4 text-white drop-shadow" />
            </div>
          </button>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (r: OrderItem) => {
        const statusMap: Record<string, { bg: string; text: string; icon: any; label: string }> = {
          pending: {
            bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse',
            text: 'text-amber-400',
            icon: Clock,
            label: 'Pending',
          },
          confirmed: {
            bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
            text: 'text-emerald-400',
            icon: CheckCircle2,
            label: 'Confirmed',
          },
          rejected: {
            bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
            text: 'text-rose-400',
            icon: XCircle,
            label: 'Rejected',
          },
        };
        const conf = statusMap[r.status] || { bg: 'bg-dark-700 text-dark-300 border-dark-600', icon: Clock, label: r.status };
        const Icon = conf.icon;

        return (
          <div className="space-y-1">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${conf.bg}`}>
              <Icon className="w-3.5 h-3.5" />
              <span>{conf.label}</span>
            </span>
            {r.adminNote && (
              <div className="text-[10px] text-dark-400 italic max-w-[140px] truncate" title={r.adminNote}>
                Note: {r.adminNote}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: '_id',
      label: 'Actions',
      render: (r: OrderItem) => {
        if (r.status !== 'pending') {
          return (
            <span className="text-xs text-dark-400 font-medium">
              {r.status === 'confirmed' ? 'Fulfilled' : 'Declined'}
            </span>
          );
        }

        return (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleConfirm(r)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
              title="Confirm order & credit diamonds"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm</span>
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => openRejectModal(r)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
              title="Reject order"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>Orders Management</span>
            {stats.officialPendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
                {stats.officialPendingCount} Official Pending
              </span>
            )}
          </h2>
          <p className="text-sm text-dark-400 mt-0.5">
            Supervise all customer diamond purchase orders, verify bank/mobile payment slips, and credit balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-slate-200 border border-dark-700 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-dark-400 font-medium">Nova Official Pending</div>
            <div className="text-xl font-bold text-cyan-300">
              {stats.officialPendingCount}
            </div>
          </div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-dark-400 font-medium">Total Pending Orders</div>
            <div className="text-xl font-bold text-amber-300">
              {stats.pendingCount}
            </div>
          </div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-dark-400 font-medium">Total Confirmed BDT</div>
            <div className="text-xl font-bold text-emerald-300">
              ৳{stats.totalConfirmedBdt?.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <DiamondIcon className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-xs text-dark-400 font-medium">Diamonds Credited</div>
            <div className="text-xl font-bold text-cyan-300">
              {stats.totalConfirmedDiamonds?.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Destination Type Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-dark-400 mr-1">Target:</span>
            <button
              type="button"
              onClick={() => { setTypeFilter('all'); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                typeFilter === 'all'
                  ? 'bg-primary-600 text-white shadow'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              All Orders
            </button>
            <button
              type="button"
              onClick={() => { setTypeFilter('official'); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                typeFilter === 'official'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'bg-dark-800 text-cyan-300 hover:bg-dark-700 border border-cyan-500/30'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nova Agent (Official)</span>
              {stats.officialPendingCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-dark-950 font-bold rounded-full text-[10px]">
                  {stats.officialPendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setTypeFilter('agent'); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                typeFilter === 'agent'
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              Agency Agents
            </button>
          </div>

          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-dark-400 mr-1">Status:</span>
            {['', 'pending', 'confirmed', 'rejected'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`text-xs px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-primary-600 text-white shadow'
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                }`}
              >
                {s || 'All Statuses'}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by User UID, Customer Name, Phone, TrxID, or Sender Account..."
              className="w-full pl-9 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-xs text-white placeholder-dark-400 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-3 py-2 bg-dark-800 hover:bg-dark-700 text-dark-300 text-xs font-medium rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Search Feedback Notifications */}
      {stats.matchedAcrossAllFilters && search.trim() && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 flex items-center justify-between text-xs text-cyan-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Found matching order across all statuses and destinations for "{search.trim()}". (Filters were automatically relaxed to show your result).
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setTypeFilter('all');
              setStatusFilter('');
            }}
            className="text-[11px] underline text-cyan-300 hover:text-white shrink-0 ml-2"
          >
            Reset Filters
          </button>
        </div>
      )}

      {stats.agentOrderMatchCount > 0 && search.trim() && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 flex items-center justify-between text-xs text-purple-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              Found {stats.agentOrderMatchCount} matching order(s) in Agent Orders for "{search.trim()}".
            </span>
          </div>
          <a
            href="/agent-orders"
            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-semibold transition-colors shrink-0 ml-2"
          >
            View in Agent Orders
          </a>
        </div>
      )}

      {/* Orders Table */}
      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Screenshot Lightbox Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-dark-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Payment Proof Screenshot</span>
                  {selectedScreenshot.isOfficial && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      Nova Official
                    </span>
                  )}
                </h3>
                <p className="text-xs text-dark-400">
                  User: {selectedScreenshot.userId?.nickname || selectedScreenshot.userId?.uid} • Amount: ৳
                  {selectedScreenshot.amountBdt?.toLocaleString()} • Method: {selectedScreenshot.paymentMethod}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScreenshot(null)}
                className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-dark-950 flex items-center justify-center">
              <img
                src={selectedScreenshot.screenshot}
                alt="Payment Slip Proof"
                className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-lg border border-dark-800"
              />
            </div>

            <div className="p-4 bg-dark-900 border-t border-dark-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs space-y-1">
                <div>
                  <span className="text-dark-400">TrxID: </span>
                  <span className="font-mono text-cyan-300 font-bold">{selectedScreenshot.transactionId}</span>
                </div>
                {selectedScreenshot.accountNumber && (
                  <div>
                    <span className="text-dark-400">Sender Account: </span>
                    <span className="font-mono text-slate-200">{selectedScreenshot.accountNumber}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={selectedScreenshot.screenshot}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Image</span>
                </a>
                {selectedScreenshot.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleConfirm(selectedScreenshot)}
                      className="flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirm & Credit</span>
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => openRejectModal(selectedScreenshot)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Note Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span>Reject Recharge Order</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
                className="w-7 h-7 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-dark-300">
              Are you sure you want to reject this recharge order of{' '}
              <strong className="text-white">৳{rejectingOrder.amountBdt?.toLocaleString()}</strong> from{' '}
              <strong className="text-white">{rejectingOrder.userId?.nickname || 'User'}</strong>?
            </p>

            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1">
                Rejection Reason (will be notified to user):
              </label>
              <textarea
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                placeholder="e.g., Transaction ID not found, screenshot unclear, invalid payment amount..."
                rows={3}
                className="w-full p-3 bg-dark-800 border border-dark-700 rounded-lg text-xs text-white placeholder-dark-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
                className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-lg text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={submitReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
