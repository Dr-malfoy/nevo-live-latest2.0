import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  PiArrowsLeftRightFill as ExchangeIcon,
  PiCreditCardFill as CardIcon,
  PiCoinsFill as CoinIcon,
  PiDiamondFill as DiamondIcon,
  PiCheckCircleFill as CheckCircle,
  PiXCircleFill as XCircle,
  PiClockFill as Clock,
  PiCopyFill as CopyIcon,
  PiEyeFill as EyeIcon,
  PiMagnifyingGlassBold as SearchIcon,
  PiUserFill as UserIcon,
  PiPhoneFill as PhoneIcon,
  PiSparkleFill as Sparkle,
  PiCaretRightBold as ChevronRight,
  PiPaperPlaneRightFill as SendIcon,
  PiXBold as XIcon,
} from 'react-icons/pi';
import {
  agentApi,
  type AgentRechargeRequest,
  type AgentWithdrawalRequest,
} from '../api/agent.api';
import { optional } from '../api/pending';
import { useAuthStore, useSocketStore, useUIStore } from '../stores';
import { ScreenHeader, EmptyState } from '../components/common';
import { Avatar } from '../components/user';
import { Loading, Modal, Button } from '../components/ui';
import { getMediaUrl } from '../lib/media';

type Tab = 'recharge' | 'withdraw';
type StatusFilter = 'all' | 'pending' | 'completed' | 'rejected';

