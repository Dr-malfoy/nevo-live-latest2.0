import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiBellFill as Bell,
  PiCameraFill as Camera,
  PiCheckBold as Check,
  PiCaretRightBold as ChevronRight,
  PiCoinsFill as Coins,
  PiCopyFill as Copy,
  PiCrownFill as Crown,
  PiGameControllerFill as Gamepad2,
  PiGiftFill as Gift,
  PiHeadphonesFill as Headphones,
  PiHeartFill as Heart,
  PiSquaresFourFill as LayoutGrid,
  PiSignOutBold as LogOut,
  PiMedalFill as Medal,
  PiRadioFill as Radio,
  PiPaperPlaneRightFill as Send,
  PiGearFill as SettingsIcon,
  PiShareNetworkFill as Share2,
  PiShieldCheckFill as ShieldCheck,
  PiStorefrontFill as Store,
  PiTrophyFill as Trophy,
  PiUserGearFill as UserCog,
  PiUserPlusFill as UserPlus,
  PiUsersFill as Users,
  PiUsersFill,
  PiWalletFill as WalletIcon,
  PiTelevision,
  PiLightbulb,
  PiClock,
  PiBackpack,
  PiSealCheck,
  PiBuildingsFill,
  PiArrowsLeftRightFill,
} from 'react-icons/pi';
import { useAuthStore, useSocketStore } from '../stores';
import { Avatar, EditProfileSheet, ProfileStatsRow, UserNameplate, LiveLevelPill, WealthLevelPill, VipCapsule, LevelDetailSheet, HostBadge, EquippedBadge } from '../components/user';
import { DiamondIcon, CoinIcon } from '../components/ui/CurrencyIcon';
import { ContactUsModal } from '../components/contact/ContactUsModal';
import { usersApi, notificationApi, agentApi } from '../api';
import { countryLabel } from '../lib/countries';
import { getMediaUrl } from '../lib/media';
import { calculateWealthLevel, calculateLiveLevel } from '../lib/userLevels';
import type { ProfileStats } from '../types';

/** Requirement #22G — the 8-tile VIP grid. Every tile points at a real screen. */
const QUICK_ACTIONS = [
  { to: '/rewards', label: 'Daily Task', Icon: Gift, tint: 'bg-[#FFECEC] text-[#FF4D4D]' },
  { to: '/rankings', label: 'Rank', Icon: Trophy, tint: 'bg-[#FFF3E0] text-role-seller' },
  { to: '/games', label: 'Fun Island', Icon: Gamepad2, tint: 'bg-[#E9F9EE] text-[#22A45D]' },
  { to: '/store', label: 'Store', Icon: Store, tint: 'bg-[#E6FAF6] text-[#00BFA5]' },
  { to: '/invite', label: 'Invite', Icon: Send, tint: 'bg-[#FFECF3] text-[#FF6EA6]' },
  { to: '/levels', label: 'Level', Icon: Crown, tint: 'bg-[#F3EDFF] text-[#8B5CF6]' },
  { to: '/fan-club', label: 'Fan Club', Icon: Heart, tint: 'bg-[#FDEBF3] text-[#EC4899]' },
  { to: '/achievements', label: 'Achievement Poster', Icon: Medal, tint: 'bg-[#FFECEC] text-[#E5342F]' },
];

/** Requirement #22H — the Agent & Agency section. */
const getAgentActions = (isAgent: boolean, pendingRequestsCount: number = 0) => [
  { to: '/agency', label: 'Agency', Icon: PiBuildingsFill, tint: 'bg-[#E8F4FF] text-[#2563EB]' },
  { to: isAgent ? '/agent' : '/my-agency', label: 'My Agency', Icon: UserCog, tint: 'bg-[#F3EDFF] text-[#8B5CF6]' },
  { to: '/transfer', label: 'Coin Transfer', Icon: Coins, tint: 'bg-[#FFF3E0] text-[#F59E0B]' },
  ...(isAgent
    ? [
        {
          to: '/agent/requests',
          label: 'Recharge / Withdraw',
          Icon: PiArrowsLeftRightFill,
          tint: 'bg-[#FFEFE8] text-[#FF5A1F]',
          badge: pendingRequestsCount,
        },
        { to: '/agent/invite-hosts', label: 'Add Host', Icon: UserPlus, tint: 'bg-[#E6FAF6] text-[#00BFA5]' },
      ]
    : [
        { to: '/agency', label: 'Join Agency', Icon: PiBuildingsFill, tint: 'bg-[#E6FAF6] text-[#00BFA5]' },
      ]),
];

