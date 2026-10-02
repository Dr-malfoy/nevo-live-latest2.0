import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiCakeFill as Cake,
  PiCopyFill as Copy,
  PiCheckBold as Check,
  PiFlagFill as Flag,
  PiMapPinFill as MapPin,
  PiChatCircleFill as MessageCircle,
  PiUserFill as UserIcon,
  PiPhoneFill as Phone,
  PiVideoCameraFill as VideoCamera,
} from 'react-icons/pi';
import { chatApi, usersApi, callApi } from '../api';
import {
  Avatar,
  FollowButton,
  ProfileStatsRow,
  RoleTags,
  UserNameplate,
} from '../components/user';
import { useAuthStore, useSocketStore, useUIStore } from '../stores';
import { ReportModal } from '../components/report/ReportModal';
import { Loading } from '../components/ui';
import { InsufficientCoinsModal } from '../components/call/InsufficientCoinsModal';
import { CallScreen } from '../components/call/CallScreen';
import { requestMediaPermissions } from '../lib/permissions';
import { countryLabel, flagEmoji } from '../lib/countries';
import { levelTier, tierProgress, nextTierAt, vipInfo } from '../lib/levels';
import type { PublicProfile as PublicProfileData } from '../types';

const GENDER_LABEL: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

/**
 * Requirement #4 — the full details page reached from the `›` on a user card.
 *
 *   Big profile pic · name + Lv + VIP + role tag + online state
 *   Age · Country + flag · Bio · Tags
 *   Friends / Following / Followers / Visitors
 *   Level progress + badges
 */
