import { useEffect, useState } from 'react';
import { PiXBold as X, PiPaperPlaneRightFill as Send, PiCheckCircleFill as CheckCircle } from 'react-icons/pi';
import { contactApi } from '../../api';

export const ContactUsModal = ({ onClose }: { onClose: () => void }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const loadHistory = () => {
    contactApi.getMyMessages({ limit: 20 }).then(({ data }) => {
      if (data.success) setHistory(data.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) { setErr('Please fill in both subject and message'); return; }
    setSubmitting(true); setMsg(''); setErr('');
    try {
      await contactApi.sendMessage({ subject: subject.trim(), message: message.trim() });
      setMsg('Message sent to the admin. They will get back to you.');
      setSubject(''); setMessage('');
      loadHistory();
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Failed to send message');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-surface-sunken z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-surface-sunken w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg">Contact Us</h3>
          <button onClick={onClose} className="p-1 text-ink-muted hover:text-ink"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-ink-muted mb-4">Send a message directly to the admin. We usually respond within 24 hours.</p>

        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          maxLength={120}
          className="w-full bg-dark-700 rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your message..."
          rows={4}
          maxLength={2000}
          className="w-full bg-dark-700 rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-accent-500 resize-none"
        />

        {msg && <div className="text-xs text-green-400 mb-3 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {msg}</div>}
        {err && <div className="text-xs text-red-400 mb-3">{err}</div>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-2.5 bg-black text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" /> {submitting ? 'Sending...' : 'Send to Admin'}
        </button>

        {/* History */}
        <div className="mt-5">
          <h4 className="text-sm font-medium text-ink-muted mb-2">Your Messages</h4>
          {loading ? <p className="text-xs text-ink-muted">Loading...</p> :
            history.length === 0 ? <p className="text-xs text-ink-faint">No messages yet.</p> :
            <div className="space-y-2">
              {history.map((h: any) => (
                <div key={h._id} className="p-3 bg-dark-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{h.subject}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${h.status === 'resolved' ? 'bg-green-600' : 'bg-yellow-600'}`}>{h.status}</span>
                  </div>
                  <p className="text-xs text-ink-muted mt-1">{h.message}</p>
                  {h.adminReply && (
                    <div className="mt-2 p-2 bg-black/10 border border-primary-600/30 rounded-lg">
                      <p className="text-[10px] text-accent-500 mb-0.5">Admin reply:</p>
                      <p className="text-xs">{h.adminReply}</p>
                    </div>
                  )}
                  <p className="text-[10px] text-ink-faint mt-1.5">{new Date(h.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          }
        </div>
      </div>
    </div>
  );
};
