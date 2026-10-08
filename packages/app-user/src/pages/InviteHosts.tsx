import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiClockFill as Clock, PiQuestionFill as HelpCircle, PiShareNetworkFill as Share2, PiShieldWarningFill as ShieldAlert, PiBuildingsFill as AgencyIcon, PiCopyFill as CopyIcon } from 'react-icons/pi';
import { referralApi, type AgencyInvitation } from '../api/social.api';
import { agencyApi } from '../api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { ScreenHeader, SectionCard, EmptyState } from '../components/common';
import { timeAgo } from '../lib/time';

/**
 * Invite more hosts — requirement #25.
 *
 * Exclusively available for agents.
 * `POST /api/agency/invite` is specified in BACKEND-GUIDE.md §4.4.
 * The form validates locally; the server re-checks and rejects a user who
 * already belongs to an agency.
 */
export const InviteHosts = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const isAgent = Boolean(
    user?.isAgent ||
    user?.role === 'agent' ||
    user?.isAdmin ||
    user?.role === 'admin'
  );

  const [userId, setUserId] = useState('');
  const [hostCode, setHostCode] = useState('');
  const [myAgencyCode, setMyAgencyCode] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<AgencyInvitation[] | null>(null);

  useEffect(() => {
    if (!isAgent) return;
    agencyApi.getMyAgency()
      .then((res) => {
        if (res?.data?.success && res.data.data?.code) {
          setMyAgencyCode(res.data.data.code);
          setHostCode((prev) => prev || res.data.data.code);
        }
      })
      .catch(() => {});
  }, [isAgent]);

  useEffect(() => {
    if (!isAgent) return;
    if (!historyOpen || history) return;
    optional(referralApi.getInvitations())
      .then((res) => setHistory(res?.data ?? []))
      .catch(() => setHistory([]));
  }, [historyOpen, history, isAgent]);

  if (!isAgent) {
    return (
      <div className="min-h-screen bg-surface-soft flex flex-col">
        <ScreenHeader title="Invite Hosts" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-4 text-3xl shadow-xs">
            <ShieldAlert className="w-10 h-10 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">Agent Access Only</h2>
          <p className="text-sm text-ink-muted max-w-xs mb-6">
            The Host Invitation portal is exclusively available for registered Agents and Agency Managers.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => navigate('/agency')}
              className="w-full py-3 rounded-full bg-[#7C3AED] text-white font-bold text-sm shadow-md active:scale-95 transition-transform"
            >
              Explore Agencies
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full py-3 rounded-full bg-white border border-line text-ink font-semibold text-sm hover:bg-surface-sunken active:scale-95 transition-transform"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        showToast('Invitation sent successfully!', 'success');
        setUserId('');
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

            {myAgencyCode && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-xs">
                <span className="text-purple-700 font-medium">My Agency Code: <strong className="text-purple-900 font-bold">{myAgencyCode}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setHostCode(myAgencyCode);
                    showToast('Agency code applied', 'info');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-semibold text-[11px] active:scale-95 transition-transform"
                >
                  Use My Code
                </button>
              </div>
            )}

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