export const PublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const socket = useSocketStore((s) => s.socket);
  const showToast = useUIStore((s) => s.showToast);

  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [copied, setCopied] = useState(false);

  // Call state
  const [insufficientCoins, setInsufficientCoins] = useState<{
    visible: boolean;
    reason?: string;
    coinsPerMinute?: number;
    balance?: number;
    minBalance?: number;
  }>({ visible: false });
  const [activeCall, setActiveCall] = useState<{
    callId: string;
    channel: string;
    type: 'audio' | 'video';
    token: string;
    coinsPerMinute: number;
  } | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    usersApi
      .getPublicProfile(id)
      .then(({ data }) => {
        if (!cancelled && data.success) setProfile(data.data as PublicProfileData);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const isSelf = !!profile && profile._id === user?._id;

  // Socket listener for call accept & end
  useEffect(() => {
    if (!socket || !activeCall?.callId) return;

    const onCallAccept = (payload: any) => {
      if (payload?.callId === activeCall.callId) {
        setCallAccepted(true);
      }
    };
    const onCallEnd = (payload: any) => {
      if (payload?.callId === activeCall.callId) {
        setActiveCall(null);
        setCallAccepted(false);
      }
    };

    socket.on('call:accept', onCallAccept);
    socket.on('call:end', onCallEnd);

    return () => {
      socket.off('call:accept', onCallAccept);
      socket.off('call:end', onCallEnd);
    };
  }, [socket, activeCall?.callId]);



  const startProfileCall = async (type: 'audio' | 'video') => {
    if (!profile?._id) return;

    // Check & request camera/mic permissions
    const perm = await requestMediaPermissions(type);
    if (!perm.granted) {
      showToast(perm.error || 'Media permission denied', 'error');
      return;
    }

    try {
      // 1. Balance Check & Price Quote
      const { data: quoteRes } = await callApi.getQuote(profile._id);
      if (quoteRes.success && quoteRes.data) {
        if (!quoteRes.data.canCall) {
          setInsufficientCoins({
            visible: true,
            reason: quoteRes.data.reason,
            coinsPerMinute: quoteRes.data.coinsPerMinute,
            balance: quoteRes.data.balance,
            minBalance: quoteRes.data.minBalance,
          });
          return;
        }
      }

      // 2. Start Call Request
      setCallAccepted(false);
      const { data } = await callApi.create([profile._id], type, 'profile');
      if (data.success && data.data) {
        setActiveCall({
          callId: data.data.callId,
          channel: data.data.channel,
          type: data.data.type,
          token: data.data.token,
          coinsPerMinute: data.data.coinsPerMinute || quoteRes.data?.coinsPerMinute || 10000,
        });
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      if (err.response?.status === 402 || errorData?.error?.includes('Insufficient Coins')) {
        setInsufficientCoins({
          visible: true,
          reason: errorData?.error || 'Insufficient Coins to start call',
          coinsPerMinute: 10000,
          balance: user?.coins || 0,
          minBalance: 1000000,
        });
      } else {
        showToast(errorData?.error || err.message || 'Could not start call', 'error');
      }
    }
  };

  const handleMessage = async () => {
    if (!id) return;
    try {
      const { data } = await chatApi.getOrCreateChat(id);
      if (data.success) navigate(`/chat/${data.data._id}`);
    } catch {
      /* non-fatal */
    }
  };

  const copyUid = async () => {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(profile.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Loading className="pt-32" size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 text-center">
        <p className="text-base font-semibold text-ink mb-1">User not found</p>
        <p className="text-sm text-ink-muted">This account may have been deleted.</p>
        <button onClick={() => navigate(-1)} className="mt-4 h-9 px-4 btn-secondary text-sm">
          Go back
        </button>
      </div>
    );
  }

  const tier = levelTier(profile.level);
  const progress = tierProgress(profile.level);
  const nextAt = nextTierAt(profile.level);
  const vip = vipInfo(profile.noble as any);
  const roleTags = <RoleTags user={profile as any} size="md" />;

  return (
    <div className="min-h-screen bg-surface-soft pb-8">
      {/* ── Cover + back bar ───────────────────────────────────── */}
      <div className="relative">
        <div className="h-40 w-full overflow-hidden bg-wash">
          {profile.cover && (
            <img src={profile.cover} alt="" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 h-14">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-9 h-9 rounded-full bg-black/35 backdrop-blur text-white flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {!isSelf && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => startProfileCall('audio')}
                aria-label="Audio call"
                className="w-9 h-9 rounded-full bg-black/35 backdrop-blur text-white flex items-center justify-center active:scale-95 transition-transform"
                title="Audio Call"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => startProfileCall('video')}
                aria-label="Video call"
                className="w-9 h-9 rounded-full bg-black/35 backdrop-blur text-white flex items-center justify-center active:scale-95 transition-transform"
                title="Video Call"
              >
                <VideoCamera className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowReport(true)}
                aria-label="Report this user"
                className="w-9 h-9 rounded-full bg-black/35 backdrop-blur text-white flex items-center justify-center"
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Identity card ──────────────────────────────────────── */}
      <div className="bg-white px-4 pb-4 -mt-10 mx-3 rounded-card shadow-card relative">
        <div className="flex items-end gap-3 -mt-8">
          <Avatar
            src={profile.avatar}
            nickname={profile.nickname}
            size="2xl"
            online={profile.online}
            ringed
          />
          {!isSelf && (
            <div className="flex items-center gap-1.5 pb-2 ml-auto flex-wrap justify-end">
              <button
                onClick={() => startProfileCall('audio')}
                className="h-9 px-3 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold inline-flex items-center gap-1 active:bg-emerald-100 transition-colors shadow-2xs"
                title="1:1 Audio Call"
              >
                <Phone className="w-3.5 h-3.5" />
                Call
              </button>
              <button
                onClick={() => startProfileCall('video')}
                className="h-9 px-3 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold inline-flex items-center gap-1 active:bg-indigo-100 transition-colors shadow-2xs"
                title="1:1 Video Call"
              >
                <VideoCamera className="w-3.5 h-3.5" />
                Video
              </button>
              <button
                onClick={handleMessage}
                className="h-9 px-3 rounded-full bg-surface-sunken text-ink text-xs font-semibold inline-flex items-center gap-1"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Message
              </button>
              <FollowButton
                targetUserId={profile._id}
                initialFollowing={profile.isFollowing}
                size="md"
              />
            </div>
          )}
        </div>


        <div className="mt-3">
          <UserNameplate user={profile as any} size="lg" showRoles={false} />
          {roleTags && <div className="mt-2">{roleTags}</div>}
        </div>

        {/* ID + mutual-follow hint */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
            ID: {profile.uid}
            <button onClick={copyUid} aria-label="Copy ID" className="text-ink-faint active:text-ink">
              {copied ? <Check className="w-3.5 h-3.5 text-status-online" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </span>
          {profile.isFriend && (
            <span className="text-[10px] font-bold text-accent-600 bg-accent-50 px-1.5 py-0.5 rounded">
              FRIENDS
            </span>
          )}
          {!profile.isFriend && profile.isFollowedBy && (
            <span className="text-[10px] font-bold text-ink-muted bg-surface-sunken px-1.5 py-0.5 rounded">
              FOLLOWS YOU
            </span>
          )}
        </div>

        {/* Age / country / gender */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {typeof profile.age === 'number' && (
            <Chip icon={<Cake className="w-3.5 h-3.5" />}>{profile.age} yrs</Chip>
          )}
          {profile.gender && profile.gender !== 'unspecified' && (
            <Chip icon={<UserIcon className="w-3.5 h-3.5" />}>{GENDER_LABEL[profile.gender]}</Chip>
          )}
          {profile.country && (
            <Chip icon={<MapPin className="w-3.5 h-3.5" />}>{countryLabel(profile.country)}</Chip>
          )}
        </div>

        {/* Bio */}
        {profile.bio && <p className="text-sm text-ink-soft mt-3 leading-relaxed">{profile.bio}</p>}

        {/* Tags */}
        {profile.tags && profile.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {profile.tags.map((tag) => (
              <span
                key={tag}
                className="h-7 px-2.5 rounded-full bg-accent-50 text-accent-600 text-xs font-medium inline-flex items-center"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Requirement #2 — stats ─────────────────────────────── */}
      <div className="bg-white mx-3 mt-3 rounded-card py-3 px-1">
        <ProfileStatsRow
          userId={profile._id}
          stats={profile}
          // Visitors are private — only the owner can open that list.
          showVisitors={isSelf}
        />
      </div>

      {/* ── Requirement #4 — level progress + badges ───────────── */}
      <div className="bg-white mx-3 mt-3 rounded-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-ink">Level</h2>
          <span className={`text-xs font-bold ${tier.text}`}>
            {tier.label} · Lv.{profile.level}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-line overflow-hidden">
          <div className={`h-full rounded-full ${tier.pill}`} style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <p className="text-[11px] text-ink-muted mt-2">
          {nextAt ? `Next tier unlocks at Lv.${nextAt}` : 'Top tier reached'}
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          <BadgeTile label={`Lv.${profile.level}`} sub={tier.label} className={tier.pill} />
          {vip && <BadgeTile label={vip.label} sub="Noble" className={vip.pill} />}
          {profile.country && (
            <BadgeTile
              label={flagEmoji(profile.country)}
              sub={countryLabel(profile.country).replace(/^\S+\s/, '')}
              className="bg-surface-sunken text-ink"
            />
          )}
          {profile.verification?.verified && (
            <BadgeTile label="✓" sub="Verified" className="bg-role-official text-white" />
          )}
        </div>
      </div>

      {showReport && (
        <ReportModal targetType="user" targetId={profile._id} onClose={() => setShowReport(false)} />
      )}

      {/* Insufficient Coins Modal */}
      <InsufficientCoinsModal
        visible={insufficientCoins.visible}
        reason={insufficientCoins.reason}
        coinsPerMinute={insufficientCoins.coinsPerMinute}
        balance={insufficientCoins.balance}
        minBalance={insufficientCoins.minBalance}
        onClose={() => setInsufficientCoins({ visible: false })}
      />

      {/* Active Call Screen */}
      {activeCall && (
        <CallScreen
          outgoing={{
            callId: activeCall.callId,
            channel: activeCall.channel,
            type: activeCall.type,
            token: activeCall.token,
            callee: { nickname: profile.nickname, avatar: profile.avatar, online: Boolean(profile.online) },
          }}
          accepted={callAccepted}
          coinsPerMinute={activeCall.coinsPerMinute}
          isAudience={true}
          onClose={() => {
            setActiveCall(null);
            setCallAccepted(false);
          }}
        />
      )}
    </div>
  );
};


function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-surface-sunken text-ink-soft text-xs font-medium">
      {icon}
      {children}
    </span>
  );
}

function BadgeTile({ label, sub, className }: { label: string; sub: string; className: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-base font-bold ${className}`}
      >
        {label}
      </span>
      <span className="text-[10px] text-ink-muted">{sub}</span>
    </div>
  );
}