export const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, updateUser } = useAuthStore();

  const [showContact, setShowContact] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showLevelSheet, setShowLevelSheet] = useState(false);
  const [levelSheetTab, setLevelSheetTab] = useState<'wealth' | 'live'>('wealth');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const isAgent = Boolean(
    user?.role === 'agent' ||
    user?.isAgent ||
    user?.isAdmin ||
    user?.role === 'admin'
  );

  const socket = useSocketStore((s) => s.socket);

  // Sync notification unread count
  useEffect(() => {
    if (!isAuthenticated) return;
    notificationApi
      .getUnreadCount()
      .then(({ data }) => {
        if (data.success && data.data) {
          setUnreadNotifications(data.data.count || 0);
        }
      })
      .catch(() => {});

    if (isAgent) {
      agentApi
        .getPendingCounts()
        .then(({ data }) => {
          if (data.success && data.data) {
            setPendingRequestsCount(data.data.totalPending || 0);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, isAgent]);

  useEffect(() => {
    if (!socket) return;
    const onNewNotif = (notif: any) => {
      setUnreadNotifications((c) => c + 1);
      if (isAgent && (notif?.type === 'recharge' || notif?.type === 'withdrawal')) {
        agentApi
          .getPendingCounts()
          .then(({ data }) => {
            if (data.success && data.data) {
              setPendingRequestsCount(data.data.totalPending || 0);
            }
          })
          .catch(() => {});
      }
    };

    const onAgentRequestNew = () => {
      if (isAgent) {
        setPendingRequestsCount((c) => c + 1);
      }
    };

    socket.on('notification:new', onNewNotif);
    socket.on('agent:request:new', onAgentRequestNew);
    return () => {
      socket.off('notification:new', onNewNotif);
      socket.off('agent:request:new', onAgentRequestNew);
    };
  }, [socket, isAgent]);

  // Requirement #2 — the four counts and fresh balances come from the server,
  // keeping diamonds, coins, and follow counts completely accurate.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    usersApi
      .getProfile()
      .then(({ data }) => {
        if (!cancelled && data.success && data.data) updateUser(data.data);
      })
      .catch(() => {});
    usersApi
      .getStats()
      .then(({ data }) => {
        if (!cancelled && data.success && data.data) setStats(data.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, updateUser]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-ink-muted mb-4">Sign in to view your profile</p>
        <button onClick={() => navigate('/login')} className="h-11 px-6 btn-primary">
          Sign In
        </button>
      </div>
    );
  }

  const wealthPoints = Math.max((user as any).wealthExp || 0, user.diamonds || 0);
  const liveTimeMinutes = (user as any).liveStreamMinutes || Math.floor(((user as any).liveStreamSeconds || 0) / 60);
  const wealthInfo = calculateWealthLevel(wealthPoints, (user as any).wealthLevel || user.level);
  const liveInfo = calculateLiveLevel(liveTimeMinutes, (user as any).liveLevel || user.level);

  const copyUid = async () => {
    try {
      await navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/user/${user._id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${user.nickname} on Navo Live`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 1600);
      }
    } catch {
      /* dismissed */
    }
  };

  const hasVip = Boolean(
    user.isVip ||
    user.hasPurchasedDiamonds ||
    ((user as any).wealthExp && (user as any).wealthExp > 0) ||
    user.noble ||
    (user.diamonds && user.diamonds > 0)
  );

  return (
    <div className="bg-surface-soft min-h-screen">
      {/* ── Cover Photo Banner ─────────────────────────────────── */}
      <div className="relative">
        <div className="h-44 w-full overflow-hidden bg-wash relative group">
          {user.cover ? (
            <img src={getMediaUrl(user.cover)} alt="Cover photo" className="w-full h-full object-cover" crossOrigin="anonymous" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-purple-200 via-pink-100 to-rose-200 opacity-60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20 pointer-events-none" />

          {/* Edit cover button */}
          <button
            onClick={() => setEditing(true)}
            className="absolute right-3 bottom-3 h-8 px-3 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform shadow-sm"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{user.cover ? 'Change Cover' : 'Add Cover'}</span>
          </button>
        </div>

        {/* Header Action Bar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-3 h-14 z-10">
          <h1 className="text-[26px] font-bold text-white drop-shadow-md">Me</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/notifications')}
              aria-label="Notifications"
              className="relative w-9 h-9 rounded-full bg-black/35 backdrop-blur-md text-white flex items-center justify-center active:bg-black/50 transition-colors shadow-sm"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-3.5 px-1 bg-red-500 rounded-full ring-2 ring-black/40 flex items-center justify-center text-[9px] font-bold text-white leading-none">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </button>
            <button
              onClick={handleShare}
              aria-label="Share profile"
              className="w-9 h-9 rounded-full bg-black/35 backdrop-blur-md text-white flex items-center justify-center active:bg-black/50 transition-colors shadow-sm"
            >
              {shared ? <Check className="w-5 h-5 text-status-online" /> : <Share2 className="w-5 h-5" />}
            </button>
            <button
              onClick={() => navigate('/settings')}
              aria-label="Settings"
              className="w-9 h-9 rounded-full bg-black/35 backdrop-blur-md text-white flex items-center justify-center active:bg-black/50 transition-colors shadow-sm"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── User Profile Header Card (Image 2 Design) ───────────────────────────── */}
      <div className="bg-wash px-4 pt-2 pb-4">
        <div className="w-full flex items-center gap-3 -mt-8 relative z-10">
          {/* Avatar — tapping opens the editor */}
          <button
            onClick={() => setEditing(true)}
            className="ring-4 ring-wash rounded-full shrink-0 bg-white shadow-md active:scale-95 transition-transform"
            aria-label="Edit Avatar"
          >
            <Avatar src={user.avatar} nickname={user.nickname} size="xl" online />
          </button>

          {/* User Details */}
          <div className="flex-1 min-w-0 pt-6">
            {/* Row 1: Nickname + Badges + Arrow with Red Notification Dot */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="font-extrabold text-ink text-lg truncate tracking-tight uppercase">
                  {user.nickname}
                </span>
                {user.hostBadge && user.hostBadge !== 'none' && (
                  <HostBadge badge={user.hostBadge} size="sm" />
                )}
                {user.equippedBadge && (
                  <EquippedBadge
                    badge={user.equippedBadge}
                    size="sm"
                    onClick={() => navigate('/store?category=badge')}
                  />
                )}
              </div>

              {/* Arrow and Red Dot indicator leading to Edit Profile Sheet */}
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 pl-2 pr-0.5 py-1 active:opacity-70 group shrink-0"
                aria-label="Edit Profile"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF2D55] shrink-0 animate-pulse shadow-sm" />
                <ChevronRight className="w-5 h-5 text-ink-muted group-hover:text-ink transition-colors" />
              </button>
            </div>

            {/* Row 2: Live Level + Wealth Level + ID */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Live Level Leaf Capsule */}
              <LiveLevelPill
                level={liveInfo.level}
                onClick={() => {
                  setLevelSheetTab('live');
                  setShowLevelSheet(true);
                }}
              />

              {/* Wealth Level Star Capsule */}
              <WealthLevelPill
                level={wealthInfo.level}
                onClick={() => {
                  setLevelSheetTab('wealth');
                  setShowLevelSheet(true);
                }}
              />

              {/* ID Badge & Copy Icon */}
              <div className="flex items-center gap-1.5 ml-0.5 text-ink-muted text-xs font-semibold">
                <span className="inline-flex items-center justify-center italic font-black text-[10px] px-1.5 py-0.5 bg-ink/10 rounded-full text-ink/70">
                  ID
                </span>
                <span className="tabular-nums tracking-wide">{user.uid}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyUid();
                  }}
                  className="p-0.5 text-ink-faint hover:text-ink active:scale-90 transition-transform"
                  aria-label="Copy your ID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-status-online" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Requirement #2 — Friends / Following / Followers / Visitors ── */}
      <div className="bg-white px-2 py-3">
        <ProfileStatsRow userId={user._id} stats={stats} loading={statsLoading} />
      </div>

      {/* ── Balances (Diamonds for Top-Up / Games, Coins for Income / Earned) ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-3">
        {/* Diamonds — Recharged/Purchased for games and store */}
        <button
          onClick={() => navigate('/top-up')}
          className="relative overflow-hidden rounded-card p-3.5 text-left bg-[#E8F4FF] border border-cyan-100 shadow-sm active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-cyan-900/80">Diamonds</p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700">Top-Up</span>
          </div>
          <p className="text-xl font-extrabold text-ink mt-1 tabular-nums">
            {(user.diamonds ?? 0).toLocaleString()}
          </p>
          <DiamondIcon className="w-12 h-12 text-cyan-500/20 absolute -right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
        </button>

        {/* Coins — Earned from Live, Party, Games, and Gifts */}
        <button
          onClick={() => navigate('/income')}
          className="relative overflow-hidden rounded-card p-3.5 text-left bg-[#FFF8E5] border border-amber-100 shadow-sm active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-900/80">Income (Coins)</p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700">Agency Trade</span>
          </div>
          <p className="text-xl font-extrabold text-ink mt-1 tabular-nums">
            {(user.coins ?? 0).toLocaleString()}
          </p>
          <CoinIcon className="w-12 h-12 text-amber-500/20 absolute -right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
        </button>
      </div>

      {/* ── Quick actions ──────────────────────────────────────── */}
      <div className="mx-4 mt-3 bg-white rounded-card p-3">
        <div className="grid grid-cols-4 gap-y-4">
          {QUICK_ACTIONS.map(({ to, label, Icon, tint }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-1.5 active:opacity-60 transition-opacity"
            >
              <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${tint}`}>
                <Icon className="w-5 h-5" />
              </span>
              <span className="text-[11px] text-ink-soft">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Agent & Agency section (#22H) ───────────────────────── */}
      <div className="mx-4 mt-3 bg-white rounded-card p-3 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-ink">Agent</h2>
            {pendingRequestsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#FF2D55] text-white text-[10px] font-black animate-pulse shadow-2xs">
                {pendingRequestsCount} Pending
              </span>
            )}
          </div>
          <button
            onClick={() => navigate('/agency')}
            className="text-sm text-ink-muted flex items-center gap-0.5 hover:text-ink transition-colors"
          >
            All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-y-4">
          {getAgentActions(isAgent, pendingRequestsCount).map(({ to, label, Icon, tint, badge }) => (
            <button
              key={to + label}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-1.5 active:opacity-60 transition-opacity"
            >
              <div className="relative">
                <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${tint}`}>
                  <Icon className="w-5 h-5" />
                </span>
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 bg-[#FF2D55] rounded-full ring-2 ring-white flex items-center justify-center text-[10px] font-black text-white leading-none animate-pulse shadow-sm">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-ink-soft text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={() => navigate('/agency?filter=popular')}
            className="h-11 rounded-xl bg-surface-soft text-sm font-medium text-ink-soft hover:bg-surface-sunken active:scale-[0.98] transition-all flex items-center justify-center"
          >
            Agency Ranking
          </button>
          <button
            onClick={() => navigate('/rankings?board=agent_count')}
            className="h-11 rounded-xl bg-surface-soft text-sm font-medium text-ink-soft hover:bg-surface-sunken active:scale-[0.98] transition-all flex items-center justify-center"
          >
            Agent Ranking
          </button>
        </div>
      </div>

      {/* ── Centers ────────────────────────────────────────────── */}
      <div className="mx-4 mt-3 list-group">
        <MenuRow
          icon={<PiTelevision className="w-5 h-5" />}
          label="Streamer Center"
          onClick={() => navigate('/streamer-center')}
        />
        <MenuRow
          icon={<PiLightbulb className="w-5 h-5" />}
          label="Video Creator Center"
          onClick={() => navigate('/creator-center')}
        />
      </div>

      {/* ── Menu ───────────────────────────────────────────────── */}
      <div className="mx-4 mt-3 list-group">
        {(user.isAdmin || user.role === 'admin') && (
          <MenuRow
            icon={<ShieldCheck className="w-[22px] h-[22px] text-purple-600" />}
            label="Admin Control Dashboard"
            value="Port 3001"
            onClick={() => {
              window.open('http://localhost:3001', '_blank');
            }}
          />
        )}
        <MenuRow
          icon={<WalletIcon className="w-[22px] h-[22px] text-[#f5a623]" />}
          label="Wallet"
          onClick={() => navigate('/wallet')}
        />
        <MenuRow
          icon={<Coins className="w-[22px] h-[22px] text-[#f5a623]" />}
          label="Withdraw Method"
          onClick={() => navigate('/withdraw-methods')}
        />
        <MenuRow
          icon={<Headphones className="w-[22px] h-[22px] text-orange-400" />}
          label="Help Center"
          rightNode={<span className="text-[13px] text-ink-muted mr-1">24h</span>}
          onClick={() => navigate('/help')}
        />

        <MenuRow
          icon={<PiClock className="w-5 h-5" />}
          label="Watch History"
          onClick={() => navigate('/watch-history')}
        />
        <MenuRow
          icon={<Crown className="w-5 h-5" />}
          label="Level"
          onClick={() => navigate('/levels')}
        />
        <MenuRow
          icon={<Medal className="w-5 h-5" />}
          label="Achievement Poster"
          onClick={() => navigate('/achievements')}
        />
        <MenuRow
          icon={<PiBackpack className="w-5 h-5 text-indigo-500" />}
          label="Bag"
          rightNode={<div className="w-1.5 h-1.5 rounded-full bg-status-danger mr-1" />}
          onClick={() => navigate('/bag')}
        />
        <MenuRow
          icon={<PiBuildingsFill className="w-5 h-5 text-indigo-600" />}
          label="Agency Center"
          onClick={() => navigate('/agency')}
        />
        <MenuRow
          icon={<PiUsersFill className="w-5 h-5 text-indigo-500" />}
          label="My Agency"
          onClick={() => navigate('/my-agency')}
        />
        <MenuRow
          icon={<PiSealCheck className="w-5 h-5" />}
          label="Authentication"
          onClick={() => navigate('/verification')}
        />
      </div>

      <div className="mx-4 mt-3 mb-6 list-group">
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="list-row w-full text-role-host font-semibold"
        >
          <LogOut className="w-5 h-5" />
          <span className="flex-1 text-left">Logout</span>
        </button>
      </div>

      {showContact && <ContactUsModal onClose={() => setShowContact(false)} />}
      <EditProfileSheet isOpen={editing} onClose={() => setEditing(false)} />
      <LevelDetailSheet
        isOpen={showLevelSheet}
        onClose={() => setShowLevelSheet(false)}
        defaultTab={levelSheetTab}
        userDiamonds={wealthPoints}
        userCoins={user.coins}
        userLiveTimeMinutes={liveTimeMinutes}
        userWealthLevel={(user as any).wealthLevel || user.level}
        userLiveLevel={(user as any).liveLevel || 1}
        userLevel={user.level}
      />
    </div>
  );
};

interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  rightNode?: React.ReactNode;
  onClick: () => void;
}

const MenuRow: React.FC<MenuRowProps> = ({
  icon,
  label,
  value,
  rightNode,
  onClick,
}) => {
  return (
    <button onClick={onClick} className="list-row w-full">
      <span className="text-ink-muted flex items-center justify-center w-6">{icon}</span>
      <span className="flex-1 text-left text-[15px]">{label}</span>
      {value && <span className="text-[13px] text-ink-muted mr-1">{value}</span>}
      {rightNode}
      <ChevronRight className="w-[18px] h-[18px] text-[#D3D3D3] shrink-0" />
    </button>
  );
};