export const AgentRequests = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialTab = (params.get('tab') as Tab) || 'recharge';
  const initialStatus = (params.get('status') as StatusFilter) || 'all';

  const [tab, setTab] = useState<Tab>(initialTab);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [search, setSearch] = useState('');

  const [rechargeRequests, setRechargeRequests] = useState<AgentRechargeRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<AgentWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ pendingRecharges: 0, pendingWithdrawals: 0 });

  // Action dialogs
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [actionItem, setActionItem] = useState<{
    type: 'approve' | 'reject' | 'mark_paid';
    requestType: 'recharge' | 'withdraw';
    item: AgentRechargeRequest | AgentWithdrawalRequest;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const socket = useSocketStore((s) => s.socket);
  const showToast = useUIStore((s) => s.showToast);

  const syncCounts = async () => {
    try {
      const res = await agentApi.getPendingCounts();
      if (res.data?.success && res.data.data) {
        setCounts({
          pendingRecharges: res.data.data.pendingRecharges || 0,
          pendingWithdrawals: res.data.data.pendingWithdrawals || 0,
        });
      }
    } catch {
      // ignore
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      syncCounts();
      if (tab === 'recharge') {
        const queryStatus = status === 'all' ? undefined : status === 'completed' ? 'confirmed' : status;
        const res = await optional(agentApi.getRechargeRequests({ status: queryStatus, limit: 100 }));
        if (res?.data) {
          const raw = res.data as any;
          const items = Array.isArray(raw) ? raw : raw.data || [];
          setRechargeRequests(items);
        }
      } else {
        const queryStatus = status === 'all' ? undefined : status === 'completed' ? 'paid' : status;
        const res = await optional(agentApi.getWithdrawalRequests({ status: queryStatus, limit: 100 }));
        if (res?.data) {
          const raw = res.data as any;
          const items = Array.isArray(raw) ? raw : raw.data || [];
          setWithdrawalRequests(items);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tab, status]);

  // Real-time live update on new requests & notifications
  useEffect(() => {
    if (!socket) return;

    const onRequestNew = (data: any) => {
      showToast(`🔔 New ${data.type === 'recharge' ? 'Recharge' : 'Withdrawal'} Request received!`, 'info');
      syncCounts();
      loadData();
    };

    const onNotifNew = (notif: any) => {
      if (notif.type === 'recharge' || notif.type === 'withdrawal') {
        syncCounts();
        loadData();
      }
    };

    socket.on('agent:request:new', onRequestNew);
    socket.on('notification:new', onNotifNew);

    return () => {
      socket.off('agent:request:new', onRequestNew);
      socket.off('notification:new', onNotifNew);
    };
  }, [socket, tab, status]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAction = async () => {
    if (!actionItem) return;
    setActionLoading(true);
    try {
      const { type, requestType, item } = actionItem;

      if (requestType === 'recharge') {
        if (type === 'approve') {
          await agentApi.approveRecharge(item._id);
          showToast('Recharge request approved and credited successfully!', 'success');
        } else if (type === 'reject') {
          await agentApi.rejectRecharge(item._id, rejectReason);
          showToast('Recharge request rejected', 'info');
        }
      } else {
        if (type === 'approve') {
          await agentApi.approveWithdrawal(item._id);
          showToast('Withdrawal request approved!', 'success');
        } else if (type === 'reject') {
          await agentApi.rejectWithdrawal(item._id, rejectReason);
          showToast('Withdrawal request rejected', 'info');
        } else if (type === 'mark_paid') {
          await agentApi.markWithdrawalPaid(item._id);
          showToast('Withdrawal marked as paid to user!', 'success');
        }
      }

      setActionItem(null);
      setRejectReason('');
      loadData();
    } catch (err: any) {
      showToast(err?.response?.data?.message || err.message || 'Operation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRecharges = useMemo(() => {
    if (!search.trim()) return rechargeRequests;
    const q = search.toLowerCase();
    return rechargeRequests.filter((r) => {
      const name = r.userId?.nickname?.toLowerCase() || '';
      const uid = String(r.userId?.uid || '').toLowerCase();
      const tx = (r.transactionId || '').toLowerCase();
      const phone = (r.accountNumber || r.userId?.phone || '').toLowerCase();
      return name.includes(q) || uid.includes(q) || tx.includes(q) || phone.includes(q);
    });
  }, [rechargeRequests, search]);

  const filteredWithdrawals = useMemo(() => {
    if (!search.trim()) return withdrawalRequests;
    const q = search.toLowerCase();
    return withdrawalRequests.filter((w) => {
      const name = w.userId?.nickname?.toLowerCase() || '';
      const uid = String(w.userId?.uid || '').toLowerCase();
      const phone = (w.accountNumber || w.userId?.phone || '').toLowerCase();
      return name.includes(q) || uid.includes(q) || phone.includes(q);
    });
  }, [withdrawalRequests, search]);

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-20 select-none">
      {/* ── Screen Header ─────────────────────────────────────────── */}
      <ScreenHeader
        title="Recharge & Withdraw Requests"
        variant="white"
      />

      {/* ── Tab Selector ───────────────────────────────────────────── */}
      <div className="bg-white px-4 pt-2 pb-3 border-b border-gray-100 shadow-2xs">
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100/90 rounded-2xl">
          {/* Recharge Tab */}
          <button
            onClick={() => {
              setTab('recharge');
              setParams({ tab: 'recharge', status });
            }}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              tab === 'recharge'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CardIcon className="w-4 h-4" />
            <span>Recharge Requests</span>
            {counts.pendingRecharges > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                tab === 'recharge' ? 'bg-white text-emerald-700' : 'bg-red-500 text-white animate-pulse'
              }`}>
                {counts.pendingRecharges}
              </span>
            )}
          </button>

          {/* Withdraw Tab */}
          <button
            onClick={() => {
              setTab('withdraw');
              setParams({ tab: 'withdraw', status });
            }}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              tab === 'withdraw'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ExchangeIcon className="w-4 h-4" />
            <span>Withdraw Requests</span>
            {counts.pendingWithdrawals > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                tab === 'withdraw' ? 'bg-white text-orange-700' : 'bg-red-500 text-white animate-pulse'
              }`}>
                {counts.pendingWithdrawals}
              </span>
            )}
          </button>
        </div>

        {/* ── Status Pills ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar pb-0.5">
          {(['all', 'pending', 'completed', 'rejected'] as StatusFilter[]).map((s) => {
            const active = status === s;
            const labelMap: Record<StatusFilter, string> = {
              all: 'All',
              pending: 'Pending',
              completed: tab === 'recharge' ? 'Credited' : 'Paid / Approved',
              rejected: 'Rejected',
            };
            return (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setParams({ tab, status: s });
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
                  active
                    ? 'bg-[#1E293B] text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {labelMap[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search Bar ─────────────────────────────────────────────── */}
      <div className="px-4 pt-3">
        <div className="relative">
          <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by User, UID, Phone or Transaction ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-gray-200 text-xs text-ink placeholder:text-gray-400 focus:outline-none focus:border-amber-400 transition-colors shadow-2xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Content List ───────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loading size="lg" />
            <span className="text-xs text-gray-400 font-medium">Loading requests...</span>
          </div>
        ) : tab === 'recharge' ? (
          filteredRecharges.length === 0 ? (
            <EmptyState
              icon={<CardIcon className="w-10 h-10 text-gray-300" />}
              title="No recharge requests"
              hint={status === 'pending' ? 'All user recharge requests are processed!' : 'No requests found for this filter.'}
            />
          ) : (
            filteredRecharges.map((req) => {
              const isPending = req.status === 'pending';
              const isConfirmed = req.status === 'confirmed';
              const isRejected = req.status === 'rejected';

              return (
                <div
                  key={req._id}
                  className={`bg-white rounded-2xl p-4 border transition-all shadow-xs ${
                    isPending ? 'border-emerald-300/80 ring-2 ring-emerald-500/10' : 'border-gray-200/80'
                  }`}
                >
                  {/* Top user info row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={req.userId?.avatar}
                        nickname={req.userId?.nickname || 'User'}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="font-extrabold text-ink text-sm truncate">
                          {req.userId?.nickname || 'User'}
                        </p>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1.5 font-mono">
                          <span>ID: {req.userId?.uid || '—'}</span>
                          {req.userId?.phone && (
                            <span className="text-gray-500">• {req.userId.phone}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isPending
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : isConfirmed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  {/* Amount & Method Box */}
                  <div className="mt-3.5 p-3 rounded-xl bg-gray-50/90 border border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Amount Paid</span>
                      <p className="text-lg font-black text-ink flex items-center gap-1">
                        <span className="text-emerald-600">৳{req.amountBdt.toLocaleString()}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">To Receive</span>
                      <p className="text-sm font-black text-amber-600 flex items-center gap-1 justify-end">
                        {req.diamonds > 0 ? (
                          <>
                            <DiamondIcon className="w-4 h-4 text-cyan-500" />
                            <span>{req.diamonds.toLocaleString()} Diamonds</span>
                          </>
                        ) : (
                          <>
                            <CoinIcon className="w-4 h-4 text-amber-500" />
                            <span>{req.coins.toLocaleString()} Coins</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-gray-600">
                      <span className="text-gray-400 text-[11px]">Payment Gateway:</span>
                      <span className="font-bold text-ink uppercase px-2 py-0.5 rounded bg-gray-100 text-[11px]">
                        {req.paymentMethod}
                      </span>
                    </div>

                    {req.accountNumber && (
                      <div className="flex items-center justify-between text-gray-600">
                        <span className="text-gray-400 text-[11px]">Sender Number:</span>
                        <button
                          onClick={() => copyToClipboard(req.accountNumber!, `acc-${req._id}`)}
                          className="font-mono font-semibold text-ink flex items-center gap-1 hover:text-amber-600"
                        >
                          <span>{req.accountNumber}</span>
                          <CopyIcon className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    )}

                    {req.transactionId && (
                      <div className="flex items-center justify-between text-gray-600">
                        <span className="text-gray-400 text-[11px]">Transaction ID:</span>
                        <button
                          onClick={() => copyToClipboard(req.transactionId!, `tx-${req._id}`)}
                          className="font-mono font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded hover:bg-indigo-100"
                        >
                          <span>{req.transactionId}</span>
                          <CopyIcon className="w-3 h-3 text-indigo-400" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-gray-400 text-[11px] pt-1">
                      <span>Submitted:</span>
                      <span>{new Date(req.createdAt).toLocaleString()}</span>
                    </div>

                    {req.adminNote && (
                      <div className="mt-2 p-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs">
                        <span className="font-bold">Reason:</span> {req.adminNote}
                      </div>
                    )}
                  </div>

                  {/* Screenshot / Proof Preview */}
                  {req.screenshot && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">Payment Screenshot</span>
                      <button
                        onClick={() => setSelectedProofUrl(req.screenshot!)}
                        className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200"
                      >
                        <EyeIcon className="w-3.5 h-3.5" />
                        <span>View Proof</span>
                      </button>
                    </div>
                  )}

                  {/* Action Buttons for Pending */}
                  {isPending && (
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                      <button
                        onClick={() => setActionItem({ type: 'approve', requestType: 'recharge', item: req })}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve & Credit</span>
                      </button>
                      <button
                        onClick={() => setActionItem({ type: 'reject', requestType: 'recharge', item: req })}
                        className="py-2.5 px-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold flex items-center justify-center gap-1 hover:bg-rose-100 active:scale-95 transition-transform"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          /* ── Withdraw Requests Tab ────────────────────────────────── */
          filteredWithdrawals.length === 0 ? (
            <EmptyState
              icon={<ExchangeIcon className="w-10 h-10 text-gray-300" />}
              title="No withdrawal requests"
              hint={status === 'pending' ? 'No pending withdrawal requests at the moment.' : 'No withdrawal records found.'}
            />
          ) : (
            filteredWithdrawals.map((req) => {
              const isPending = req.status === 'pending';
              const isApproved = req.status === 'approved';
              const isPaid = req.status === 'paid';
              const isRejected = req.status === 'rejected';

              return (
                <div
                  key={req._id}
                  className={`bg-white rounded-2xl p-4 border transition-all shadow-xs ${
                    isPending
                      ? 'border-orange-300/80 ring-2 ring-orange-500/10'
                      : isApproved
                      ? 'border-blue-300 ring-2 ring-blue-500/10'
                      : 'border-gray-200/80'
                  }`}
                >
                  {/* Top user info row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={req.userId?.avatar}
                        nickname={req.userId?.nickname || 'User'}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="font-extrabold text-ink text-sm truncate">
                          {req.userId?.nickname || 'User'}
                        </p>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1.5 font-mono">
                          <span>ID: {req.userId?.uid || '—'}</span>
                          {req.userId?.phone && (
                            <span className="text-gray-500">• {req.userId.phone}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isPending
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : isApproved
                          ? 'bg-blue-100 text-blue-800'
                          : isPaid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  {/* Amount & Method Box */}
                  <div className="mt-3.5 p-3 rounded-xl bg-orange-50/60 border border-orange-100/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Requested Units</span>
                      <p className="text-base font-black text-ink flex items-center gap-1">
                        {req.currency === 'diamond' ? (
                          <DiamondIcon className="w-4 h-4 text-cyan-500" />
                        ) : (
                          <CoinIcon className="w-4 h-4 text-amber-500" />
                        )}
                        <span>{req.amount.toLocaleString()} {req.currency}s</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Pay Amount (BDT)</span>
                      <p className="text-lg font-black text-orange-600">
                        ৳{req.amountBdt.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Payout Details */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-gray-600">
                      <span className="text-gray-400 text-[11px]">Payout Method:</span>
                      <span className="font-bold text-ink uppercase px-2 py-0.5 rounded bg-gray-100 text-[11px]">
                        {req.method}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-gray-600">
                      <span className="text-gray-400 text-[11px]">User Receiver Account:</span>
                      <button
                        onClick={() => copyToClipboard(req.accountNumber, `w-acc-${req._id}`)}
                        className="font-mono font-bold text-ink flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded hover:text-amber-600"
                      >
                        <span>{req.accountNumber}</span>
                        <CopyIcon className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-gray-400 text-[11px] pt-1">
                      <span>Requested:</span>
                      <span>{new Date(req.createdAt).toLocaleString()}</span>
                    </div>

                    {req.adminNote && (
                      <div className="mt-2 p-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs">
                        <span className="font-bold">Note:</span> {req.adminNote}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {isPending && (
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                      <button
                        onClick={() => setActionItem({ type: 'approve', requestType: 'withdraw', item: req })}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve Request</span>
                      </button>
                      <button
                        onClick={() => setActionItem({ type: 'reject', requestType: 'withdraw', item: req })}
                        className="py-2.5 px-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold flex items-center justify-center gap-1 hover:bg-rose-100 active:scale-95 transition-transform"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {isApproved && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => setActionItem({ type: 'mark_paid', requestType: 'withdraw', item: req })}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Mark Paid (Transfer Sent)</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )
        )}
      </div>

      {/* ── Proof / Screenshot Modal ───────────────────────────────── */}
      {selectedProofUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedProofUrl(null)}
        >
          <div
            className="relative max-w-sm w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-100">
              <span className="font-bold text-xs text-ink">Payment Proof Screenshot</span>
              <button
                onClick={() => setSelectedProofUrl(null)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 rounded-xl overflow-hidden max-h-[70vh] flex items-center justify-center bg-black/5">
              <img
                src={getMediaUrl(selectedProofUrl)}
                alt="Payment proof"
                className="w-full h-auto object-contain max-h-[70vh]"
                crossOrigin="anonymous"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Action Confirmation / Rejection Modal ───────────────────── */}
      {actionItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4">
            <h3 className="font-black text-ink text-base">
              {actionItem.type === 'approve'
                ? `Approve ${actionItem.requestType === 'recharge' ? 'Recharge' : 'Withdrawal'}?`
                : actionItem.type === 'mark_paid'
                ? 'Mark Withdrawal as Paid?'
                : `Reject ${actionItem.requestType === 'recharge' ? 'Recharge' : 'Withdrawal'}?`}
            </h3>

            <p className="text-xs text-gray-600 leading-relaxed">
              {actionItem.type === 'approve' && actionItem.requestType === 'recharge' && (
                <>
                  Approving this order will credit <strong>৳{(actionItem.item as AgentRechargeRequest).amountBdt}</strong> worth of units to <strong>{actionItem.item.userId?.nickname || 'the user'}</strong> and award you agent commission.
                </>
              )}
              {actionItem.type === 'approve' && actionItem.requestType === 'withdraw' && (
                <>
                  Approving this request confirms the user's withdrawal of <strong>৳{(actionItem.item as AgentWithdrawalRequest).amountBdt}</strong>. You will be able to mark it as paid after sending funds.
                </>
              )}
              {actionItem.type === 'mark_paid' && (
                <>
                  Have you transferred <strong>৳{(actionItem.item as AgentWithdrawalRequest).amountBdt}</strong> to receiver account <strong>{(actionItem.item as AgentWithdrawalRequest).accountNumber}</strong> via <strong>{(actionItem.item as AgentWithdrawalRequest).method}</strong>?
                </>
              )}
              {actionItem.type === 'reject' && (
                <>
                  Please specify a reason for rejecting this request so the user is informed.
                </>
              )}
            </p>

            {actionItem.type === 'reject' && (
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Rejection Reason</label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g., Invalid transaction ID, Payment not received, etc."
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-rose-400"
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setActionItem(null);
                  setRejectReason('');
                }}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className={`flex-1 py-2.5 rounded-xl text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                  actionItem.type === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {actionLoading ? <Loading size="sm" /> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
