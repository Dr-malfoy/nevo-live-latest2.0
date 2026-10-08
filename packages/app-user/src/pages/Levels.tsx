import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  PiCaretRightBold as ChevronRight,
  PiLockFill as Lock,
  PiSparkleFill as Sparkles,
  PiCrownFill as Crown,
  PiCheckBold as Check,
  PiShieldStarFill as ShieldStar,
  PiMedalFill as Medal,
  PiTrophyFill as Trophy,
  PiBroadcastFill as Broadcast,
  PiEyeFill as Eye,
  PiChatCircleFill as MessageCircle,
  PiUserBold as UserIcon,
} from 'react-icons/pi';
import { levelApi, type LevelKind, type LevelPrivilege, type LevelState } from '../api/progress.api';
import { optional } from '../api/pending';
import { useAuthStore } from '../stores';
import { ScreenHeader, TabBar, HelpButton, EmptyState } from '../components/common';
import { Loading, Modal, Button } from '../components/ui';
import { Avatar } from '../components/user';
import {
  WEALTH_BADGE_TIERS,
  LIVESTREAM_BADGE_TIERS,
  getBadgeTierForLevel,
  PremiumBadgeEmblem,
  type LevelBadgeTier,
} from '../components/levels/PremiumLevelBadge';

type ViewMode = 'badges' | 'privileges';

const THEMES: Record<LevelKind, { label: string; page: string; card: string; accent: string; badgeGlow: string }> = {
  wealth: {
    label: 'Wealth Level',
    page: 'bg-gradient-to-b from-[#451A03] via-[#2A1207] to-[#120703]',
    card: 'bg-[#2E160D]/80 border-amber-900/40',
    accent: 'bg-gradient-to-r from-[#F59E0B] to-[#EF4444]',
    badgeGlow: 'rgba(245, 158, 11, 0.4)',
  },
  livestream: {
    label: 'Livestream Level',
    page: 'bg-gradient-to-b from-[#082F49] via-[#08233C] to-[#04121F]',
    card: 'bg-[#0B253D]/80 border-sky-900/40',
    accent: 'bg-gradient-to-r from-[#38BDF8] to-[#2563EB]',
    badgeGlow: 'rgba(56, 189, 248, 0.4)',
  },
};

/** Group privileges by the level they unlock at. */
function groupByLevel(items: LevelPrivilege[]): { level: number; items: LevelPrivilege[] }[] {
  const map = new Map<number, LevelPrivilege[]>();
  for (const item of items) {
    const list = map.get(item.level) ?? [];
    list.push(item);
    map.set(item.level, list);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([level, list]) => ({ level, items: list }));
}

const SCOPE_LABEL: Record<string, string> = {
  all_rooms: 'Visible across all live rooms & public profiles',
  ongoing_room: 'Visible in ongoing live room & live chat',
};

