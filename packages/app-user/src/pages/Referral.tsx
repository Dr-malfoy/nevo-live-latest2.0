import { useEffect, useState } from 'react';
import {
  PiCheckBold as Check,
  PiClockFill as Clock,
  PiCopyFill as Copy,
  PiShareNetworkFill as Share2,
  PiLinkBold as LinkIcon,
  PiGiftFill as GiftIcon,
} from 'react-icons/pi';
import { referralApi, type ReferralTemplate } from '../api/social.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { ScreenHeader, TabBar, PillTabs, EmptyState, PendingApiNotice } from '../components/common';
import { Avatar } from '../components/user';
import { Loading } from '../components/ui';
import { compactNumber } from '../lib/time';

/**
 * Link Referral + ID invite — requirements #27 and #58.
 */

type Tab = 'link' | 'id';
type Source = 'templates' | 'materials';

export const Referral = () => {
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [tab, setTab] = useState<Tab>('link');
  const [source, setSource] = useState<Source>('templates');
  const [templates, setTemplates] = useState<ReferralTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const uid = user?.uid || '';
  const inviteLink = uid ? `${window.location.origin}/invite/${uid}` : window.location.origin;

  useEffect(() => {
    if (tab !== 'link') return;
    let cancelled = false;
    setLoading(true);

    optional(source === 'templates' ? referralApi.getTemplates() : referralApi.getMaterials())
      .then((res) => {
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data)) {
          setTemplates(res.data);
          setLive(true);
        } else {
          setTemplates([]);
          setLive(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTemplates([]);
          setLive(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, source]);

  const copyReferenceCode = async () => {
    if (!uid) return;
    try {
      await navigator.clipboard.writeText(uid);
      setCopiedCode(true);
      showToast(`Reference code ${uid} copied to clipboard!`, 'success');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast('Could not access clipboard', 'error');
    }
  };

  const copyReferenceLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      showToast('Referral link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showToast('Could not access clipboard', 'error');
    }
  };

  const share = async (template: ReferralTemplate) => {
    const res = await optional(referralApi.shareTemplate(template.id)).catch(() => null);
    const url = res?.data?.shareUrl ?? template.shareUrl?.replace('{uid}', uid) ?? inviteLink;
    try {
      if (navigator.share) {
        await navigator.share({ title: template.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Invite link copied to clipboard!', 'success');
      }
      setTemplates((rows) =>
        rows.map((t) => (t.id === template.id ? { ...t, shareCount: t.shareCount + 1 } : t))
      );
    } catch {
      /* user dismissed or cancelled */
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5E6FF] to-surface-soft pb-10">
      <ScreenHeader
        title=""
        right={
          <button aria-label="Earnings history" className="w-8 h-8 flex items-center justify-center text-ink">
            <Clock className="w-5 h-5" />
          </button>
        }
      >
        <div className="px-4">
          <TabBar
            tabs={[
              { key: 'link', label: 'Link Referral' },
              { key: 'id', label: 'ID invite' },
            ]}
            active={tab}
            onChange={(k) => setTab(k as Tab)}
          />
        </div>
      </ScreenHeader>

      {/* Quick Copy Reference Banner */}
      <div className="mx-3 mt-3 p-3.5 rounded-2xl bg-white shadow-xs border border-line flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <GiftIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">My Reference Code</p>
            <p className="text-sm font-black text-ink tracking-wide tabular-nums truncate">{uid || '—'}</p>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={copyReferenceCode}
            className="px-3 py-1.5 rounded-xl bg-brand/10 hover:bg-brand/20 text-brand font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
            title="Copy Reference Code"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
          </button>
          <button
            onClick={copyReferenceLink}
            className="px-3 py-1.5 rounded-xl bg-brand text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition-all shadow-xs"
            title="Copy Referral Link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* Notice bar */}
      <div className="mx-3 mt-2.5 px-3 py-2 rounded-lg bg-[#FFF8E0]">
        <p className="text-[12px] text-[#E08A1E] leading-relaxed">
          Share your referral link or reference code to invite friends and earn rewards when they register!
        </p>
      </div>

      {tab === 'link' ? (
        <>
          <div className="px-4 pt-3">
            <PillTabs
              tabs={[
                { key: 'templates', label: 'Invitation Template' },
                { key: 'materials', label: 'My Material' },
              ]}
              active={source}
              onChange={(k) => setSource(k as Source)}
            />
          </div>

          {loading ? (
            <Loading className="pt-16" size="lg" />
          ) : templates.length === 0 ? (
            <>
              <EmptyState
                icon={<Share2 className="w-6 h-6" />}
                title={
                  source === 'materials'
                    ? "You haven't used a template yet"
                    : live
                      ? 'No templates available'
                      : 'Templates not connected'
                }
                hint={source === 'materials' ? 'Templates you share appear here.' : undefined}
              />
              {!live && <PendingApiNotice section="§4.4" what="Invitation templates" />}
            </>
          ) : (
            <div className="px-3 pt-3 space-y-2.5">
              {templates.map((template) => (
                <div key={template.id} className="bg-white rounded-card p-3 shadow-2xs">
                  <div className="flex gap-3">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-surface-sunken shrink-0">
                      {template.thumbnail && (
                        <img src={template.thumbnail} alt="" className="w-full h-full object-cover" />
                      )}
                      {template.badge && (
                        <span
                          className={`absolute top-1 left-1 h-[17px] px-1.5 rounded text-[9px] font-bold text-white flex items-center ${
                            template.badge === 'HOT' ? 'bg-[#FF4D4D]' : 'bg-[#FF6EC7]'
                          }`}
                        >
                          {template.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex items-center">
                      <div className="flex-1 text-center">
                        <p className="font-bold text-ink tabular-nums">
                          {compactNumber(template.shareCount)}
                        </p>
                        <p className="text-[11px] text-ink-muted">Share Count</p>
                      </div>
                      <div className="w-px h-8 bg-line" />
                      <div className="flex-1 text-center">
                        <p className="font-bold text-ink tabular-nums">
                          {compactNumber(template.downloadCount)}
                        </p>
                        <p className="text-[11px] text-ink-muted">Download Count</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      onClick={() => {
                        const url = template.shareUrl?.replace('{uid}', uid) || inviteLink;
                        navigator.clipboard.writeText(url);
                        showToast('Template link copied to clipboard!', 'success');
                      }}
                      className="h-10 rounded-full border border-line bg-surface-sunken text-ink font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-surface-soft active:scale-95 transition-all"
                    >
                      <Copy className="w-4 h-4" /> Copy Link
                    </button>
                    <button
                      onClick={() => share(template)}
                      className="h-10 rounded-full bg-[#E6E6FF] text-[#6366F1] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#DADAFF] active:scale-95 transition-all"
                    >
                      <Share2 className="w-4 h-4" /> Share
                    </button>
                  </div>
                </div>
              ))}
              <p className="text-center text-xs text-ink-faint py-2">No more</p>
            </div>
          )}
        </>
      ) : (
        /* ── ID invite (#58) ───────────────────────────────────────── */
        <div className="px-3 pt-3">
          <div className="bg-white rounded-sheet p-6 shadow-xs">
            <div className="flex flex-col items-center">
              <Avatar src={user?.avatar} nickname={user?.nickname || '?'} size="xl" />
              <p className="font-bold text-ink mt-3">{user?.nickname}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-ink-muted">Reference Code:</span>
                <span className="text-2xl font-black text-accent-500 tabular-nums">{uid || '—'}</span>
              </div>

              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                <button
                  onClick={copyReferenceCode}
                  className="h-13 rounded-full bg-accent-500 hover:bg-accent-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
                >
                  {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copiedCode ? 'CODE COPIED' : 'COPY REFERENCE CODE'}
                </button>
                <button
                  onClick={copyReferenceLink}
                  className="h-13 rounded-full bg-surface-sunken border border-line-strong hover:bg-surface-soft text-ink font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {copiedLink ? <Check className="w-5 h-5 text-green-600" /> : <LinkIcon className="w-5 h-5 text-brand" />}
                  {copiedLink ? 'LINK COPIED' : 'COPY INVITE LINK'}
                </button>
              </div>
            </div>

            <div className="border-t border-dashed border-line my-6" />

            <h3 className="text-center font-bold text-ink mb-4">Share ID Invitation Tutorial</h3>

            <ol className="text-sm text-ink-soft space-y-2.5 list-decimal list-inside leading-relaxed">
              <li>Tap the <strong>COPY REFERENCE CODE</strong> button to copy your unique ID ({uid}).</li>
              <li>Send your Reference Code or Invite Link to your friends.</li>
              <li>
                Your friend opens the link or enters your Reference Code during sign up on the <strong>Sign Up</strong> page.
              </li>
              <li>
                Once they complete registration, the referral relationship is bound automatically.
              </li>
            </ol>

            <p className="text-[13px] text-role-host mt-4 leading-relaxed bg-[#FFF8E0] p-3 rounded-xl border border-[#FFE7A3]">
              Note: the inviter's Reference Code must be entered <strong>before</strong> completing registration.
              Binding or modifications are not allowed after confirmation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
