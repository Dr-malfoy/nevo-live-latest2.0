import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCheckBold as Check, PiCopyFill as Copy, PiGiftFill as Gift } from 'react-icons/pi';
import { referralApi, type ReferralSummary } from '../api/social.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { ScreenHeader, PillTabs, HelpButton, EmptyState, PendingApiNotice } from '../components/common';
import { Avatar } from '../components/user';
import { Loading } from '../components/ui';
import { compactNumber } from '../lib/time';
import type { UserPublic } from '../types';

/**
 * Invite friends & earn — requirement #26.
 *
 * `/api/referral/*` is specified in BACKEND-GUIDE.md §4.4. Amounts render as
 * `—` until it ships, rather than as zeros that look like a real balance.
 */

type Tab = 'rewards' | 'rank';

export const InviteFriends = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [tab, setTab] = useState<Tab>('rewards');
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [rank, setRank] = useState<{ rank: number; user: UserPublic; amount: number }[]>([]);
  const [ticker, setTicker] = useState<{ nickname: string; claimed: number; earned: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      optional(referralApi.getSummary()).catch(() => null),
      optional(referralApi.getRank()).catch(() => null),
      optional(referralApi.getTicker()).catch(() => null),
    ])
      .then(([s, r, t]) => {
        if (cancelled) return;
        setSummary(s?.data ?? null);
        setRank(r?.data ?? []);
        setTicker(t?.data ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const myId = summary?.myId ?? user?.uid ?? '';

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(myId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const inviteNow = async () => {
    const url = `${window.location.origin}/register?inviter=${myId}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Join Navo Live', url });
      else {
        await navigator.clipboard.writeText(url);
        showToast('Invite link copied', 'success');
      }
    } catch {
      /* dismissed */
    }
  };

  const claim = async () => {
    setClaiming(true);
    try {
      const res = await optional(referralApi.claim());
      if (res === null) {
        showToast('Claiming is not available yet', 'info');
        return;
      }
      if (res.success) {
        showToast('Reward claimed', 'success');
        setSummary((prev) => (prev ? { ...prev, availableToday: 0 } : prev));
      } else {
        showToast(res.error || 'Could not claim', 'error');
      }
    } finally {
      setClaiming(false);
    }
  };

  const money = (value?: number) => (value == null ? '—' : `$${value}`);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#3B2A8C] via-[#6B4BD8] to-[#8B6CFF] pb-10">
      <ScreenHeader title="" variant="media" right={<HelpButton light />} />

      {/* Hero */}
      <div className="text-center px-6 pb-4">
        <p className="text-[34px] leading-tight font-bold text-[#FFD277] drop-shadow">5th Anniversary</p>
        <p className="text-sm text-white/70 mt-1">Invite friends and earn together</p>
      </div>

      {/* Ticker (#26.2) */}
      {ticker.length > 0 && (
        <div className="mx-4 mb-4 h-9 rounded-full bg-white/15 flex items-center px-4 overflow-hidden">
          <p className="text-[11px] text-white truncate">
            Congratulations! {ticker[0].nickname} claimed ${ticker[0].claimed}, earned ${ticker[0].earned}
          </p>
        </div>
      )}

      {loading ? (
        <Loading className="pt-10" size="lg" />
      ) : (
        <div className="px-3 space-y-3">
          {/* Main card (#26.3) */}
          <div className="rounded-sheet p-2 bg-[#A5A6FF]">
            <div className="bg-white rounded-[18px] px-5 py-6 text-center">
              <p className="text-sm text-[#8B5A2B]">Invite Someone</p>
              <p className="text-xl font-bold text-[#8B5A2B] mt-2">You can earn up to</p>
              <p className="text-[42px] leading-none font-bold mt-1">
                <span className="text-[#8B5A2B]">$</span>
                <span className="text-[#FF4D8A]">{summary?.maxReward ?? '—'}</span>
              </p>
              <p className="text-sm text-ink-muted mt-2">
                The more you invite, the more rewards you earn
              </p>

              <button
                onClick={inviteNow}
                className="w-full h-14 mt-5 rounded-full bg-gradient-to-r from-[#FF8C00] to-[#FF0055] text-white font-bold text-lg"
              >
                Invite Now
              </button>

              <button
                onClick={copyId}
                className="mt-4 h-9 px-4 rounded-full bg-[#FFF0F0] text-[#FF4D8A] text-sm font-semibold inline-flex items-center gap-1.5"
              >
                My ID: {myId || '—'}
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Second banner (#26.4) */}
          <div className="rounded-card px-4 py-3.5 bg-gradient-to-r from-[#FF5A8A] to-[#D9365E] flex items-center gap-3">
            <Gift className="w-8 h-8 text-white shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold">Invite Friends</p>
              <p className="text-white/80 text-xs mt-0.5">
                Up to 🪙 {compactNumber(summary?.perInvite ?? 0)} / invite
              </p>
            </div>
          </div>

          {/* Tabs (#26.5) */}
          <PillTabs
            tabs={[
              { key: 'rewards', label: 'My Rewards' },
              { key: 'rank', label: 'Income Rank' },
            ]}
            active={tab}
            onChange={(k) => setTab(k as Tab)}
            tone="light"
            className="justify-center"
          />

          {tab === 'rewards' ? (
            /* Stats card (#26.6) */
            <div className="rounded-card bg-gradient-to-b from-[#E6F0FF] to-white p-4">
              <div className="flex items-stretch">
                <div className="flex-1 text-center">
                  <p className="text-2xl font-bold text-ink tabular-nums">{money(summary?.claimed)}</p>
                  <p className="text-xs text-ink-muted mt-0.5">Claimed</p>
                </div>
                <div className="w-px bg-line" />
                <div className="flex-1 text-center">
                  <p className="text-2xl font-bold text-ink tabular-nums">
                    {summary?.inviteeCount ?? '—'}
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">Number of Invitees</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-surface-sunken">
                <span className="text-sm text-ink-muted">Available Today</span>
                <span className="font-bold text-ink tabular-nums">
                  {summary ? compactNumber(summary.availableToday) : '—'}
                </span>
                <button
                  onClick={claim}
                  disabled={claiming || !summary?.availableToday}
                  className="ml-auto h-9 px-4 rounded-full bg-gradient-to-r from-[#A855F7] to-[#6366F1] text-white text-sm font-bold disabled:opacity-40"
                >
                  {claiming ? '…' : 'Claim'}
                </button>
              </div>
            </div>
          ) : rank.length === 0 ? (
            <div className="bg-white rounded-card">
              <EmptyState title="No income rank yet" hint="Invite friends to appear here." className="!py-10" />
            </div>
          ) : (
            <div className="bg-white rounded-card divide-y divide-line overflow-hidden">
              {rank.map((row) => (
                <button
                  key={row.user._id}
                  onClick={() => navigate(`/user/${row.user._id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="w-6 text-sm font-bold text-ink-faint tabular-nums">{row.rank}</span>
                  <Avatar src={row.user.avatar} nickname={row.user.nickname} size="sm" />
                  <span className="flex-1 font-semibold text-ink truncate">{row.user.nickname}</span>
                  <span className="text-sm font-bold text-ink tabular-nums">
                    ${compactNumber(row.amount)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!summary && <PendingApiNotice section="§4.4" what="Your referral rewards" />}
        </div>
      )}
    </div>
  );
};
