import { useState } from 'react';
import { reportApi } from '../../api/report.api';

const REASONS = [
  'Spam or scam',
  'Inappropriate content',
  'Harassment or bullying',
  'Impersonation',
  'Nudity or sexual content',
  'Violence or harmful behavior',
  'Other',
];

export const ReportModal = ({ targetType, targetId, onClose }: { targetType: 'user' | 'stream' | 'moment' | 'transaction'; targetId: string; onClose: () => void }) => {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true); setMsg(''); setErr('');
    try {
      await reportApi.createReport({ targetType, targetId, reason, details: details || undefined });
      setMsg('Report submitted. Our team will review it.');
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Failed to submit report');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-surface-sunken z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-surface-sunken w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-1">Report</h3>
        <p className="text-xs text-ink-muted mb-4">Help us keep the community safe.</p>

        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full bg-dark-700 rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-accent-500"
        >
          {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Add details (optional)"
          rows={3}
          className="w-full bg-dark-700 rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-accent-500 resize-none"
        />

        {msg && <div className="text-xs text-green-400 mb-3">{msg}</div>}
        {err && <div className="text-xs text-red-400 mb-3">{err}</div>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-dark-700 rounded-lg text-sm">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !!msg}
            className="px-4 py-2 bg-red-600 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
};
