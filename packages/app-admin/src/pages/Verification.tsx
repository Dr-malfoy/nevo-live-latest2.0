import { useEffect, useState } from 'react';
import { BadgeCheck, XCircle, ExternalLink, Clock, Check, X, ShieldCheck, ArrowLeft, CreditCard, Camera, User, ZoomIn } from 'lucide-react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';

type Row = any;

const statusColors: any = {
  pending: 'bg-amber-600/20 text-amber-400 border border-amber-500/30',
  under_review: 'bg-blue-600/20 text-blue-400 border border-blue-500/30',
  verified: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
  rejected: 'bg-red-600/20 text-red-400 border border-red-500/30',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending Review',
  under_review: 'Under Review',
  verified: 'Verified',
  rejected: 'Rejected',
};

export const Verification = () => {
  const [requests, setRequests] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (status) params.status = status;
      const { data } = await adminApi.getVerifications(params);
      if (data.success) {
        setRequests(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, status, reloadTick]);

  // Keep the open review panel in sync after actions.
  useEffect(() => {
    if (selected) {
      const fresh = requests.find((r) => r._id === selected._id);
      if (fresh) setSelected(fresh);
    }
  }, [requests]);

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this NID / ID verification? This will unlock Coin Trading & Diamond Exchange for this user.')) return;
    setBusy(true);
    try {
      await adminApi.approveVerification(id);
      setSelected(null);
      setReloadTick((t) => t + 1);
    } catch {} finally {
      setBusy(false);
    }
  };

  const handleReject = async (id: string, reason?: string) => {
    const note = reason ?? prompt('Enter reason for rejecting this verification request:') ?? undefined;
    if (!note) return;
    setBusy(true);
    try {
      await adminApi.rejectVerification(id, note);
      setSelected(null);
      setReloadTick((t) => t + 1);
    } catch {} finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: 'userId', label: 'Applicant / User',
      render: (r: Row) => {
        const u = typeof r.userId === 'object' ? r.userId : null;
        return (
          <div className="flex items-center gap-2.5">
            {u?.avatar ? (
              <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-dark-600" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-dark-400">
                <User className="w-4 h-4" />
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-white">{r.fullName || u?.nickname || '—'}</p>
              <p className="text-xs text-dark-400 font-mono">UID: {u?.uid || '—'} {u?.phone ? `· ${u.phone}` : ''}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'verificationType', label: 'Verification Type',
      render: (r: Row) => (
        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
          r.verificationType === 'nid' || r.documentFrontUrl
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
        }`}>
          {r.verificationType === 'nid' || r.documentFrontUrl ? (
            <><CreditCard className="w-3 h-3" /> NID / ID Document</>
          ) : (
            <><Camera className="w-3 h-3" /> Live Face Scan</>
          )}
        </span>
      ),
    },
    {
      key: 'nidNumber', label: 'NID / Document ID',
      render: (r: Row) => (
        <span className="font-mono text-xs font-semibold text-white">
          {r.nidNumber || r.olaId || '—'}
        </span>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: (r: Row) => (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[r.status] || 'bg-dark-600 text-dark-300'}`}>
          {statusLabels[r.status] || r.status}
        </span>
      ),
    },
    {
      key: 'submittedAt', label: 'Submitted Date',
      render: (r: Row) => <span className="text-xs text-dark-400">{new Date(r.submittedAt).toLocaleString()}</span>,
    },
    {
      key: '_id', label: 'Actions',
      render: (r: Row) => (
        <button
          onClick={() => { setSelected(r); setRejectReason(''); }}
          className="text-xs font-bold px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors flex items-center gap-1 shadow-sm"
        >
          Review ID
        </button>
      ),
    },
  ];

  const selUser = selected && typeof selected.userId === 'object' ? selected.userId : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary-400" /> NID & Identity Verification
          </h2>
          <p className="text-xs text-dark-400 mt-0.5">
            Review and approve user government NID cards to grant trading & financial privileges.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
          >
            <option value="">All Verification Statuses</option>
            <option value="pending">Pending Admin Review</option>
            <option value="under_review">Under Review</option>
            <option value="verified">Verified (Approved)</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <DataTable columns={columns} data={requests} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* ── Detailed Review Modal ────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-700 sticky top-0 bg-dark-800/95 backdrop-blur z-10">
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(null)} className="p-1 hover:bg-dark-700 rounded-lg text-dark-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-base">NID / Document Review</h3>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusColors[selected.status] || 'bg-dark-600'}`}>
                {statusLabels[selected.status] || selected.status}
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Applicant Summary */}
              <div className="flex items-center gap-3 p-3.5 bg-dark-700/60 rounded-xl border border-dark-700">
                {selUser?.avatar ? (
                  <img src={selUser.avatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-primary-500" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-dark-600 flex items-center justify-center text-dark-300">
                    <User className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-base text-white">{selected.fullName || selUser?.nickname || '—'}</p>
                  <p className="text-xs text-dark-400">
                    Nickname: <strong className="text-white">{selUser?.nickname}</strong> · UID: <strong className="text-primary-400 font-mono">{selUser?.uid}</strong> · Phone: {selUser?.phone || '—'}
                  </p>
                </div>
                <span className="ml-auto text-xs px-2.5 py-1 bg-dark-600 text-dark-200 rounded-md uppercase font-semibold">
                  {selected.accountType || selUser?.role || 'User'}
                </span>
              </div>

              {/* NID / Identity info */}
              <div>
                <p className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">Submitted Identity Details</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-dark-700/60 border border-dark-700 rounded-xl p-3">
                    <p className="text-[11px] text-dark-400 uppercase mb-0.5">NID / Document Number</p>
                    <p className="font-mono font-bold text-white text-base">{selected.nidNumber || selected.olaId || '—'}</p>
                  </div>
                  <div className="bg-dark-700/60 border border-dark-700 rounded-xl p-3">
                    <p className="text-[11px] text-dark-400 uppercase mb-0.5">Document Type</p>
                    <p className="font-bold text-white uppercase">{selected.documentType || 'NID'}</p>
                  </div>
                  <div className="bg-dark-700/60 border border-dark-700 rounded-xl p-3">
                    <p className="text-[11px] text-dark-400 uppercase mb-0.5">Date of Birth</p>
                    <p className="font-medium text-white">{selected.dateOfBirth || 'Not provided'}</p>
                  </div>
                  <div className="bg-dark-700/60 border border-dark-700 rounded-xl p-3">
                    <p className="text-[11px] text-dark-400 uppercase mb-0.5">Submitted Timestamp</p>
                    <p className="font-medium text-white text-xs">{new Date(selected.submittedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Document Photo Previews */}
              <div>
                <p className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">Uploaded Document Photos (Click to Zoom)</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: 'NID Front Side', url: selected.documentFrontUrl || selected.facePhotoUrl },
                    { label: 'NID Back Side', url: selected.documentBackUrl },
                    { label: 'Selfie with NID', url: selected.selfieUrl },
                  ].map((d) => (
                    <div key={d.label} className="bg-dark-700/60 border border-dark-700 rounded-xl overflow-hidden group">
                      {d.url ? (
                        <div
                          onClick={() => setPreviewImage({ url: d.url, title: d.label })}
                          className="relative h-28 cursor-pointer overflow-hidden flex items-center justify-center bg-black/40"
                        >
                          <img src={d.url} alt={d.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-semibold">
                            <ZoomIn className="w-4 h-4" /> Zoom
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-28 flex items-center justify-center text-xs text-dark-500 italic bg-dark-800">
                          Not Provided
                        </div>
                      )}
                      <p className="text-center text-[11px] font-semibold text-dark-300 py-1.5 bg-dark-700 border-t border-dark-600/50">
                        {d.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Existing Rejection Reason Display */}
              {selected.status === 'rejected' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 text-sm">
                  <p className="text-red-400 font-bold text-xs uppercase mb-1">Rejection Reason</p>
                  <p className="text-dark-200">{selected.rejectionReason || 'Documents did not meet criteria.'}</p>
                </div>
              )}

              {/* Audit history */}
              <div>
                <p className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">History & Logs</p>
                <div className="bg-dark-700/40 border border-dark-700 rounded-xl p-3 space-y-2">
                  {selected.auditLog?.length ? (
                    [...selected.auditLog].reverse().map((a: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Clock className="w-3.5 h-3.5 text-dark-400 shrink-0" />
                        <span className="text-white font-semibold">{a.action}</span>
                        <span className="text-dark-400">({a.from} → {a.to})</span>
                        <span className="ml-auto text-dark-500">{new Date(a.timestamp).toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-dark-500">No activity history recorded.</p>
                  )}
                </div>
              </div>

              {/* Admin Decision Actions */}
              {selected.status === 'pending' || selected.status === 'under_review' ? (
                <div className="border-t border-dark-700 pt-4 space-y-3">
                  <p className="text-sm font-bold text-white">Admin Action</p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter rejection note if declining this application..."
                    rows={2}
                    className="w-full bg-dark-700 border border-dark-600 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 placeholder-dark-500"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(selected._id)}
                      disabled={busy}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-40"
                    >
                      <Check className="w-4 h-4" /> Approve & Verify NID
                    </button>
                    <button
                      onClick={() => handleReject(selected._id, rejectReason.trim() || undefined)}
                      disabled={busy}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-600/20 disabled:opacity-40"
                    >
                      <X className="w-4 h-4" /> Reject NID
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-dark-400 border-t border-dark-700 pt-4">
                  {selected.status === 'verified' ? (
                    <>
                      <BadgeCheck className="w-5 h-5 text-emerald-400" />
                      <span className="font-bold text-emerald-400">Approved by Admin</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-400" />
                      <span className="font-bold text-red-400">Rejected by Admin</span>
                    </>
                  )}
                  {typeof selected.reviewedBy === 'object' && selected.reviewedBy && (
                    <span className="ml-auto text-xs text-dark-400">Reviewed by {selected.reviewedBy.nickname}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── High-Resolution Image Zoom Modal ─────────────────────────────── */}
      {previewImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-3xl w-full flex flex-col items-center">
            <div className="w-full flex items-center justify-between text-white mb-2">
              <span className="font-bold text-sm">{previewImage.title}</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-full bg-dark-700 hover:bg-dark-600 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain border border-dark-700 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
