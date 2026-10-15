import { useEffect, useState } from 'react';
import {
  Crown,
  Sparkles,
  Clock,
  Calendar,
  Gift,
  Check,
  X,
  Eye,
  Search,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  User,
  Radio,
  Award,
  BarChart3,
  Phone,
  CheckCircle2,
  XCircle,
  Hourglass,
  Layers,
} from 'lucide-react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';
import { getMediaUrl } from '../lib/media';

export const HostApplications = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [hostTypeFilter, setHostTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  // Detail Modal & History states
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [appDetail, setAppDetail] = useState<any>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'live' | 'watch' | 'gifts'>('overview');

  // Review states
  const [reviewing, setReviewing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async (p = page, status = statusFilter, type = hostTypeFilter, q = search) => {
    setLoading(true);
    try {
      const { data } = await adminApi.getHostApplications({
        page: p,
        limit: 15,
        status: status !== 'all' ? status : undefined,
        hostType: type !== 'all' ? type : undefined,
        search: q.trim() || undefined,
      });

      if (data.success) {
        setApplications(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load host applications', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingCount = async () => {
    try {
      const { data } = await adminApi.getHostApplications({ status: 'pending', limit: 1 });
      if (data.success) {
        setPendingCount(data.pagination?.total || 0);
      }
    } catch {}
  };

  useEffect(() => {
    load(page, statusFilter, hostTypeFilter, search);
    loadPendingCount();
  }, [page, statusFilter, hostTypeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1, statusFilter, hostTypeFilter, search);
  };

  const openDetail = async (id: string) => {
    setSelectedAppId(id);
    setActiveDetailTab('overview');
    setDetailLoading(true);
    try {
      const { data } = await adminApi.getHostApplicationDetail(id);
      if (data.success) {
        setAppDetail(data.data);
      }
    } catch (err: any) {
      setToastMsg({ type: 'error', text: err?.response?.data?.error || 'Failed to load details' });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReview = async (action: 'approve' | 'reject', reason?: string) => {
    if (!selectedAppId) return;
    setReviewing(true);
    try {
      const { data } = await adminApi.reviewHostApplication(selectedAppId, action, reason);
      if (data.success) {
        setToastMsg({
          type: 'success',
          text: action === 'approve' ? 'Host application APPROVED and Badge assigned!' : 'Host application REJECTED',
        });
        setShowRejectModal(false);
        setRejectionReason('');
        // Refresh details & list
        await openDetail(selectedAppId);
        load();
        loadPendingCount();
      }
    } catch (err: any) {
      setToastMsg({ type: 'error', text: err?.response?.data?.error || 'Action failed' });
    } finally {
      setReviewing(false);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const columns = [
    {
      key: 'applicant',
      label: 'Applicant',
      render: (r: any) => (
        <div className="flex items-center gap-3">
          <img
            src={getMediaUrl(r.userId?.avatar) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
            alt=""
            className="w-10 h-10 rounded-full object-cover border border-dark-700 bg-dark-800 shrink-0"
          />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-white text-sm">{r.userId?.nickname || 'Unknown'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-dark-800 text-dark-300 font-mono">
                UID: {r.userId?.uid || '—'}
              </span>
            </div>
            <p className="text-xs text-dark-400 mt-0.5">
              Name: <span className="text-dark-200 font-medium">{r.realName}</span> · Phone: {r.phone}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'hostType',
      label: 'Applied For',
      render: (r: any) => (
        <div>
          {r.hostType === 'alpha' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold">
              <Crown className="w-3.5 h-3.5" />
              <span>Alpha Host (Male ♂️)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Aurora Host (Female ♀️)</span>
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'performance7d',
      label: '7-Day Performance',
      render: (r: any) => {
        const stats = r.statsAtApplication || {};
        return (
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-dark-400">Live Time:</span>
              <span className={`font-bold tabular-nums ${stats.meetsLiveTime ? 'text-emerald-400' : 'text-dark-300'}`}>
                {stats.liveHours7d || 0}h / 14h
              </span>
              {stats.meetsLiveTime ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <X className="w-3 h-3 text-dark-500" />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-dark-400">Active Days:</span>
              <span className={`font-bold tabular-nums ${stats.meetsDailyRules ? 'text-emerald-400' : 'text-dark-300'}`}>
                {stats.validDays7d || 0} / 5d (≥1.5h)
              </span>
              {stats.meetsDailyRules ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <X className="w-3 h-3 text-dark-500" />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-dark-400">Gifts:</span>
              <span className={`font-bold tabular-nums ${stats.meetsGiftCoins ? 'text-emerald-400' : 'text-dark-300'}`}>
                {(stats.giftCoins7d || 0).toLocaleString()} / 80k
              </span>
              {stats.meetsGiftCoins ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <X className="w-3 h-3 text-dark-500" />
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (r: any) => (
        <div>
          {r.status === 'approved' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approved
            </span>
          ) : r.status === 'rejected' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold">
              <XCircle className="w-3.5 h-3.5" /> Rejected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold animate-pulse">
              <Hourglass className="w-3.5 h-3.5" /> Pending
            </span>
          )}
          <p className="text-[10px] text-dark-400 mt-1">
            {new Date(r.createdAt).toLocaleDateString()}
          </p>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      render: (r: any) => (
        <button
          onClick={() => openDetail(r._id)}
          className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Full History & Review</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm flex items-center gap-2 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
              : 'bg-red-950/90 text-red-300 border-red-700'
          }`}
        >
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white">Host Applications</h1>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-dark-950 text-xs font-black animate-pulse">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-sm text-dark-400 mt-1">
            Review applicant qualifications, streaming watch time history, and approve Alpha / Aurora Host badges.
          </p>
        </div>

        <button
          onClick={() => {
            load();
            loadPendingCount();
          }}
          className="px-3.5 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-white text-xs font-semibold inline-flex items-center gap-2 border border-dark-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-dark-900/60 p-3 rounded-xl border border-dark-800">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: 'all', label: 'All Applications' },
            { key: 'pending', label: 'Pending' },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setStatusFilter(key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === key
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}

          <div className="w-px h-6 bg-dark-700 mx-1 shrink-0" />

          {/* Type filter */}
          <select
            value={hostTypeFilter}
            onChange={(e) => {
              setHostTypeFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 px-2.5 rounded-lg bg-dark-800 text-dark-200 border border-dark-700 text-xs font-medium focus:outline-none"
          >
            <option value="all">All Host Types</option>
            <option value="alpha">Alpha Host (Male ♂️)</option>
            <option value="aurora">Aurora Host (Female ♀️)</option>
          </select>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search UID, Name, Phone..."
              className="w-56 h-8 pl-9 pr-3 rounded-lg bg-dark-800 text-white border border-dark-700 text-xs focus:outline-none focus:border-primary-500"
            />
          </div>
          <button
            type="submit"
            className="h-8 px-3 rounded-lg bg-dark-800 hover:bg-dark-700 text-white text-xs font-semibold border border-dark-700"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={applications}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Full History & Details Modal */}
      {selectedAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-dark-800 flex items-center justify-between bg-dark-950">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-primary-400" />
                <h3 className="font-bold text-white text-base">Host Application & Streaming History</h3>
              </div>
              <button
                onClick={() => setSelectedAppId(null)}
                className="p-1 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {detailLoading || !appDetail ? (
              <div className="p-16 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Applicant Summary Banner */}
                <div className="p-4 rounded-xl bg-dark-800/80 border border-dark-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={getMediaUrl(appDetail.application?.userId?.avatar)}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover border-2 border-primary-500 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-extrabold text-white">
                          {appDetail.application?.userId?.nickname}
                        </h4>
                        <span className="text-xs px-2 py-0.5 rounded bg-dark-700 text-dark-300 font-mono">
                          UID: {appDetail.application?.userId?.uid}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-primary-950 text-primary-300 border border-primary-800">
                          Lv.{appDetail.application?.userId?.level || 1}
                        </span>
                      </div>
                      <p className="text-xs text-dark-300 mt-1">
                        Applied For:{' '}
                        <strong className={appDetail.application?.hostType === 'alpha' ? 'text-blue-400' : 'text-rose-400'}>
                          {appDetail.application?.hostType === 'alpha' ? 'Alpha Host (Male ♂️)' : 'Aurora Host (Female ♀️)'}
                        </strong>
                      </p>
                      <p className="text-xs text-dark-400">
                        Real Name: <span className="text-white font-medium">{appDetail.application?.realName}</span> · Phone: {appDetail.application?.phone}
                        {appDetail.application?.whatsapp && ` · WhatsApp: ${appDetail.application?.whatsapp}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                      appDetail.application?.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : appDetail.application?.status === 'rejected'
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    }`}>
                      {appDetail.application?.status?.toUpperCase()}
                    </span>
                    <p className="text-[11px] text-dark-400 mt-1">
                      Applied: {new Date(appDetail.application?.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-dark-800 pb-2">
                  {[
                    { key: 'overview', label: '7-Day Rules & Bio', icon: ShieldCheck },
                    { key: 'live', label: 'Live Time History', icon: Radio },
                    { key: 'watch', label: 'Watch Time & Viewers', icon: BarChart3 },
                    { key: 'gifts', label: 'Gift History & Top Fans', icon: Gift },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setActiveDetailTab(key as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                        activeDetailTab === key
                          ? 'bg-primary-600 text-white'
                          : 'text-dark-400 hover:text-white hover:bg-dark-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab 1: Overview & 7-Day Conditions */}
                {activeDetailTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Condition 1 */}
                      <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700 space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-dark-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-400" /> সময় (Live Time)
                          </span>
                          <span className={appDetail.application?.statsAtApplication?.meetsLiveTime ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                            {appDetail.application?.statsAtApplication?.meetsLiveTime ? '✓ Passed' : '✗ Failed'}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-white tabular-nums">
                          {appDetail.application?.statsAtApplication?.liveHours7d || 0} hrs
                        </p>
                        <p className="text-[11px] text-dark-400">Requirement: 14 hrs / 7 days</p>
                      </div>

                      {/* Condition 2 */}
                      <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700 space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-dark-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-purple-400" /> ডেইলি রুলস (Days)
                          </span>
                          <span className={appDetail.application?.statsAtApplication?.meetsDailyRules ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                            {appDetail.application?.statsAtApplication?.meetsDailyRules ? '✓ Passed' : '✗ Failed'}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-white tabular-nums">
                          {appDetail.application?.statsAtApplication?.validDays7d || 0} Days
                        </p>
                        <p className="text-[11px] text-dark-400">Requirement: ≥ 5 days (≥1.5h/day)</p>
                      </div>

                      {/* Condition 3 */}
                      <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700 space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-dark-400">
                          <span className="flex items-center gap-1">
                            <Gift className="w-3.5 h-3.5 text-amber-400" /> গিফট (Gift Coins)
                          </span>
                          <span className={appDetail.application?.statsAtApplication?.meetsGiftCoins ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                            {appDetail.application?.statsAtApplication?.meetsGiftCoins ? '✓ Passed' : '✗ Failed'}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-white tabular-nums">
                          {(appDetail.application?.statsAtApplication?.giftCoins7d || 0).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-dark-400">Requirement: ≥ 80,000 coins</p>
                      </div>
                    </div>

                    {/* Bio & Intro */}
                    {appDetail.application?.bio && (
                      <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700">
                        <h5 className="text-xs font-bold text-dark-300 mb-1">Applicant Bio & Talents:</h5>
                        <p className="text-xs text-white leading-relaxed">{appDetail.application.bio}</p>
                      </div>
                    )}

                    {/* Social Link */}
                    {appDetail.application?.socialLink && (
                      <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-between">
                        <span className="text-xs text-dark-300">Social Media / Portfolio:</span>
                        <a
                          href={appDetail.application.socialLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary-400 underline font-semibold hover:text-primary-300"
                        >
                          {appDetail.application.socialLink}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Live Time History */}
                {activeDetailTab === 'live' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div className="p-3 rounded-xl bg-dark-800 border border-dark-700">
                        <span className="text-xs text-dark-400">Total Lifetime Stream Hours</span>
                        <p className="text-lg font-bold text-white tabular-nums mt-0.5">
                          {appDetail.history?.liveTime?.totalLiveHours || 0} hrs
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-dark-800 border border-dark-700">
                        <span className="text-xs text-dark-400">Total Stream Broadcasts</span>
                        <p className="text-lg font-bold text-white tabular-nums mt-0.5">
                          {appDetail.history?.liveTime?.totalStreams || 0} sessions
                        </p>
                      </div>
                    </div>

                    <h5 className="text-xs font-bold text-dark-300">Recent Stream Sessions:</h5>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {appDetail.history?.liveTime?.recentStreams?.length ? (
                        appDetail.history.liveTime.recentStreams.map((s: any) => (
                          <div
                            key={s._id}
                            className="p-2.5 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-bold text-white">{s.title || 'Live Broadcast'}</p>
                              <p className="text-[11px] text-dark-400 mt-0.5">
                                {new Date(s.startedAt).toLocaleString()} · Type: {s.type}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-primary-300 font-bold">
                                {s.durationMinutes} mins
                              </span>
                              <p className="text-[10px] text-dark-400">{s.totalViewers || 0} viewers</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-dark-400 text-center py-6">No stream sessions found.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 3: Watch Time & Viewers History */}
                {activeDetailTab === 'watch' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700 text-center">
                        <span className="text-xs text-dark-400">Total Stream Views</span>
                        <p className="text-xl font-bold text-white tabular-nums mt-1">
                          {appDetail.history?.watchTime?.totalStreamViews?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700 text-center">
                        <span className="text-xs text-dark-400">Peak Viewer Count</span>
                        <p className="text-xl font-bold text-amber-400 tabular-nums mt-1">
                          {appDetail.history?.watchTime?.peakViewerCount || 0}
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700 text-center">
                        <span className="text-xs text-dark-400">Average Viewers / Stream</span>
                        <p className="text-xl font-bold text-primary-400 tabular-nums mt-1">
                          {appDetail.history?.watchTime?.averageViewers || 0}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-dark-800/60 border border-dark-700">
                      <h5 className="text-xs font-bold text-white mb-1">Viewer Engagement Assessment:</h5>
                      <p className="text-xs text-dark-300 leading-relaxed">
                        The applicant has reached a maximum of{' '}
                        <strong className="text-white">{appDetail.history?.watchTime?.peakViewerCount || 0} concurrent viewers</strong>{' '}
                        and maintains an average audience of{' '}
                        <strong className="text-white">{appDetail.history?.watchTime?.averageViewers || 0} viewers per stream session</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab 4: Gift History & Top Gifters */}
                {activeDetailTab === 'gifts' && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-dark-400">Lifetime Gifts Received</span>
                        <p className="text-xl font-bold text-amber-400 tabular-nums mt-0.5">
                          {(appDetail.history?.gifts?.totalGiftCoinsLifetime || 0).toLocaleString()} Coins
                        </p>
                      </div>
                      <span className="text-xs font-bold text-dark-300">
                        {appDetail.history?.gifts?.totalGiftsCountLifetime || 0} gifts received
                      </span>
                    </div>

                    {/* Top Gifters */}
                    <div>
                      <h5 className="text-xs font-bold text-dark-300 mb-2">Top Supporters / Gifters:</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {appDetail.history?.gifts?.topGifters?.length ? (
                          appDetail.history.gifts.topGifters.map((g: any, idx: number) => (
                            <div
                              key={String(g.user?._id) + idx}
                              className="p-2.5 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-dark-700 text-[10px] font-black flex items-center justify-center text-amber-400">
                                  #{idx + 1}
                                </span>
                                <div>
                                  <p className="text-xs font-bold text-white">{g.user?.nickname || 'User'}</p>
                                  <p className="text-[10px] text-dark-400 font-mono">UID: {g.user?.uid || '—'}</p>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-amber-400 tabular-nums">
                                {g.totalCoins.toLocaleString()} Coins
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-dark-400 py-3">No gift records found.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer / Review Controls */}
            {appDetail && (
              <div className="p-4 border-t border-dark-800 bg-dark-950 flex items-center justify-between gap-3">
                <button
                  onClick={() => setSelectedAppId(null)}
                  className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-dark-300 text-xs font-bold"
                >
                  Close
                </button>

                {appDetail.application?.status === 'pending' ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={reviewing}
                      className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleReview('approve')}
                      disabled={reviewing}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve & Grant Badge</span>
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-dark-400">
                    Decision: <strong>{appDetail.application?.status?.toUpperCase()}</strong>
                    {appDetail.application?.reviewedAt && ` on ${new Date(appDetail.application.reviewedAt).toLocaleDateString()}`}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Confirmation Prompt Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md bg-dark-900 border border-dark-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-bold text-sm text-white">Reject Host Application</h4>
            </div>
            <p className="text-xs text-dark-300">
              Please enter the reason for rejecting this application. This reason will be sent as a notification to the applicant.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete daily streaming rules, insufficient active days, or invalid contact info..."
              className="w-full p-3 rounded-xl bg-dark-800 border border-dark-700 text-xs text-white placeholder-dark-500 focus:outline-none focus:border-red-500 resize-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-dark-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview('reject', rejectionReason)}
                disabled={reviewing}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
