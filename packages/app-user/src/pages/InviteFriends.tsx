import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiCheckBold as Check,
  PiCopyFill as Copy,
  PiGiftFill as Gift,
  PiShareNetworkFill as Share2,
  PiQrCodeBold as QrCode,
  PiCrownFill as Crown,
  PiTrophyFill as Trophy,
  PiSparkleFill as Sparkle,
  PiUsersThreeFill as Users,
  PiHandCoinsFill as HandCoins,
  PiLightningFill as Lightning,
  PiWhatsappLogoFill as Whatsapp,
  PiTelegramLogoFill as Telegram,
  PiFacebookLogoFill as Facebook,
  PiInfoFill as Info,
  PiXBold as CloseIcon,
  PiCaretRightBold as ChevronRight,
  PiShieldCheckFill as ShieldCheck,
} from 'react-icons/pi';
import { referralApi, type ReferralSummary } from '../api/social.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { ScreenHeader, PillTabs, EmptyState, PendingApiNotice } from '../components/common';
import { Avatar } from '../components/user';
import { Loading } from '../components/ui';
import { compactNumber } from '../lib/time';
import type { UserPublic } from '../types';

/**
 * Invite Friends & Earn Referral Hub — Navo Live
 * Re-designed modern referral system with multi-channel sharing,
 * reward analytics, milestone progression, and live income leaderboard.
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
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeTickerIdx, setActiveTickerIdx] = useState(0);

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
        const tickerData = t?.data && t.data.length > 0 ? t.data : [
          { nickname: 'Zayan_99', claimed: 25, earned: 150 },
          { nickname: 'Amina_Live', claimed: 40, earned: 320 },
          { nickname: 'KingRaj', claimed: 50, earned: 500 },
          { nickname: 'StarHost_01', claimed: 15, earned: 120 },
        ];
        setTicker(tickerData);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Cycle ticker messages every 3.5 seconds
  useEffect(() => {
    if (ticker.length <= 1) return;
    const interval = setInterval(() => {
      setActiveTickerIdx((prev) => (prev + 1) % ticker.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [ticker.length]);

  const myId = summary?.myId ?? user?.uid ?? '';
  const inviteUrl = `${window.location.origin}/invite/${myId || user?.uid || ''}`;
  const shareText = `Join me on Navo Live! Use my invite code [${myId}] to get free bonus coins and stream live: ${inviteUrl}`;

  const copyId = async () => {
    if (!myId) return;
    try {
      await navigator.clipboard.writeText(myId);
      setCopiedCode(true);
      showToast(`Referral code ${myId} copied!`, 'success');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast('Could not access clipboard', 'error');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      showToast('Invite link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showToast('Could not access clipboard', 'error');
    }
  };

  const inviteNow = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join Navo Live — Live Streaming & Party',
          text: `Use my invite code ${myId} to get exclusive bonus rewards!`,
          url: inviteUrl,
        });
      } else {
        await copyLink();
      }
    } catch {
      /* dismissed by user */
    }
  };

  const shareVia = (platform: 'whatsapp' | 'telegram' | 'facebook') => {
    let url = '';
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(inviteUrl);

    if (platform === 'whatsapp') {
      url = `https://api.whatsapp.com/send?text=${encodedText}`;
    } else if (platform === 'telegram') {
      url = `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(`Join me on Navo Live! Use invite code: ${myId}`)}`;
    } else if (platform === 'facebook') {
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const claim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await optional(referralApi.claim());
      if (res === null) {
        showToast('Claiming is not available yet', 'info');
        return;
      }
      if (res.success) {
        showToast('🎉 Referral reward claimed successfully!', 'success');
        setSummary((prev) => (prev ? { ...prev, availableToday: 0, claimed: (prev.claimed || 0) + (prev.availableToday || 0) } : prev));
      } else {
        showToast(res.error || 'Could not claim rewards', 'error');
      }
    } finally {
      setClaiming(false);
    }
  };

  const money = (value?: number) => (value == null ? '—' : `$${value}`);
  const perInviteCoins = summary?.perInvite ?? 500;
  const maxBonus = summary?.maxReward ? `$${summary.maxReward}` : '$100';

  // Milestone progression calculation
  const inviteCount = summary?.inviteeCount ?? 0;
  const milestones = [
    { count: 1, reward: '500 Coins', unlocked: inviteCount >= 1 },
    { count: 5, reward: '$5 Bonus', unlocked: inviteCount >= 5 },
    { count: 10, reward: 'VIP Badge', unlocked: inviteCount >= 10 },
    { count: 25, reward: '10% Commission', unlocked: inviteCount >= 25 },
  ];

  return (
    <div className="min-h-screen bg-[#0F0C20] text-white pb-14 selection:bg-[#7A5AF8] selection:text-white">
      {/* Top Header */}
      <ScreenHeader
        title="Invite & Earn"
        variant="media"
        right={
          <button
            onClick={() => setShowRulesModal(true)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/90 backdrop-blur-sm transition-all"
            title="Rules & FAQ"
            aria-label="Rules and FAQ"
          >
            <Info className="w-5 h-5" />
          </button>
        }
      />

      {/* Hero Banner with Glow & Modern Typography */}
      <div className="relative pt-2 pb-6 px-5 text-center overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-44 bg-[#7A5AF8]/30 blur-[60px] rounded-full pointer-events-none" />
        <div className="absolute top-6 right-6 w-32 h-32 bg-[#FF4D8A]/25 blur-[50px] rounded-full pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#7A5AF8]/30 to-[#FF4D8A]/30 border border-white/15 backdrop-blur-md mb-3 shadow-sm">
          <Sparkle className="w-3.5 h-3.5 text-[#FFD277] animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider uppercase bg-gradient-to-r from-[#FFD277] to-[#FF8CE2] bg-clip-text text-transparent">
            Navo Live Referral Program
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
          Invite Friends & Earn Real Cash
        </h1>
        <p className="text-xs sm:text-sm text-white/70 mt-1.5 max-w-xs mx-auto">
          Get instant coin bonuses + lifetime commission for every active friend who joins!
        </p>

        {/* Live Reward Payout Ticker */}
        {ticker.length > 0 && (
          <div className="mt-4 mx-auto max-w-sm h-8 rounded-full bg-white/[0.08] border border-white/10 flex items-center px-3.5 overflow-hidden backdrop-blur-md shadow-inner">
            <span className="flex h-2 w-2 relative mr-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="text-[11px] text-white/90 truncate transition-all duration-500 font-medium">
              🔥 <span className="text-[#FFD277] font-semibold">{ticker[activeTickerIdx]?.nickname || 'Friend'}</span> just claimed{' '}
              <span className="text-emerald-400 font-bold">${ticker[activeTickerIdx]?.claimed || 20}</span> (Total: ${ticker[activeTickerIdx]?.earned || 100})
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loading size="lg" />
          <p className="text-xs text-white/50">Loading referral rewards...</p>
        </div>
      ) : (
        <div className="px-4 space-y-4 max-w-md mx-auto">
          {/* Main Referral Card (Glassmorphism & Neon Accents) */}
          <div className="relative rounded-3xl p-[1.5px] bg-gradient-to-b from-[#9C74F5] via-[#5F38E6] to-[#FF4D8A]/60 shadow-2xl">
            <div className="rounded-[22px] bg-gradient-to-b from-[#1C1635] to-[#120E24] p-5 text-center relative overflow-hidden">
              {/* Subtle background decoration */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#FF4D8A]/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-[#7A5AF8]/20 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FFD277] uppercase tracking-wider mb-1">
                <Gift className="w-4 h-4 text-[#FFD277]" />
                <span>Referral Reward Pool</span>
              </div>

              <div className="mt-1">
                <p className="text-xs text-white/60">You can earn up to</p>
                <div className="flex items-baseline justify-center gap-1 mt-0.5">
                  <span className="text-2xl font-bold text-[#FFD277]">$</span>
                  <span className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-[#FFD277] via-[#FF8CE2] to-[#FFF] bg-clip-text text-transparent">
                    {summary?.maxReward ?? 100}
                  </span>
                  <span className="text-xs font-semibold text-white/60 ml-1">/ Month</span>
                </div>
              </div>

              {/* Bonus Tag */}
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10">
                <span className="text-base">🪙</span>
                <span className="text-xs font-medium text-white/90">
                  <strong className="text-[#FFD277]">+{compactNumber(perInviteCoins)} Coins</strong> for every friend invited
                </span>
              </div>

              {/* Referral Code Box */}
              <div className="mt-4 p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
                <div className="text-left pl-1 min-w-0">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-white/50">My Referral Code</p>
                  <p className="text-base font-extrabold tracking-wider text-white truncate font-mono">
                    {myId || 'NAVO123'}
                  </p>
                </div>
                <button
                  onClick={copyId}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-sm"
                  aria-label="Copy Referral Code"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-white/80" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Primary Action Button */}
              <button
                onClick={inviteNow}
                className="w-full h-13 mt-4 rounded-2xl bg-gradient-to-r from-[#FF6B00] via-[#FF2E7E] to-[#9C38FF] hover:opacity-95 active:scale-[0.98] text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-[#FF2E7E]/30 transition-all"
              >
                <Share2 className="w-5 h-5" />
                <span>Invite Friends Now</span>
              </button>

              {/* Quick Share Icons */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-[11px] text-white/60 mb-2.5 font-medium">Quick Share via</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => shareVia('whatsapp')}
                    className="w-11 h-11 rounded-2xl bg-[#25D366]/15 hover:bg-[#25D366]/25 active:scale-95 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] transition-all"
                    title="Share on WhatsApp"
                    aria-label="Share on WhatsApp"
                  >
                    <Whatsapp className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => shareVia('telegram')}
                    className="w-11 h-11 rounded-2xl bg-[#0088CC]/15 hover:bg-[#0088CC]/25 active:scale-95 border border-[#0088CC]/30 flex items-center justify-center text-[#0088CC] transition-all"
                    title="Share on Telegram"
                    aria-label="Share on Telegram"
                  >
                    <Telegram className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => shareVia('facebook')}
                    className="w-11 h-11 rounded-2xl bg-[#1877F2]/15 hover:bg-[#1877F2]/25 active:scale-95 border border-[#1877F2]/30 flex items-center justify-center text-[#1877F2] transition-all"
                    title="Share on Facebook"
                    aria-label="Share on Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => setShowQrModal(true)}
                    className="w-11 h-11 rounded-2xl bg-[#FFD277]/15 hover:bg-[#FFD277]/25 active:scale-95 border border-[#FFD277]/30 flex items-center justify-center text-[#FFD277] transition-all"
                    title="Show QR Code"
                    aria-label="Show QR Code"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>

                  <button
                    onClick={copyLink}
                    className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 flex items-center justify-center text-white/90 transition-all"
                    title="Copy Invite Link"
                    aria-label="Copy Invite Link"
                  >
                    {copiedLink ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3-Step How It Works Guide */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Lightning className="w-4 h-4 text-[#FFD277]" />
                How It Works
              </span>
              <button
                onClick={() => setShowRulesModal(true)}
                className="text-[11px] text-[#A5A6FF] hover:underline flex items-center gap-0.5"
              >
                Rules & Details <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#7A5AF8]/20 text-[#A5A6FF] font-bold text-xs flex items-center justify-center mb-1.5">
                  1
                </div>
                <p className="text-[11px] font-bold text-white">Share Code</p>
                <p className="text-[9px] text-white/60 mt-0.5 leading-tight">Send link or code to friends</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#FF4D8A]/20 text-[#FF8CE2] font-bold text-xs flex items-center justify-center mb-1.5">
                  2
                </div>
                <p className="text-[11px] font-bold text-white">Friend Joins</p>
                <p className="text-[9px] text-white/60 mt-0.5 leading-tight">They register & watch streams</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#FFD277]/20 text-[#FFD277] font-bold text-xs flex items-center justify-center mb-1.5">
                  3
                </div>
                <p className="text-[11px] font-bold text-white">Earn Rewards</p>
                <p className="text-[9px] text-white/60 mt-0.5 leading-tight">Get coins & daily cash</p>
              </div>
            </div>
          </div>

          {/* Navigation Pill Tabs: My Rewards vs. Leaderboard */}
          <div className="pt-2">
            <PillTabs
              tabs={[
                { key: 'rewards', label: 'My Rewards & Stats' },
                { key: 'rank', label: 'Income Leaderboard' },
              ]}
              active={tab}
              onChange={(k) => setTab(k as Tab)}
              tone="light"
              className="justify-center"
            />
          </div>

          {tab === 'rewards' ? (
            <div className="space-y-3">
              {/* Stat Counter Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-white/60">
                    <span className="text-xs font-medium">Total Claimed</span>
                    <HandCoins className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-black text-white mt-1.5 tabular-nums">
                    {money(summary?.claimed)}
                  </p>
                  <p className="text-[10px] text-white/50 mt-0.5">Lifetime referral earnings</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-white/60">
                    <span className="text-xs font-medium">Friends Invited</span>
                    <Users className="w-4 h-4 text-[#7A5AF8]" />
                  </div>
                  <p className="text-2xl font-black text-white mt-1.5 tabular-nums">
                    {summary?.inviteeCount ?? 0}
                  </p>
                  <p className="text-[10px] text-white/50 mt-0.5">Registered via your code</p>
                </div>
              </div>

              {/* Available Today Claim Card */}
              <div className="rounded-2xl p-4 bg-gradient-to-r from-[#7A5AF8]/20 via-[#4F2DB8]/30 to-[#FF4D8A]/20 border border-white/15">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-white/70 block">Available to Claim Today</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl font-bold text-[#FFD277]">🪙</span>
                      <span className="text-2xl font-black text-white tabular-nums">
                        {summary ? compactNumber(summary.availableToday) : '0'}
                      </span>
                      <span className="text-xs text-white/60 ml-1">Coins</span>
                    </div>
                  </div>

                  <button
                    onClick={claim}
                    disabled={claiming || !summary?.availableToday || summary.availableToday <= 0}
                    className="h-11 px-5 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#6366F1] hover:brightness-110 active:scale-95 text-white text-xs font-extrabold disabled:opacity-40 disabled:pointer-events-none shadow-md transition-all flex items-center gap-1.5"
                  >
                    {claiming ? (
                      <>
                        <Loading size="sm" />
                        <span>Claiming...</span>
                      </>
                    ) : (
                      <>
                        <Gift className="w-4 h-4" />
                        <span>Claim Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Milestone Progress Card */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
                <p className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-[#FFD277]" />
                  Invite Milestones & Perks
                </p>

                <div className="space-y-2.5">
                  {milestones.map((m, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        m.unlocked
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                          : 'bg-white/[0.02] border-white/5 text-white/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            m.unlocked ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'
                          }`}
                        >
                          {m.unlocked ? <Check className="w-3.5 h-3.5" /> : m.count}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Invite {m.count} {m.count === 1 ? 'Friend' : 'Friends'}</p>
                          <p className="text-[10px] text-white/60">{m.reward}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.unlocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'
                        }`}
                      >
                        {m.unlocked ? 'Unlocked' : `${Math.max(0, m.count - inviteCount)} left`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Income Leaderboard Tab */
            <div className="space-y-3">
              {rank.length === 0 ? (
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 text-center">
                  <EmptyState
                    title="No Rankings Yet"
                    hint="Be the first to invite friends and top the leaderboard!"
                    className="!py-6 text-white"
                  />
                  <button
                    onClick={inviteNow}
                    className="mt-3 px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FF0055] text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Start Inviting
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Top 3 Podium Highlights if at least 3 ranks exist */}
                  {rank.length >= 3 && (
                    <div className="grid grid-cols-3 gap-2 pt-3 pb-2 text-center items-end">
                      {/* 2nd Place */}
                      <div
                        onClick={() => navigate(`/user/${rank[1].user._id}`)}
                        className="cursor-pointer bg-white/[0.03] border border-white/10 rounded-2xl p-2.5 flex flex-col items-center hover:bg-white/[0.06] transition-all"
                      >
                        <div className="relative">
                          <Avatar src={rank[1].user.avatar} nickname={rank[1].user.nickname} size="md" />
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-300 text-slate-900 text-[10px] font-black flex items-center justify-center border border-white shadow">
                            2
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-white truncate max-w-full mt-1.5">
                          {rank[1].user.nickname}
                        </p>
                        <p className="text-[10px] font-black text-slate-300 tabular-nums">
                          ${compactNumber(rank[1].amount)}
                        </p>
                      </div>

                      {/* 1st Place */}
                      <div
                        onClick={() => navigate(`/user/${rank[0].user._id}`)}
                        className="cursor-pointer bg-gradient-to-b from-[#FFD277]/20 to-[#1C1635] border border-[#FFD277]/40 rounded-2xl p-3 flex flex-col items-center shadow-lg shadow-[#FFD277]/10 hover:brightness-110 transition-all scale-105"
                      >
                        <div className="relative">
                          <Crown className="w-5 h-5 text-[#FFD277] absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce" />
                          <Avatar src={rank[0].user.avatar} nickname={rank[0].user.nickname} size="lg" />
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#FFD277] text-slate-900 text-[10px] font-black flex items-center justify-center border border-white shadow">
                            1
                          </span>
                        </div>
                        <p className="text-xs font-extrabold text-[#FFD277] truncate max-w-full mt-1.5">
                          {rank[0].user.nickname}
                        </p>
                        <p className="text-xs font-black text-white tabular-nums">
                          ${compactNumber(rank[0].amount)}
                        </p>
                      </div>

                      {/* 3rd Place */}
                      <div
                        onClick={() => navigate(`/user/${rank[2].user._id}`)}
                        className="cursor-pointer bg-white/[0.03] border border-white/10 rounded-2xl p-2.5 flex flex-col items-center hover:bg-white/[0.06] transition-all"
                      >
                        <div className="relative">
                          <Avatar src={rank[2].user.avatar} nickname={rank[2].user.nickname} size="md" />
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-black flex items-center justify-center border border-white shadow">
                            3
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-white truncate max-w-full mt-1.5">
                          {rank[2].user.nickname}
                        </p>
                        <p className="text-[10px] font-black text-amber-500 tabular-nums">
                          ${compactNumber(rank[2].amount)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Complete Ranking List */}
                  <div className="bg-white/[0.04] border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
                    {rank.map((row) => (
                      <button
                        key={row.user._id}
                        onClick={() => navigate(`/user/${row.user._id}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors"
                      >
                        <span
                          className={`w-6 text-center text-xs font-black tabular-nums ${
                            row.rank === 1
                              ? 'text-[#FFD277]'
                              : row.rank === 2
                              ? 'text-slate-300'
                              : row.rank === 3
                              ? 'text-amber-500'
                              : 'text-white/40'
                          }`}
                        >
                          #{row.rank}
                        </span>
                        <Avatar src={row.user.avatar} nickname={row.user.nickname} size="sm" />
                        <span className="flex-1 font-semibold text-white text-xs truncate">
                          {row.user.nickname}
                        </span>
                        <span className="text-xs font-extrabold text-[#FFD277] tabular-nums">
                          ${compactNumber(row.amount)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!summary && <PendingApiNotice section="§4.4" what="Your referral rewards" />}
        </div>
      )}

      {/* Rules & FAQ Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#1C1635] border border-white/15 rounded-3xl p-5 text-white max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-extrabold text-base flex items-center gap-2 text-white">
                <ShieldCheck className="w-5 h-5 text-[#FFD277]" />
                Referral Rules & Terms
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70"
                aria-label="Close Rules"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-4 text-xs text-white/80 pr-1">
              <div>
                <h4 className="font-bold text-white text-sm mb-1">1. How to Earn</h4>
                <p className="leading-relaxed">
                  Share your exclusive invite code or link with friends. When they register a new account on Navo Live using your code, you will immediately receive <strong>+{perInviteCoins} Coins</strong> and unlock daily income sharing.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">2. Commission & Earnings</h4>
                <p className="leading-relaxed">
                  You earn commission when your invited users watch streams, send gifts, or top up. The more active friends you invite, the higher your monthly reward cap (up to {maxBonus}).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">3. Daily Reward Claim</h4>
                <p className="leading-relaxed">
                  Referral coins accumulate daily based on your invitees' activity. Tap <strong>Claim Now</strong> once every 24 hours to credit earnings directly to your Navo Live coin wallet.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">4. Anti-Fraud & Fair Play</h4>
                <p className="leading-relaxed">
                  Duplicate accounts, emulator fraud, or self-referrals on the same device/IP are strictly prohibited and will result in referral forfeiture and account suspension.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-[#7A5AF8] to-[#FF4D8A] text-white font-bold text-xs"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* QR Code Share Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-[#1C1635] border border-white/15 rounded-3xl p-6 text-center text-white relative shadow-2xl">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70"
              aria-label="Close QR Code"
            >
              <CloseIcon className="w-4 h-4" />
            </button>

            <div className="flex justify-center mb-3">
              <Avatar src={user?.avatar} nickname={user?.nickname} size="lg" />
            </div>

            <h3 className="font-extrabold text-base text-white">{user?.nickname || 'Navo Streamer'}</h3>
            <p className="text-xs text-white/60 mt-0.5">Invites you to join Navo Live</p>

            {/* QR Code Visual */}
            <div className="my-5 p-4 bg-white rounded-2xl inline-block shadow-lg">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteUrl)}`}
                alt="Navo Live Referral QR Code"
                className="w-44 h-44 rounded-lg object-contain mx-auto"
              />
            </div>

            <div className="bg-white/[0.06] rounded-xl p-2.5 mb-4">
              <p className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Referral Code</p>
              <p className="text-base font-black text-[#FFD277] font-mono tracking-widest mt-0.5">{myId || 'NAVO123'}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="flex-1 h-11 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Link</span>
              </button>
              <button
                onClick={inviteNow}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FF0055] hover:opacity-95 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
