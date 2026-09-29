import { useEffect, useState } from 'react';
import { PiCheckBold as Check, PiClockFill as Clock, PiCopyFill as Copy, PiShareNetworkFill as Share2 } from 'react-icons/pi';
import { referralApi, type ReferralTemplate } from '../api/social.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { ScreenHeader, TabBar, PillTabs, EmptyState, PendingApiNotice } from '../components/common';
import { Avatar } from '../components/user';
import { Loading } from '../components/ui';
import { compactNumber } from '../lib/time';

/**
 * Link Referral + ID invite — requirements #27 and #58.
 *
 * Two tabs, as in the reference. The ID-invite tab needs no API — it is the
 * user's own `uid` plus the tutorial, so it works fully today. The template
 * list needs `/api/referral/templates` (BACKEND-GUIDE.md §4.4).
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
  const [copied, setCopied] = useState(false);

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

  const copyId = async () => {
    if (!user?.uid) return;
    try {
      await navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const share = async (template: ReferralTemplate) => {
    const res = await optional(referralApi.shareTemplate(template.id)).catch(() => null);
    const url = res?.data?.shareUrl ?? template.shareUrl ?? `${window.location.origin}/register?inviter=${user?.uid}`;
    try {
      if (navigator.share) await navigator.share({ title: template.title, url });
      else {
        await navigator.clipboard.writeText(url);
        showToast('Link copied', 'success');
      }
      setTemplates((rows) =>
        rows.map((t) => (t.id === template.id ? { ...t, shareCount: t.shareCount + 1 } : t))
      );
    } catch {
      /* dismissed */
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

      {/* Orange notice bar */}
      <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-[#FFF8E0]">
        <p className="text-[12px] text-[#E08A1E] leading-relaxed">
          Share links and IDs to invite friends to download and sign up.
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
                <div key={template.id} className="bg-white rounded-card p-3">
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

                  <button
                    onClick={() => share(template)}
                    className="w-full h-10 mt-3 rounded-full bg-[#E6E6FF] text-[#6366F1] font-bold text-sm"
                  >
                    Share
                  </button>
                </div>
              ))}
              <p className="text-center text-xs text-ink-faint py-2">No more</p>
            </div>
          )}
        </>
      ) : (
        /* ── ID invite (#58) — works today, no API needed ────────── */
        <div className="px-3 pt-3">
          <div className="bg-white rounded-sheet p-6">
            <div className="flex flex-col items-center">
              <Avatar src={user?.avatar} nickname={user?.nickname || '?'} size="xl" />
              <p className="font-bold text-ink mt-3">{user?.nickname}</p>
              <p className="text-xl font-bold text-accent-500 mt-1 tabular-nums">ID:{user?.uid}</p>

              <button
                onClick={copyId}
                className="w-full h-14 mt-5 rounded-full bg-accent-500 text-white font-bold text-lg flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? 'COPIED' : 'COPY'}
              </button>
            </div>

            <div className="border-t border-dashed border-line my-6" />

            <h3 className="text-center font-bold text-ink mb-4">Share ID Invitation Tutorial</h3>

            <ol className="text-sm text-ink-soft space-y-2 list-decimal list-inside leading-relaxed">
              <li>Tap the COPY button above to copy your User ID.</li>
              <li>Send the copied User ID to your friend.</li>
              <li>
                Your friend enters your User ID during registration and completes sign-up.
              </li>
              <li>
                Your friend must be a new user with no prior registration — otherwise the binding
                field will not appear.
              </li>
            </ol>

            <p className="text-[13px] text-role-host mt-4 leading-relaxed">
              Note: the inviter's ID must be entered <strong>before</strong> completing registration.
              Binding or modifications are not allowed after confirmation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
