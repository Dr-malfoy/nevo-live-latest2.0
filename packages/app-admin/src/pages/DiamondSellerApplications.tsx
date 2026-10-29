import { useEffect, useState } from 'react';
import {
  Gem,
  Clock,
  Check,
  X,
  Eye,
  Search,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  Hourglass,
  Wallet,
} from 'lucide-react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';
import { getMediaUrl } from '../lib/media';

export const DiamondSellerApplications = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  // Detail Modal states
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [appDetail, setAppDetail] = useState<any>(null);

  // Review states
  const [reviewing, setReviewing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async (p = page, status = statusFilter, q = search) => {
    setLoading(true);
    try {
      const { data } = await adminApi.getDiamondSellerApplications({
        page: p,
        limit: 15,
        status: status !== 'all' ? status : undefined,
        search: q.trim() || undefined,
      });

      if (data.success) {
        setApplications(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load diamond seller applications', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingCount = async () => {
    try {
      const { data } = await adminApi.getDiamondSellerApplications({ status: 'pending', limit: 1 });
      if (data.success) {
        setPendingCount(data.pagination?.total || 0);
      }
    } catch {}
  };

  useEffect(() => {
    load(page, statusFilter, search);
    loadPendingCount();
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1, statusFilter, search);
  };

  const openDetail = async (id: string) => {
    setSelectedAppId(id);
    setDetailLoading(true);
    try {
      const { data } = await adminApi.getDiamondSellerApplicationDetail(id);
      if (data.success) {
        setAppDetail(data.data);
      }
    } catch (err) {
      console.error('Failed to load application detail', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedAppId(null);
    setAppDetail(null);
  };

  const handleApprove = async (id: string) => {
    if (!window.confirm('Are you sure you want to approve this Diamond Seller application? This will automatically grant the Diamond Seller badge and set their role to diamond_seller.')) {
      return;
    }
    setReviewing(true);
    try {
      const { data } = await adminApi.reviewDiamondSellerApplication(id, 'approve');
      if (data.success) {
        setToastMsg({ type: 'success', text: 'Diamond Seller application approved successfully! Badge and role assigned.' });
        load(page, statusFilter, search);
        loadPendingCount();
        if (selectedAppId === id) closeDetail();
      }
    } catch (err: any) {
      setToastMsg({ type: 'error', text: err.response?.data?.error || 'Failed to approve application' });
    } finally {
      setReviewing(false);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const openRejectModal = (id: string) => {
    setRejectingAppId(id);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingAppId) return;
    setReviewing(true);
    try {
      const { data } = await adminApi.reviewDiamondSellerApplication(rejectingAppId, 'reject', rejectionReason);
      if (data.success) {
        setToastMsg({ type: 'success', text: 'Diamond Seller application rejected' });
        setShowRejectModal(false);
        setRejectingAppId(null);
        setRejectionReason('');
        load(page, statusFilter, search);
        loadPendingCount();
        if (selectedAppId === rejectingAppId) closeDetail();
      }
    } catch (err: any) {
      setToastMsg({ type: 'error', text: err.response?.data?.error || 'Failed to reject application' });
    } finally {
      setReviewing(false);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const columns = [
    {
      key: 'applicant',
      header: 'Applicant',
      render: (row: any) => {
        const u = row.userId;
        const avatarUrl = u?.avatar ? getMediaUrl(u.avatar) : null;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-dark-700 overflow-hidden flex items-center justify-center shrink-0 border border-dark-600">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-dark-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white text-sm">{u?.nickname || row.realName}</span>
                {row.status === 'approved' && (
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 text-cyan-300 border border-cyan-400/50 text-[10px] font-black inline-flex items-center gap-1 shadow-[0_0_8px_rgba(6,182,212,0.4)] animate-pulse">
                    <Gem className="w-3 h-3 text-cyan-400" />
                    DIAMOND SELLER
                  </span>
                )}
              </div>
              <div className="text-xs text-dark-400 font-mono">
                UID: {u?.uid || '—'} · Real: {row.realName}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'diamonds',
      header: 'Diamonds at Apply',
      render: (row: any) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-cyan-400 font-extrabold text-sm">
            <Gem className="w-4 h-4" />
            <span>{(row.diamondsAtApplication || 0).toLocaleString()}</span>
          </div>
          <span className="text-[11px] text-dark-400">
            Current: {(row.userId?.diamonds || 0).toLocaleString()} 💎
          </span>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Info',
      render: (row: any) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1 text-dark-200">
            <Phone className="w-3 h-3 text-dark-400" />
            <span>{row.phone}</span>
          </div>
          {row.whatsapp && (
            <div className="text-emerald-400 text-[11px]">
              WA: {row.whatsapp}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'paymentMethods',
      header: 'Payment Accounts',
      render: (row: any) => {
        const pm = row.paymentMethods || {};
        const methods = [
          pm.bkash && `bKash: ${pm.bkash}`,
          pm.nagad && `Nagad: ${pm.nagad}`,
          pm.rocket && `Rocket: ${pm.rocket}`,
          pm.binance && `Binance: ${pm.binance}`,
          pm.bybit && `Bybit: ${pm.bybit}`,
        ].filter(Boolean);

        return (
          <div className="text-xs text-dark-300 max-w-[200px] truncate" title={methods.join(', ')}>
            {methods.length > 0 ? (
              <span className="px-2 py-0.5 rounded bg-dark-800 border border-dark-700 text-dark-200 text-[11px]">
                {methods.length} Accounts Set
              </span>
            ) : (
              <span className="text-dark-500 italic">None specified</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => {
        if (row.status === 'approved') {
          return (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approved
            </span>
          );
        }
        if (row.status === 'rejected') {
          return (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 inline-flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              Rejected
            </span>
          );
        }
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1.5 animate-pulse">
            <Hourglass className="w-3.5 h-3.5" />
            Pending Review
          </span>
        );
      },
    },
    {
      key: 'appliedAt',
      header: 'Applied Date',
      render: (row: any) => (
        <span className="text-xs text-dark-400 font-mono">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openDetail(row._id)}
            className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-200 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => handleApprove(row._id)}
                disabled={reviewing}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                title="Approve Diamond Seller"
              >
                <Check className="w-3.5 h-3.5" />
                Approve
              </button>
              <button
                onClick={() => openRejectModal(row._id)}
                disabled={reviewing}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                title="Reject Application"
              >
                <X className="w-3.5 h-3.5" />
                Reject
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-700/50'
              : 'bg-rose-950 text-rose-200 border-rose-700/50'
          }`}
        >
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 p-6 rounded-2xl border border-dark-800 shadow-sm relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
              <Gem className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                Diamond Seller Applications
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-cyan-500 text-dark-950 animate-pulse">
                    {pendingCount} Pending
                  </span>
                )}
              </h1>
              <p className="text-xs text-dark-400">
                Review and approve users with 5,000,000+ diamonds to become certified Diamond Sellers.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            load(page, statusFilter, search);
            loadPendingCount();
          }}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-dark-200 text-xs font-semibold inline-flex items-center gap-2 transition-colors self-start sm:self-auto border border-dark-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-dark-900/60 p-3 rounded-xl border border-dark-800">
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              {s}
              {s === 'pending' && pendingCount > 0 && ` (${pendingCount})`}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by UID, Name, Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-dark-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-lg text-xs text-white font-semibold"
          >
            Search
          </button>
        </form>
      </div>

      {/* Applications Data Table */}
      <DataTable
        columns={columns}
        data={applications}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Application Detail Modal */}
      {selectedAppId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-4 border-b border-dark-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gem className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Diamond Seller Application Details</h3>
              </div>
              <button
                onClick={closeDetail}
                className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-300 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading || !appDetail ? (
              <div className="p-12 text-center text-dark-400">Loading details...</div>
            ) : (
              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Applicant Summary */}
                <div className="p-4 rounded-xl bg-dark-800/80 border border-dark-700 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-dark-700 overflow-hidden flex items-center justify-center shrink-0 border-2 border-dark-600">
                    {appDetail.userId?.avatar ? (
                      <img src={getMediaUrl(appDetail.userId.avatar)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-7 h-7 text-dark-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white truncate">{appDetail.userId?.nickname || appDetail.realName}</h4>
                      {appDetail.status === 'approved' && (
                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-black">
                          CERTIFIED DIAMOND SELLER
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-dark-400 font-mono">UID: {appDetail.userId?.uid}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className="text-cyan-400 font-bold flex items-center gap-1">
                        <Gem className="w-3.5 h-3.5" />
                        Current: {(appDetail.userId?.diamonds || 0).toLocaleString()} 💎
                      </span>
                      <span className="text-dark-400">
                        At Application: {(appDetail.diamondsAtApplication || 0).toLocaleString()} 💎
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-dark-800/50 border border-dark-700">
                    <span className="text-dark-400 block mb-0.5">Real / Legal Name</span>
                    <span className="font-semibold text-white">{appDetail.realName}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-dark-800/50 border border-dark-700">
                    <span className="text-dark-400 block mb-0.5">Contact Phone</span>
                    <span className="font-semibold text-white">{appDetail.phone}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-dark-800/50 border border-dark-700">
                    <span className="text-dark-400 block mb-0.5">WhatsApp</span>
                    <span className="font-semibold text-white">{appDetail.whatsapp || '—'}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-dark-800/50 border border-dark-700">
                    <span className="text-dark-400 block mb-0.5">Application Status</span>
                    <span className={`font-bold capitalize ${
                      appDetail.status === 'approved' ? 'text-emerald-400' : appDetail.status === 'rejected' ? 'text-rose-400' : 'text-amber-400'
                    }`}>
                      {appDetail.status}
                    </span>
                  </div>
                </div>

                {/* Payment Accounts */}
                <div className="p-3.5 rounded-xl bg-dark-800/60 border border-dark-700 space-y-2">
                  <h5 className="text-xs font-bold text-dark-300 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                    Payment Method Accounts Provided:
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {appDetail.paymentMethods?.bkash && (
                      <div className="p-2 rounded bg-dark-900/60 border border-dark-750">
                        <span className="text-pink-400 font-bold block text-[10px]">bKash</span>
                        <span className="text-white font-mono">{appDetail.paymentMethods.bkash}</span>
                      </div>
                    )}
                    {appDetail.paymentMethods?.nagad && (
                      <div className="p-2 rounded bg-dark-900/60 border border-dark-750">
                        <span className="text-orange-400 font-bold block text-[10px]">Nagad</span>
                        <span className="text-white font-mono">{appDetail.paymentMethods.nagad}</span>
                      </div>
                    )}
                    {appDetail.paymentMethods?.rocket && (
                      <div className="p-2 rounded bg-dark-900/60 border border-dark-750">
                        <span className="text-purple-400 font-bold block text-[10px]">Rocket</span>
                        <span className="text-white font-mono">{appDetail.paymentMethods.rocket}</span>
                      </div>
                    )}
                    {appDetail.paymentMethods?.binance && (
                      <div className="p-2 rounded bg-dark-900/60 border border-dark-750">
                        <span className="text-yellow-400 font-bold block text-[10px]">Binance BEP20</span>
                        <span className="text-white font-mono truncate block" title={appDetail.paymentMethods.binance}>
                          {appDetail.paymentMethods.binance}
                        </span>
                      </div>
                    )}
                    {appDetail.paymentMethods?.bybit && (
                      <div className="p-2 rounded bg-dark-900/60 border border-dark-750">
                        <span className="text-amber-400 font-bold block text-[10px]">Bybit TRC20</span>
                        <span className="text-white font-mono truncate block" title={appDetail.paymentMethods.bybit}>
                          {appDetail.paymentMethods.bybit}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {appDetail.notes && (
                  <div className="p-3 rounded-lg bg-dark-800/40 border border-dark-700 text-xs">
                    <span className="text-dark-400 block mb-1">Applicant Note:</span>
                    <p className="text-dark-200">{appDetail.notes}</p>
                  </div>
                )}

                {/* Rejection reason if rejected */}
                {appDetail.status === 'rejected' && appDetail.rejectionReason && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
                    <span className="font-bold block mb-1">Rejection Reason:</span>
                    <p>{appDetail.rejectionReason}</p>
                  </div>
                )}

                {/* Modal Action Buttons */}
                {appDetail.status === 'pending' && (
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-800">
                    <button
                      onClick={() => openRejectModal(appDetail._id)}
                      disabled={reviewing}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Reject Application
                    </button>
                    <button
                      onClick={() => handleApprove(appDetail._id)}
                      disabled={reviewing}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/30"
                    >
                      <Check className="w-4 h-4" />
                      Approve & Grant Diamond Seller Badge
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              Reject Diamond Seller Application
            </h3>
            <p className="text-xs text-dark-400 mb-4">
              Please specify the reason for rejecting this application. This reason will be sent to the user.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Contact details invalid, incomplete payment details, or insufficient active diamond volume..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-xl p-3 text-xs text-white placeholder-dark-500 focus:outline-none focus:border-rose-500 mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingAppId(null);
                }}
                className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-dark-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={reviewing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {reviewing ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
