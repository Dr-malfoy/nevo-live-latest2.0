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
  PiWarningCircleFill as WarningIcon,
  PiClockFill as Clock,
  PiCheckCircleFill as CheckCircle,
  PiArrowsClockwiseBold as RefreshIcon,
  PiTicketFill as TicketIcon,
  PiUserCheckFill as UserCheck,
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
 * Invite Friends & Referral Hub — Navo Live
 *
 * Rules:
 * - 1 Invite = 13,000 Coins (100 TK)
 * - 5 Invites = 65,000 Coins
 * - 10 Invites = VIP + 65,000 Coins
 * - 25 Invites = 10% Lifetime Commission from invited users' income
 *
 * Invitee Reward:
 * - New User Join = 13,000 Coins (100 TK) after registration + 10 min watch time
 *
 * Refer Valid Logic:
 * - Valid only if: OTP verified + WatchTime > 30 min + Login Day 2
 * - If DeviceID duplicate -> Invalid
 * - Coin Release: 50% instant (6,500 coins), 50% after Day 2 login (6,500 coins)
 */

type Tab = 'rewards' | 'friends' | 'rank';

export const InviteFriends = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [tab, setTab] = useState<Tab>('rewards');
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [rank, setRank] = useState<{ rank: number; user: UserPublic; amount: number }[]>([]);
  const [ticker, setTicker] = useState<{ nickname: string; claimed: number; earned: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeTickerIdx, setActiveTickerIdx] = useState(0);
  const [inputCode, setInputCode] = useState('');
  const [submittingCode, setSubmittingCode] = useState(false);

  const fetchReferralData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const [s, r, t] = await Promise.all([
        optional(referralApi.getSummary()).catch(() => null),
        optional(referralApi.getRank()).catch(() => null),
        optional(referralApi.getTicker()).catch(() => null),
      ]);

      if (s?.data) setSummary(s.data);
      if (r?.data) setRank(r.data);
      const tickerData = t?.data && t.data.length > 0 ? t.data : [
        { nickname: 'Zayan_99', claimed: 13000, earned: 65000 },
        { nickname: 'Amina_Live', claimed: 26000, earned: 130000 },
        { nickname: 'KingRaj', claimed: 65000, earned: 325000 },
        { nickname: 'StarHost_01', claimed: 13000, earned: 52000 },
      ];
      setTicker(tickerData);

      if (isManualRefresh) {
        showToast('Referral stats updated', 'success');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReferralData();
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
  const shareText = `Join me on Navo Live! Use my invite code [${myId}] to get 13,000 Free Coins (100 TK) after registering and watching 10 mins: ${inviteUrl}`;

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
          title: 'Join Navo Live — 13,000 Coins Welcome Bonus',
          text: `Use my invite code ${myId} on Navo Live to get 13,000 Coins (100 TK) welcome bonus!`,
          url: inviteUrl,
        });
      } else {
        await copyLink();
      }
    } catch {
      /* dismissed */
    }
  };

  const shareVia = (platform: 'whatsapp' | 'telegram' | 'facebook') => {
    let url = '';
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(inviteUrl);

    if (platform === 'whatsapp') {
      url = `https://api.whatsapp.com/send?text=${encodedText}`;
    } else if (platform === 'telegram') {
      url = `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(`Join me on Navo Live! Use my invite code: ${myId} to get 13,000 Coins (100 TK)!`)}`;
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
        showToast(`🎉 Claimed ${res.data?.claimed?.toLocaleString() || ''} referral coins successfully!`, 'success');
        await fetchReferralData();
      } else {
        showToast(res.error || 'Could not claim rewards', 'error');
      }
    } finally {
      setClaiming(false);
    }
  };

  const handleConfirmInviteCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputCode.trim();
    if (!clean) {
      showToast('Please enter an invitation code', 'error');
      return;
    }
    if (clean === myId || clean === user?.uid) {
      showToast('You cannot enter your own referral code', 'error');
      return;
    }

    setSubmittingCode(true);
    try {
      const res = await referralApi.bindCode(clean);
      if (res.data?.success) {
        showToast(
          `🎉 Referral code confirmed! Linked to ${res.data?.data?.inviter?.nickname || 'inviter'}.`,
          'success'
        );
        setInputCode('');
        await Promise.all([
          fetchReferralData(),
          useAuthStore.getState().fetchProfile().catch(() => {}),
        ]);
      } else {
        showToast(res.data?.error || 'Failed to bind referral code', 'error');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Invalid or expired referral code';
      showToast(msg, 'error');
    } finally {
      setSubmittingCode(false);
    }
  };

  const validInviteeCount = summary?.validInviteeCount ?? 0;
  const inviteeCount = summary?.inviteeCount ?? 0;
  const pendingCount = summary?.pendingInviteeCount ?? 0;
  const invalidCount = summary?.invalidInviteeCount ?? 0;
  const availableCoins = summary?.availableToday ?? 0;

  // Milestone tiers
  const milestones = [
    {
      count: 1,
      label: '1 Invite',
      reward: '13,000 Coins (100 TK)',
      coins: 13000,
      unlocked: validInviteeCount >= 1,
      badge: 'Starter',
    },
    {
      count: 5,
      label: '5 Invites',
      reward: '65,000 Coins (500 TK)',
      coins: 65000,
      unlocked: validInviteeCount >= 5,
      badge: 'Silver',
    },
    {
      count: 10,
      label: '10 Invites',
      reward: 'VIP Status + 65,000 Coins',
      coins: 65000,
      unlocked: validInviteeCount >= 10,
      badge: 'VIP Elite',
      perk: 'VIP Badge Active',
    },
    {
      count: 25,
      label: '25 Invites',
      reward: '10% Lifetime Commission from invited users income',
      unlocked: validInviteeCount >= 25,
      badge: 'Partner',
      perk: '10% Lifetime Cut',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0F0C20] text-white pb-16 selection:bg-[#7A5AF8] selection:text-white">
      {/* Top Header */}
      <ScreenHeader
        title="Invite & Earn"
        variant="media"
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchReferralData(true)}
              disabled={refreshing}
              className={`w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/90 backdrop-blur-sm transition-all ${
                refreshing ? 'animate-spin' : ''
              }`}
              title="Refresh"
              aria-label="Refresh Data"
            >
              <RefreshIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowRulesModal(true)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/90 backdrop-blur-sm transition-all"
              title="Rules & Validation Logic"
              aria-label="Rules and FAQ"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        }
      />

      {/* Hero Banner with Glow & Modern Typography */}
      <div className="relative pt-2 pb-5 px-5 text-center overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-44 bg-[#7A5AF8]/35 blur-[70px] rounded-full pointer-events-none" />
        <div className="absolute top-6 right-6 w-36 h-36 bg-[#FF4D8A]/30 blur-[60px] rounded-full pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#7A5AF8]/40 to-[#FF4D8A]/40 border border-white/15 backdrop-blur-md mb-2.5 shadow-sm">
          <Sparkle className="w-3.5 h-3.5 text-[#FFD277] animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider uppercase bg-gradient-to-r from-[#FFD277] to-[#FF8CE2] bg-clip-text text-transparent">
            Navo Live Referral Program
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
          Invite Friends & Earn Real Rewards
        </h1>
        <p className="text-xs sm:text-sm text-white/70 mt-1 max-w-xs mx-auto">
          Earn <strong className="text-[#FFD277]">13,000 Coins (100 TK)</strong> per valid invite + VIP perks & 10% Lifetime Commission!
        </p>

        {/* Live Reward Payout Ticker */}
        {ticker.length > 0 && (
          <div className="mt-3.5 mx-auto max-w-sm h-8 rounded-full bg-white/[0.08] border border-white/10 flex items-center px-3.5 overflow-hidden backdrop-blur-md shadow-inner">
            <span className="flex h-2 w-2 relative mr-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="text-[11px] text-white/90 truncate transition-all duration-500 font-medium">
              🔥 <span className="text-[#FFD277] font-semibold">{ticker[activeTickerIdx]?.nickname || 'Friend'}</span> claimed{' '}
              <span className="text-emerald-400 font-bold">{compactNumber(ticker[activeTickerIdx]?.claimed || 13000)} Coins</span> (Total: {compactNumber(ticker[activeTickerIdx]?.earned || 65000)})
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
          {/* Main Referral Action Card */}
          <div className="relative rounded-3xl p-[1.5px] bg-gradient-to-b from-[#9C74F5] via-[#5F38E6] to-[#FF4D8A]/60 shadow-2xl">
            <div className="rounded-[22px] bg-gradient-to-b from-[#1C1635] to-[#120E24] p-5 text-center relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#FF4D8A]/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-[#7A5AF8]/20 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FFD277] uppercase tracking-wider mb-1">
                <Gift className="w-4 h-4 text-[#FFD277]" />
                <span>Referral Reward Rate</span>
              </div>

              <div className="mt-1">
                <p className="text-xs text-white/60">Per Valid Invite</p>
                <div className="flex items-baseline justify-center gap-1.5 mt-0.5">
                  <span className="text-2xl font-bold text-[#FFD277]">🪙</span>
                  <span className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-[#FFD277] via-[#FF8CE2] to-[#FFF] bg-clip-text text-transparent">
                    13,000
                  </span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full ml-1">
                    = 100 TK
                  </span>
                </div>
              </div>

              {/* Release Schedule Pill */}
              <div className="mt-3.5 inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white/90">
                <Lightning className="w-3.5 h-3.5 text-[#FFD277]" />
                <span>
                  Coin Release: <strong className="text-emerald-400">50% Instant</strong> (6,500) + <strong className="text-emerald-400">50% Day 2 Login</strong> (6,500)
                </span>
              </div>

              {/* Referral Code Box */}
              <div className="mt-4 p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
                <div className="text-left pl-1 min-w-0">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-white/50">My Referral Code</p>
                  <p className="text-base font-extrabold tracking-wider text-white truncate font-mono">
                    {myId || user?.uid || 'NAVO123'}
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

          {/* Invitee Reward Card (Highlighted) */}
          <div className="rounded-2xl p-4 bg-gradient-to-r from-[#22C55E]/15 via-[#10B981]/20 to-[#059669]/15 border border-emerald-500/30 flex items-start gap-3 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <Gift className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                  Invitee Welcome Bonus
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                  New User
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-1">
                New User Join = <strong className="text-[#FFD277]">13,000 Coins (100 TK)</strong>
              </p>
              <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
                Your friends get credited 13,000 Coins right after registration and completing <strong className="text-white">10 min watch time</strong>!
              </p>
            </div>
          </div>

          {/* Submit Referral Code Card (Bind Friend's Invite Code) */}
          <div className="rounded-2xl p-4 bg-gradient-to-r from-[#7A5AF8]/20 via-[#4F2DB8]/25 to-[#FF4D8A]/20 border border-white/15 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <TicketIcon className="w-4 h-4 text-[#FFD277]" />
                Have an Invite Code?
              </span>
              <span className="text-[10px] text-white/60 font-semibold">
                {summary?.inviter ? 'Linked' : 'Enter Friend\'s Code'}
              </span>
            </div>

            {summary?.inviter ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar src={summary.inviter.avatar} nickname={summary.inviter.nickname} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                      <span>Invited by {summary.inviter.nickname}</span>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </p>
                    <p className="text-[10px] text-white/60 font-mono">UID: {summary.inviter.uid}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                  Bound ✓
                </span>
              </div>
            ) : (
              <form onSubmit={handleConfirmInviteCode} className="space-y-2.5">
                <p className="text-xs text-white/70 leading-relaxed">
                  Enter your friend&apos;s referral code to confirm and link your account to earn the <strong className="text-[#FFD277]">13,000 Coins (100 TK)</strong> welcome bonus.
                </p>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                      placeholder="Enter friend's invite code (e.g. 168001)"
                      disabled={submittingCode}
                      className="w-full h-11 px-3.5 rounded-xl bg-white/[0.08] border border-white/20 text-white placeholder-white/40 text-xs font-mono tracking-wider focus:outline-none focus:border-[#7A5AF8] focus:ring-1 focus:ring-[#7A5AF8] transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingCode || !inputCode.trim()}
                    className="h-11 px-5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF2E7E] hover:opacity-95 active:scale-95 text-white text-xs font-black shadow-md shadow-[#FF2E7E]/20 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {submittingCode ? (
                      <>
                        <Loading size="sm" />
                        <span>Confirming...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Confirm</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Referral Validation Logic Card */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#FFD277]" />
                Referral Validation Rules
              </span>
              <button
                onClick={() => setShowRulesModal(true)}
                className="text-[11px] text-[#A5A6FF] hover:underline flex items-center gap-0.5 font-medium"
              >
                Full Terms <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-white/80">
              <div className="flex items-start gap-2 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Valid Only If:</strong>
                  <span className="text-white/80"> OTP verified + WatchTime &gt; 30 min + Login Day 2</span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20 text-red-200">
                <WarningIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-red-300">Anti-Fraud Rule:</strong> If DeviceID is duplicate $\rightarrow$ marked <strong className="text-red-400 underline">Invalid</strong> (0 coins).
                </div>
              </div>

              <div className="flex items-start gap-2 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                <Lightning className="w-4 h-4 text-[#FFD277] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Coin Release:</strong>
                  <span className="text-white/80"> 50% instant (6,500 coins), 50% after Day 2 login (6,500 coins).</span>
                </div>
              </div>
            </div>
          </div>

          {/* Inviter Tiers & Milestones Showcase */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-[#FFD277]" />
                Inviter Reward Tiers
              </span>
              <span className="text-[11px] text-white/60">
                Valid: <strong className="text-[#FFD277]">{validInviteeCount}</strong> / {inviteeCount}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {milestones.map((m, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                    m.unlocked
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                      : 'bg-white/[0.02] border-white/5 text-white/70'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white">{m.label}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                          m.unlocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'
                        }`}
                      >
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-[#FFD277] mt-0.5 truncate">{m.reward}</p>
                    {m.perk && (
                      <p className="text-[9px] text-[#A5A6FF] font-semibold mt-0.5">⭐ {m.perk}</p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {m.unlocked ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Unlocked
                      </span>
                    ) : (
                      <span className="text-[10px] text-white/40 font-semibold block">
                        {Math.max(0, m.count - validInviteeCount)} left
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Pill Tabs */}
          <div className="pt-2">
            <PillTabs
              tabs={[
                { key: 'rewards', label: 'My Rewards' },
                { key: 'friends', label: `Invited Friends (${inviteeCount})` },
                { key: 'rank', label: 'Leaderboard' },
              ]}
              active={tab}
              onChange={(k) => setTab(k as Tab)}
              tone="light"
              className="justify-center"
            />
          </div>

          {/* TAB 1: MY REWARDS */}
          {tab === 'rewards' && (
            <div className="space-y-3">
              {/* Stat Counters Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-white/60">
                    <span className="text-xs font-medium">Total Claimed</span>
                    <HandCoins className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-black text-white mt-1.5 tabular-nums">
                    {compactNumber(summary?.claimed || 0)} <span className="text-xs font-normal text-white/60">Coins</span>
                  </p>
                  <p className="text-[10px] text-white/50 mt-0.5">Lifetime referral payouts</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-white/60">
                    <span className="text-xs font-medium">Valid Invites</span>
                    <Users className="w-4 h-4 text-[#7A5AF8]" />
                  </div>
                  <p className="text-2xl font-black text-white mt-1.5 tabular-nums">
                    {validInviteeCount} <span className="text-xs font-normal text-white/50">/ {inviteeCount}</span>
                  </p>
                  <p className="text-[10px] text-white/50 mt-0.5">
                    {pendingCount} pending • {invalidCount} invalid
                  </p>
                </div>
              </div>

              {/* Available Today Claim Card */}
              <div className="rounded-2xl p-4 bg-gradient-to-r from-[#7A5AF8]/25 via-[#4F2DB8]/35 to-[#FF4D8A]/25 border border-white/15 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-white/70 block">Available to Claim Today</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl font-bold text-[#FFD277]">🪙</span>
                      <span className="text-2xl font-black text-white tabular-nums">
                        {summary ? compactNumber(availableCoins) : '0'}
                      </span>
                      <span className="text-xs text-white/60 ml-1">Coins</span>
                    </div>
                  </div>

                  <button
                    onClick={claim}
                    disabled={claiming || availableCoins <= 0}
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

              {/* Special Privileges Status */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
                <p className="text-xs font-bold text-white uppercase tracking-wider">Unlocked Privileges</p>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-[#FFD277]" />
                    <span className="text-xs text-white">VIP Badge (10 Invites)</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${summary?.isVip ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
                    {summary?.isVip ? 'Active' : 'Locked'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Sparkle className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-white">10% Lifetime Commission (25 Invites)</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${summary?.hasLifetimeCommission ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
                    {summary?.hasLifetimeCommission ? '10% Active' : 'Locked'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVITED FRIENDS & VALIDATION STATUS */}
          {tab === 'friends' && (
            <div className="space-y-3">
              {!summary?.invitees || summary.invitees.length === 0 ? (
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 text-center">
                  <EmptyState
                    title="No Invited Friends Yet"
                    hint="Share your referral code to invite friends and start earning!"
                    className="!py-6 text-white"
                  />
                  <button
                    onClick={inviteNow}
                    className="mt-3 px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF8C00] to-[#FF0055] text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Invite Friends
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1 text-xs text-white/60">
                    <span>Friend Info</span>
                    <span>Validation & Coins</span>
                  </div>

                  <div className="bg-white/[0.04] border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
                    {summary.invitees.map((invitee) => (
                      <div key={invitee._id} className="p-3.5 flex flex-col gap-2 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar src={invitee.avatar} nickname={invitee.nickname} size="sm" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{invitee.nickname}</p>
                              <p className="text-[10px] text-white/50 font-mono">UID: {invitee.uid}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                invitee.status === 'valid'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : invitee.status === 'invalid'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {invitee.status === 'valid'
                                ? '✓ Valid (+13,000)'
                                : invitee.status === 'invalid'
                                ? '✗ Invalid (Duplicate)'
                                : '⏳ Pending'}
                            </span>
                            <p className="text-[11px] font-extrabold text-[#FFD277] mt-0.5">
                              {compactNumber(invitee.coinsEarned)} Coins Released
                            </p>
                          </div>
                        </div>

                        {/* Checklist progress for pending invites */}
                        <div className="bg-white/[0.02] rounded-xl p-2 flex items-center justify-between text-[10px] text-white/70">
                          <span className={invitee.otpVerified ? 'text-emerald-400 font-bold' : 'text-white/40'}>
                            {invitee.otpVerified ? '✓ OTP Done' : '⏳ OTP Pending'}
                          </span>
                          <span className="text-white/20">•</span>
                          <span className={invitee.watchTimeMinutes >= 30 ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                            Watch: {invitee.watchTimeMinutes}/30 min
                          </span>
                          <span className="text-white/20">•</span>
                          <span className={invitee.hasDay2Login ? 'text-emerald-400 font-bold' : 'text-white/40'}>
                            {invitee.hasDay2Login ? '✓ Day 2 Login' : '⏳ Day 2 Login'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INCOME LEADERBOARD */}
          {tab === 'rank' && (
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
                  {/* Top 3 Podium Highlights */}
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
                          {compactNumber(rank[1].amount)} Coins
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
                          {compactNumber(rank[0].amount)} Coins
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
                          {compactNumber(rank[2].amount)} Coins
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
                          {compactNumber(row.amount)} Coins
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
                <h4 className="font-bold text-white text-sm mb-1">1. Inviter Tiers & Rewards</h4>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>1 Invite</strong> = 13,000 Coins (100 TK value)</li>
                  <li><strong>5 Invites</strong> = 65,000 Coins (500 TK value)</li>
                  <li><strong>10 Invites</strong> = VIP Status + 65,000 Bonus Coins</li>
                  <li><strong>25 Invites</strong> = 10% Lifetime Commission from invited users' income</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">2. Invitee Reward</h4>
                <p className="leading-relaxed">
                  Every new user joining via your code receives <strong>13,000 Coins (100 TK)</strong> immediately after registering with OTP and completing <strong>10 minutes stream watch time</strong>.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">3. Refer Valid Logic</h4>
                <p className="leading-relaxed">
                  An invite is considered <strong>Valid</strong> only when the invited user meets all 3 criteria:
                </p>
                <ul className="list-disc pl-4 space-y-1 mt-1 text-white/90">
                  <li>OTP verified phone number</li>
                  <li>Cumulative Watch Time &gt; 30 minutes</li>
                  <li>Logs in on Day 2</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">4. Coin Release Schedule</h4>
                <p className="leading-relaxed">
                  - <strong>50% instant (6,500 Coins)</strong> is released upon successful registration with unique device ID.<br />
                  - <strong>50% (6,500 Coins)</strong> is released after Day 2 login and 30 min watch time.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-red-400 text-sm mb-1">5. Anti-Fraud & DeviceID Check</h4>
                <p className="leading-relaxed text-red-200">
                  If duplicate DeviceID is detected across accounts, the referral is automatically marked <strong>Invalid</strong> and no coins are released.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-[#7A5AF8] to-[#FF4D8A] text-white font-bold text-xs"
            >
              I Understand
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
