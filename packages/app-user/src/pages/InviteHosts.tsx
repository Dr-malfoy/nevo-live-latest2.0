import { useEffect, useState } from 'react';
import { PiClockFill as Clock, PiQuestionFill as HelpCircle, PiShareNetworkFill as Share2 } from 'react-icons/pi';
import { referralApi, type AgencyInvitation } from '../api/social.api';
import { optional } from '../api/pending';
import { useUIStore } from '../stores';
import { ScreenHeader, SectionCard, EmptyState } from '../components/common';
import { timeAgo } from '../lib/time';

/**
 * Invite more hosts — requirement #25.
 *
 * `POST /api/agency/invite` is specified in BACKEND-GUIDE.md §4.4.
 * The form validates locally; the server re-checks and rejects a user who
 * already belongs to an agency.
 */
export const InviteHosts = () => {
  const showToast = useUIStore((s) => s.showToast);

  const [userId, setUserId] = useState('');
  const [hostCode, setHostCode] = useState('');
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<AgencyInvitation[] | null>(null);

  useEffect(() => {
    if (!historyOpen || history) return;
    optional(referralApi.getInvitations())
      .then((res) => setHistory(res?.data ?? []))
      .catch(() => setHistory([]));
  }, [historyOpen, history]);

  const canSend = userId.trim().length >= 4 && hostCode.trim().length > 0 && !sending;

  const send = async () => {
    setSending(true);
    try {
      const res = await optional(referralApi.inviteHost(userId.trim(), hostCode.trim()));
      if (res === null) {
        showToast('Host invitations are not connected yet', 'info');
        return;
      }
      if (res.success) {
        showToast('Invitation sent', 'success');
        setUserId('');
        setHostCode('');
        setHistory(null);
      } else {
        showToast(res.error || 'Could not send the invitation', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Could not send the invitation', 'error');
    } finally {
      setSending(false);
    }
  };

  const shareDownload = async () => {
    const url = window.location.origin;
    try {
      if (navigator.share) await navigator.share({ title: 'Join Navo Live', url });
      else {
        await navigator.clipboard.writeText(url);
        showToast('Download link copied', 'success');
      }
    } catch {
      /* dismissed */
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#C86CFF] via-[#E8A0FF] to-surface-soft pb-10">
      <ScreenHeader
        title="Invite more hosts"
        variant="media"
        right={
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            aria-label="Invitation history"
            className="w-8 h-8 flex items-center justify-center text-white"
          >
            <Clock className="w-5 h-5" />
          </button>
        }
      />

      {/* Illustration band */}
      <div className="h-28 flex items-end justify-center gap-4 text-5xl select-none" aria-hidden="true">
        <span>🧑‍💼</span>
        <span className="text-6xl">🧑‍🎤</span>
        <span>💸</span>
      </div>

      <div className="px-3 pt-4 space-y-3">
        {/* Form card (#25.3) */}
        <div className="bg-white rounded-card overflow-hidden">
          <div className="bg-[#A855F7] px-4 py-3">
            <p className="text-white font-bold text-sm">Invite friends to join my agency</p>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-semibold text-ink flex items-center gap-1 mb-1.5">
                User ID <span className="text-role-host">*</span>
                <span title="Enter your friend's User ID">
                  <HelpCircle className="w-3.5 h-3.5 text-ink-faint" />
                </span>
              </label>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                placeholder="User ID"
                className="w-full h-12 px-4 rounded-xl bg-surface-sunken text-ink placeholder:text-ink-faint
                  border border-transparent focus:bg-white focus:border-accent-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-ink flex items-center gap-1 mb-1.5">
                Host Code <span className="text-role-host">*</span>
                <span title="The host's invitation code">
                  <HelpCircle className="w-3.5 h-3.5 text-ink-faint" />
                </span>
              </label>
              <input
                value={hostCode}
                onChange={(e) => setHostCode(e.target.value)}
                placeholder="Host code No..xxx"
                className="w-full h-12 px-4 rounded-xl bg-surface-sunken text-ink placeholder:text-ink-faint
                  border border-transparent focus:bg-white focus:border-accent-500 focus:outline-none transition-colors"
              />
            </div>

            <p className="text-xs text-ink-muted">User ID and code are provided by the host.</p>

            <button
              onClick={send}
              disabled={!canSend}
              className={`w-full h-13 py-3.5 rounded-full font-bold text-white transition-colors ${
                canSend ? 'bg-[#7C3AED]' : 'bg-[#C4B5FD]'
              }`}
            >
              {sending ? 'Sending…' : 'Send invitation'}
            </button>
          </div>
        </div>

        {/* Not-registered card (#25.4) */}
        <div className="rounded-card p-1 bg-gradient-to-r from-[#C86CFF] to-[#E8A0FF]">
          <div className="bg-white rounded-[18px] p-4 text-center">
            <p className="font-bold text-[#7C3AED] underline">
              If a friend has not downloaded or registered
            </p>
            <p className="text-sm text-ink-muted mt-2 leading-relaxed">
              Share the download link. When they register with your ID you receive the reward.
            </p>
            <button
              onClick={shareDownload}
              className="mt-3 h-10 px-5 rounded-full bg-[#C86CFF] text-white text-sm font-bold inline-flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" /> Share Now
            </button>
          </div>
        </div>

        {/* History */}
        {historyOpen && (
          <SectionCard title="Invitation history" flush>
            {!history ? (
              <p className="px-4 pb-4 text-sm text-ink-muted">Loading…</p>
            ) : history.length === 0 ? (
              <EmptyState title="No invitations yet" className="!py-8" />
            ) : (
              <div className="divide-y divide-line">
                {history.map((row) => (
                  <div key={row._id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink text-sm truncate">{row.invitee.nickname}</p>
                      <p className="text-[11px] text-ink-muted">
                        ID {row.invitee.uid} · {timeAgo(row.sentAt)}
                      </p>
                    </div>
                    <span
                      className={`h-6 px-2 rounded-full text-[10px] font-bold flex items-center ${
                        row.status === 'accepted'
                          ? 'bg-status-online/10 text-status-online'
                          : row.status === 'pending'
                            ? 'bg-surface-sunken text-ink-muted'
                            : 'bg-role-host/10 text-role-host'
                      }`}
                    >
                      {row.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}
      </div>
    </div>
  );
};