export const Levels = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [params, setParams] = useSearchParams();
  const initialKind = (params.get('kind') as LevelKind) || 'wealth';

  const [kind, setKind] = useState<LevelKind>(initialKind);
  const [viewMode, setViewMode] = useState<ViewMode>('badges');
  const [state, setState] = useState<LevelState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPrivilege, setSelectedPrivilege] = useState<LevelPrivilege | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<LevelBadgeTier | null>(null);

  const theme = THEMES[kind];
  const allTiers = kind === 'livestream' ? LIVESTREAM_BADGE_TIERS : WEALTH_BADGE_TIERS;
  const currentLevel = state?.current?.level || 1;
  const currentBadgeTier = useMemo(() => getBadgeTierForLevel(currentLevel, kind), [currentLevel, kind]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    optional(levelApi.get(kind))
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res.data?.current) {
          setState(res.data);
        } else {
          setState(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [kind]);

  const selectKind = (next: LevelKind) => {
    setKind(next);
    setParams({ kind: next }, { replace: true });
  };

  return (
    <div className={`min-h-screen ${theme.page} pb-16`}>
      <ScreenHeader title="Level Center" variant="media" right={<HelpButton light />} />

      {/* Level Kind Switcher (Scrolls up naturally with page content) */}
      <div className="px-3 pt-1 pb-2">
        <div className="p-1 rounded-2xl bg-white/15 backdrop-blur-md border border-white/15 flex gap-1 shadow-lg">
          <button
            onClick={() => selectKind('wealth')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
              kind === 'wealth'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-md'
                : 'text-white/75 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>💎 Wealth Level</span>
          </button>

          <button
            onClick={() => selectKind('livestream')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
              kind === 'livestream'
                ? 'bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600 text-white shadow-md'
                : 'text-white/75 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>📡 Livestream Level</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center pt-24 gap-3">
          <Loading size="lg" />
          <p className="text-sm text-white/70 animate-pulse font-medium">Loading premium level badges...</p>
        </div>
      ) : !state ? (
        <div className="pt-16 px-4">
          <EmptyState
            icon={<Sparkles className="w-6 h-6" />}
            title="Level state unavailable"
            className="[&_p:first-of-type]:text-white [&_p:last-of-type]:text-white/60"
          />
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          {/* 1. HERO CURRENT LEVEL & EQUIPPED BADGE CARD */}
          <div className="mx-3 relative overflow-hidden rounded-3xl p-5 border shadow-2xl backdrop-blur-md transition-all"
            style={{
              background: `linear-gradient(135deg, ${currentBadgeTier.gradient}, rgba(15, 23, 42, 0.95))`,
              borderColor: 'rgba(255, 255, 255, 0.15)',
              boxShadow: `0 10px 30px ${theme.badgeGlow}`,
            }}
          >
            {/* Background Ambient Glow */}
            <div
              className="absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-60"
              style={{ backgroundColor: currentBadgeTier.accentColor }}
            />

            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[32px] leading-none font-black text-white tracking-tight">
                    Lv.{state.current.level}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-white text-[11px] font-black uppercase tracking-wider border border-white/30 shadow-xs"
                    style={{ background: `linear-gradient(90deg, ${currentBadgeTier.accentColor}, #111827)` }}
                  >
                    <Sparkles className="w-3 h-3 text-white" /> {currentBadgeTier.title}
                  </span>
                </div>

                <p className="text-xs text-white/80 font-medium mt-1">
                  {currentBadgeTier.subtitle}
                </p>

                {/* Progress bar */}
                <div className="mt-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-white/90">
                    <span>
                      {state.current.points.toLocaleString()} {kind === 'wealth' ? 'Diamonds spent' : 'Minutes streamed'}
                    </span>
                    <span>{Math.round((state.current.progress || 0) * 100)}%</span>
                  </div>

                  <div className="h-2 rounded-full bg-black/40 overflow-hidden border border-white/10 p-[1px]">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${theme.accent}`}
                      style={{ width: `${Math.min(100, Math.max(6, Math.round((state.current.progress || 0) * 100)))}%` }}
                    />
                  </div>

                  {state.current.remaining != null && (
                    <p className="text-[11px] text-white/70">
                      Need <strong className="text-white">{state.current.remaining.toLocaleString()}</strong> more {kind === 'wealth' ? 'Diamonds' : 'Mins'} to unlock <strong className="text-white">Lv.{state.current.nextLevel || state.current.level + 1}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* 3D Crest Badge Avatar */}
              <div
                onClick={() => setSelectedBadge(currentBadgeTier)}
                className="cursor-pointer group flex flex-col items-center shrink-0 pt-1 active:scale-95 transition-transform"
                title="Tap to inspect badge"
              >
                <PremiumBadgeEmblem tier={currentBadgeTier} level={state.current.level} size="lg" animated />
                <span className="text-[10px] font-bold text-white/90 group-hover:text-white mt-2.5 flex items-center gap-0.5 bg-black/40 px-2 py-0.5 rounded-full border border-white/20">
                  <Eye className="w-2.5 h-2.5" /> Inspect
                </span>
              </div>
            </div>
          </div>

          {/* 2. SUB-NAVIGATION SWITCHER (BADGES SHOWCASE vs PRIVILEGES) */}
          <div className="mx-3 p-1 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex gap-1">
            <button
              onClick={() => setViewMode('badges')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                viewMode === 'badges'
                  ? 'bg-white text-slate-900 shadow-md scale-[1.01]'
                  : 'text-white/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-500" />
              <span>Premium Badges ({allTiers.length})</span>
            </button>

            <button
              onClick={() => setViewMode('privileges')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                viewMode === 'privileges'
                  ? 'bg-white text-slate-900 shadow-md scale-[1.01]'
                  : 'text-white/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <Medal className="w-4 h-4 text-sky-500" />
              <span>Tier Privileges ({state.unlocked.length + state.locked.length})</span>
            </button>
          </div>

          {/* 3. VIEW MODE: PREMIUM BADGES GALLERY */}
          {viewMode === 'badges' && (
            <div className="px-3 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    {kind === 'wealth' ? 'Wealth Sovereign Badges' : 'Live Broadcaster Badges'}
                  </h2>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    Badges automatically display in live room chats, member lists, and profile headers.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {allTiers.map((tier) => {
                  const isUnlocked = currentLevel >= tier.minLevel;
                  const isEquipped = currentBadgeTier.id === tier.id;

                  return (
                    <div
                      key={tier.id}
                      onClick={() => setSelectedBadge(tier)}
                      className={`relative overflow-hidden rounded-2xl p-3.5 border transition-all cursor-pointer active:scale-[0.99] flex items-center gap-3.5 ${
                        isEquipped
                          ? 'bg-gradient-to-r from-amber-500/20 via-slate-900/80 to-slate-900 border-amber-400/50 shadow-lg shadow-amber-500/10'
                          : isUnlocked
                          ? 'bg-slate-900/70 hover:bg-slate-900/90 border-white/20'
                          : 'bg-slate-950/60 border-white/5 opacity-85'
                      }`}
                    >
                      {/* Left Badge Emblem */}
                      <PremiumBadgeEmblem tier={tier} level={tier.minLevel} size="md" />

                      {/* Middle Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-white truncate">{tier.title}</h3>
                          <span
                            className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider text-white border border-white/20"
                            style={{ backgroundColor: tier.accentColor + '55' }}
                          >
                            {tier.rarity}
                          </span>
                        </div>

                        <p className="text-[11px] text-white/60 font-medium mt-0.5">
                          Tier Range: <strong className="text-white">Lv.{tier.minLevel} – {tier.maxLevel === 100 && tier.minLevel === 100 ? '100 (Max)' : tier.maxLevel}</strong>
                        </p>

                        <p className="text-[11px] text-white/80 truncate mt-1">
                          ✨ {tier.benefits[0]}
                        </p>
                      </div>

                      {/* Right Status Badge */}
                      <div className="shrink-0 text-right">
                        {isEquipped ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black shadow-sm">
                            <Check className="w-3 h-3" /> Equipped
                          </span>
                        ) : isUnlocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                            <Check className="w-3 h-3" /> Unlocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-white/50 text-[10px] font-semibold">
                            <Lock className="w-3 h-3" /> Lv.{tier.minLevel}
                          </span>
                        )}
                        <span className="block text-[9px] text-white/40 mt-1">Tap to view</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. VIEW MODE: PRIVILEGES & LADDER */}
          {viewMode === 'privileges' && (
            <div className="px-3 space-y-4">
              {/* Unlocked Privileges */}
              {state.unlocked.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-sm font-bold text-white flex items-center gap-1.5 px-1">
                    <Check className="w-4 h-4 text-emerald-400 font-black" /> Unlocked Benefits ({state.unlocked.length})
                  </h2>

                  <div className="grid grid-cols-2 gap-2">
                    {state.unlocked.map((item, i) => (
                      <div
                        key={`${item.level}-${item.key}-${i}`}
                        onClick={() => setSelectedPrivilege(item)}
                        className={`rounded-2xl p-3 border border-white/15 cursor-pointer hover:scale-[1.02] transition-transform ${theme.card}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded-full bg-white/15 text-white text-[10px] font-black">
                            Lv.{item.level}
                          </span>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <p className="text-xs font-bold text-white leading-snug line-clamp-2">{item.title}</p>
                        <p className="text-[10px] text-white/60 mt-1 line-clamp-1">{item.hint || (item.scope ? SCOPE_LABEL[item.scope] : 'Privilege active')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Locked Privileges */}
              {state.locked.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h2 className="text-sm font-semibold text-white/60 flex items-center gap-1.5 px-1">
                    <Lock className="w-4 h-4" /> Locked Tier Benefits ({state.locked.length})
                  </h2>

                  <div className="space-y-3">
                    {groupByLevel(state.locked).map(({ level, items }) => (
                      <div key={level} className="space-y-1.5">
                        <p className="flex items-center gap-1.5 text-white font-bold text-xs px-1">
                          <span className="px-2 py-0.5 rounded-full bg-white/15 text-white text-[10px] font-black">
                            Unlocks at Lv.{level}
                          </span>
                        </p>

                        <div className="space-y-2">
                          {items.map((item, i) => (
                            <div
                              key={`${item.key}-${i}`}
                              onClick={() => setSelectedPrivilege(item)}
                              className={`flex items-center gap-3 rounded-2xl p-3 border border-white/5 cursor-pointer hover:border-white/20 transition-all ${theme.card}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-white text-xs">{item.title}</p>
                                <p className="text-[11px] text-white/50 mt-0.5 leading-snug truncate">
                                  {item.hint || (item.scope ? SCOPE_LABEL[item.scope] : 'Special tier privilege')}
                                </p>
                              </div>

                              <span className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                <Lock className="w-3.5 h-3.5 text-white/50" />
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Guide Note */}
          <p className="px-6 pt-4 text-[11px] text-white/40 leading-relaxed text-center">
            {kind === 'wealth'
              ? '💎 Wealth level & badges advance with diamond spending on gifts and lucky room games. Higher badges unlock grand 3D luxury mounts, global broadcast banners, and mythic chat bubbles.'
              : '📡 Livestream level & badges advance with broadcast watch time and viewer gift support. Higher badges unlock audio studio effects, priority explore banners, and platform creator contracts.'}
          </p>
        </div>
      )}

      {/* 5. BADGE PREVIEW & LIVE CHAT SHOWCASE MODAL */}
      {selectedBadge && (
        <Modal
          isOpen={!!selectedBadge}
          onClose={() => setSelectedBadge(null)}
          title={selectedBadge.title}
        >
          <div className="space-y-4">
            {/* Grand Crest Showcase Banner */}
            <div
              className="relative overflow-hidden rounded-2xl p-6 text-center shadow-lg border border-white/20"
              style={{
                background: `linear-gradient(135deg, ${selectedBadge.gradient}, #0F172A)`,
              }}
            >
              <div
                className="absolute inset-0 rounded-2xl blur-xl opacity-50 pointer-events-none"
                style={{ backgroundColor: selectedBadge.glowColor }}
              />

              <div className="relative z-10 flex flex-col items-center">
                <PremiumBadgeEmblem tier={selectedBadge} level={selectedBadge.minLevel} size="xl" animated />

                <div className="mt-3">
                  <h3 className="text-lg font-black text-white drop-shadow-sm">{selectedBadge.title}</h3>
                  <p className="text-xs text-white/80 mt-0.5 font-medium">{selectedBadge.subtitle}</p>

                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-black/40 text-white text-[10px] font-black border border-white/20">
                      Tier: Lv.{selectedBadge.minLevel} – {selectedBadge.maxLevel === 100 && selectedBadge.minLevel === 100 ? '100' : selectedBadge.maxLevel}
                    </span>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-white text-[10px] font-black uppercase tracking-wider"
                      style={{ backgroundColor: selectedBadge.accentColor + '88' }}
                    >
                      {selectedBadge.rarity}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Chat Room Preview Simulation */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-inner">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-sky-400" /> Live Chat Appearance Preview
              </p>

              <div className="flex items-start gap-2.5 bg-black/50 p-2.5 rounded-xl border border-white/10">
                <Avatar src={user?.avatar} nickname={user?.nickname || 'VIP Member'} size="sm" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="px-1.5 py-0.2 rounded-md font-black text-white text-[9px] flex items-center gap-0.5"
                      style={{ background: `linear-gradient(90deg, ${selectedBadge.accentColor}, #0F172A)` }}
                    >
                      Lv.{selectedBadge.minLevel}
                    </span>
                    <span className="font-bold text-xs text-white truncate">{user?.nickname || 'VIP User'}</span>
                    <span className="text-[10px] text-amber-300 font-semibold">★ Host</span>
                  </div>

                  <p className="text-xs text-slate-200 mt-1 font-medium leading-relaxed">
                    Hello everyone! Welcome to the stream 🌟
                  </p>
                </div>
              </div>
            </div>

            {/* Unlocked Benefits for this Badge Tier */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-ink flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Exclusive Tier Benefits
              </h4>

              <div className="space-y-1.5">
                {selectedBadge.benefits.map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-ink">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 text-[10px] font-bold">
                      ✓
                    </span>
                    <span className="font-medium">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Button */}
            <div className="pt-2">
              {currentLevel >= selectedBadge.minLevel ? (
                <Button
                  onClick={() => setSelectedBadge(null)}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold"
                >
                  ✓ Badge Unlocked & Active
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setSelectedBadge(null);
                    if (kind === 'wealth') {
                      navigate('/wallet');
                    } else {
                      navigate('/go-live');
                    }
                  }}
                  className="w-full bg-gradient-to-r from-role-primary to-indigo-600 text-white font-bold"
                >
                  {kind === 'wealth' ? 'Get Diamonds to Level Up' : 'Go Live to Level Up'}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 6. PRIVILEGE DETAILS MODAL */}
      {selectedPrivilege && (
        <Modal
          isOpen={!!selectedPrivilege}
          onClose={() => setSelectedPrivilege(null)}
          title={selectedPrivilege.title}
        >
          <div className="space-y-4 text-center">
            {selectedPrivilege.icon && (
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 mx-auto border border-slate-200 shadow-sm">
                <img src={selectedPrivilege.icon} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <div>
              <span
                className="inline-block px-2.5 py-0.5 rounded-full text-white text-xs font-black mb-2"
                style={{ backgroundColor: selectedPrivilege.pillColor || '#22C55E' }}
              >
                Required: Lv.{selectedPrivilege.level}
              </span>
              <h3 className="text-base font-bold text-ink">{selectedPrivilege.title}</h3>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                {selectedPrivilege.hint || (selectedPrivilege.scope ? SCOPE_LABEL[selectedPrivilege.scope] : 'Level tier benefit')}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-left text-xs text-ink-muted space-y-1">
              <p><strong className="text-ink">Visibility:</strong> {selectedPrivilege.scope ? SCOPE_LABEL[selectedPrivilege.scope] : 'All Live Rooms & Profile'}</p>
              <p><strong className="text-ink">Status:</strong> {state && selectedPrivilege.level <= state.current.level ? '✅ Unlocked & Active' : '🔒 Locked'}</p>
            </div>

            <Button
              onClick={() => setSelectedPrivilege(null)}
              className="w-full bg-role-primary text-white font-bold"
            >
              Got it
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
