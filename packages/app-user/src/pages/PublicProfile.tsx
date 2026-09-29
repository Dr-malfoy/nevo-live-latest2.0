import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiCakeFill as Cake, PiCopyFill as Copy, PiCheckBold as Check, PiFlagFill as Flag, PiMapPinFill as MapPin, PiChatCircleFill as MessageCircle, PiUserFill as UserIcon } from 'react-icons/pi';
import { chatApi, usersApi } from '../api';
import {
  Avatar,
  FollowButton,
  ProfileStatsRow,
  RoleTags,
  UserNameplate,
} from '../components/user';
import { useAuthStore } from '../stores';
import { ReportModal } from '../components/report/ReportModal';
import { Loading } from '../components/ui';
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

  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [copied, setCopied] = useState(false);

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
            <button
              onClick={() => setShowReport(true)}
              aria-label="Report this user"
              className="w-9 h-9 rounded-full bg-black/35 backdrop-blur text-white flex items-center justify-center"
            >
              <Flag className="w-4 h-4" />
            </button>
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
            <div className="flex items-center gap-2 pb-2 ml-auto">
              <button
                onClick={handleMessage}
                className="h-9 px-4 rounded-full bg-surface-sunken text-ink text-sm font-semibold inline-flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
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
