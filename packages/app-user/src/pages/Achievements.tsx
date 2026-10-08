import { useEffect, useState } from 'react';
import {
  PiCaretRightBold as ChevronRight,
  PiMedalFill as Medal,
  PiShareNetworkFill as Share2,
  PiImageSquareFill as ImageIcon,
  PiCheckCircleFill as CheckCircle,
  PiSparkleFill as Sparkles,
  PiXBold as X,
  PiLockKeyFill as LockIcon,
} from 'react-icons/pi';
import { achievementApi, type AchievementGroup, type Poster } from '../api/progress.api';
import { usersApi } from '../api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { ScreenHeader, PillTabs, EmptyState, PendingApiNotice } from '../components/common';
import { Avatar } from '../components/user';
import { Loading } from '../components/ui';

/**
 * Achievement Poster — requirement #53.
 *
 * Showcases creative milestone, merit, and identity achievement posters.
 * Users can view their unlock progress, share posters, and set any unlocked poster
 * directly as their profile cover picture.
 */

type Category = 'milestones' | 'merits' | 'identity';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'milestones', label: 'Milestones' },
  { key: 'merits', label: 'Merits' },
  { key: 'identity', label: 'Identity' },
];

export const Achievements = () => {
  const { user, updateUser } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const [category, setCategory] = useState<Category>('milestones');
  const [obtained, setObtained] = useState(0);
  const [groups, setGroups] = useState<AchievementGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  // Selected poster modal state
  const [selectedPoster, setSelectedPoster] = useState<{
    poster: Poster;
    groupTitle: string;
  } | null>(null);
  const [updatingCover, setUpdatingCover] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    optional(achievementApi.get(category))
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res.data) {
          setObtained(res.data.obtainedCount ?? 0);
          setGroups(res.data.groups ?? []);
          setLive(true);
        } else {
          setGroups([]);
          setLive(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGroups([]);
          setLive(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category]);

  const sharePoster = async (shareUrl?: string, posterTitle?: string) => {
    const url = shareUrl || window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          url,
          title: posterTitle ? `${posterTitle} - Navo Live Achievement` : 'Check out my achievement on Navo Live!',
        });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Poster share link copied to clipboard! ✨', 'success');
      }
    } catch {
      /* dismissed */
    }
  };

  const handleSetCover = async (poster: Poster) => {
    if (!poster.image) {
      showToast('This poster has no image available', 'info');
      return;
    }

    try {
      setUpdatingCover(true);
      const res = await usersApi.updateProfile({ cover: poster.image });
      if (res.data?.success) {
        updateUser({ cover: poster.image });
        showToast(`"${poster.title}" set as your profile cover! 🎨`, 'success');
      } else {
        updateUser({ cover: poster.image });
        showToast('Profile cover updated successfully!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile cover', 'error');
    } finally {
      setUpdatingCover(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-16 text-white select-none">
      {/* Gold spotlight hero */}
      <div
        className="absolute inset-x-0 top-0 h-80 pointer-events-none"
        style={{
          background:
            'radial-gradient(70% 75% at 50% 0%, rgba(227,184,87,0.3) 0%, rgba(184,134,11,0.1) 45%, transparent 75%)',
        }}
      />

      <div className="relative">
        <ScreenHeader title="Achievement Poster" variant="media" />

        <div className="flex flex-col items-center px-4 pt-2 pb-5">
          <div className="relative">
            <Avatar src={user?.avatar} nickname={user?.nickname || '?'} size="xl" />
            <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-2xl animate-pulse">🌿</span>
            <span className="absolute -right-6 top-1/2 -translate-y-1/2 text-2xl scale-x-[-1] animate-pulse">🌿</span>
          </div>

          <p className="text-white font-bold mt-3 text-lg flex items-center gap-1.5">
            {user?.nickname}
            {user?.wealthLevel && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-500 to-yellow-400 text-black">
                Lv.{user.wealthLevel}
              </span>
            )}
          </p>

          <p className="text-xs text-white/70 mt-1">
            Unlocked <span className="text-[#E3B857] font-bold text-base">{obtained}</span> Creative Posters
          </p>

          <PillTabs
            tabs={CATEGORIES.map((c) => ({ key: c.key, label: c.label }))}
            active={category}
            onChange={setCategory}
            tone="light"
            className="mt-4"
          />
        </div>
      </div>

      {loading ? (
        <Loading className="pt-12" size="lg" />
      ) : groups.length === 0 ? (
        <div className="relative pt-6">
          <EmptyState
            icon={<Medal className="w-8 h-8 text-[#E3B857]" />}
            title={live ? 'No posters found' : 'Achievements not connected'}
            hint={live ? 'Unlock creative achievement posters as you level up and interact.' : undefined}
            className="[&_p:first-of-type]:text-white [&_p:last-of-type]:text-white/60 [&>div]:!bg-white/10"
          />
          {!live && <PendingApiNotice section="§4.6" what="Your achievement posters" />}
        </div>
      ) : (
        <div className="relative px-3 space-y-4">
          {groups.map((group) => (
            <section
              key={group.key}
              className="rounded-2xl bg-gradient-to-b from-[#1C1815] to-[#120F0D] border border-amber-500/20 p-4 shadow-lg backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E3B857] shadow-[0_0_8px_#E3B857]" />
                  <h2 className="text-white font-bold text-sm tracking-wide">
                    {group.title} <span className="text-[#E3B857]/80 text-xs font-semibold">({group.count})</span>
                  </h2>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </div>

              <div className="flex gap-3.5 overflow-x-auto no-scrollbar pb-1 pt-1">
                {group.posters.map((poster) => {
                  const isCurrentCover = Boolean(user?.cover && user.cover === poster.image);
                  const isUnlocked = Boolean(poster.unlockedAt);

                  return (
                    <div
                      key={poster.level + poster.title}
                      onClick={() => setSelectedPoster({ poster, groupTitle: group.title })}
                      className={`group relative w-[136px] h-[200px] rounded-2xl overflow-hidden shrink-0 cursor-pointer
                        transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]
                        ${
                          isUnlocked
                            ? 'border-2 border-[#E3B857] shadow-[0_4px_20px_rgba(227,184,87,0.25)]'
                            : 'border border-white/15 opacity-85 hover:opacity-100'
                        }
                        bg-gradient-to-b from-[#251E19] via-[#1A1412] to-[#0A0706]`}
                    >
                      {/* Poster Art */}
                      {poster.image ? (
                        <img
                          src={poster.image}
                          alt={poster.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-amber-950 to-black text-3xl">
                          ⭐
                        </div>
                      )}

                      {/* Glassy overlay gradients */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20 pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none">
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-black/70 backdrop-blur-md text-[#E3B857] border border-[#E3B857]/30">
                          Lv.{poster.level}
                        </span>

                        {isCurrentCover ? (
                          <span className="px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-emerald-500 text-white shadow-sm flex items-center gap-0.5">
                            <CheckCircle className="w-2.5 h-2.5" /> Cover
                          </span>
                        ) : isUnlocked ? (
                          <span className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center text-black text-[10px] font-black shadow-md">
                            ✓
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/50 text-[10px]">
                            <LockIcon className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      {/* Bottom Title & Action Bar */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2.5 pt-4">
                        <p className="text-[11px] text-white font-bold leading-tight line-clamp-1 group-hover:text-[#E3B857] transition-colors">
                          {poster.title}
                        </p>
                        <p className="text-[9px] text-white/60 mt-0.5 flex items-center gap-1">
                          {isUnlocked ? (
                            <span className="text-[#E3B857] flex items-center gap-0.5 font-medium">
                              <Sparkles className="w-2.5 h-2.5" /> Unlocked
                            </span>
                          ) : (
                            <span className="text-white/40">Tap to view</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Poster Showcase & Set Cover Modal ─────────────────────────────── */}
      {selectedPoster && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedPoster(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#201A15] via-[#17120F] to-[#0D0A08] border-2 border-[#E3B857]/60 shadow-[0_0_50px_rgba(227,184,87,0.3)] overflow-hidden p-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedPoster(null)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Poster Showcase Preview */}
            <div className="relative w-full aspect-[3/4] max-h-[320px] rounded-2xl overflow-hidden border border-[#E3B857]/40 shadow-inner bg-black">
              <img
                src={selectedPoster.poster.image}
                alt={selectedPoster.poster.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

              {/* Badges on Poster Preview */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md">
                  Lv.{selectedPoster.poster.level}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-white/90 border border-white/20">
                  {selectedPoster.groupTitle}
                </span>
              </div>

              {user?.cover === selectedPoster.poster.image && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white flex items-center gap-1 shadow-md">
                  <CheckCircle className="w-3 h-3" /> Active Cover
                </div>
              )}

              <div className="absolute inset-x-3 bottom-3 text-left">
                <h3 className="text-base font-black text-white tracking-wide drop-shadow-md">
                  {selectedPoster.poster.title}
                </h3>
                <p className="text-xs text-[#E3B857] mt-0.5 flex items-center gap-1">
                  {selectedPoster.poster.unlockedAt ? (
                    <>
                      <Sparkles className="w-3 h-3" /> Unlocked & Available
                    </>
                  ) : (
                    <span className="text-white/70 flex items-center gap-1">
                      <LockIcon className="w-3 h-3 text-amber-400" /> Platform Achievement Poster
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 space-y-2.5">
              {/* Set As Profile Cover Button */}
              <button
                onClick={() => handleSetCover(selectedPoster.poster)}
                disabled={updatingCover || user?.cover === selectedPoster.poster.image}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md
                  ${
                    user?.cover === selectedPoster.poster.image
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                      : 'bg-gradient-to-r from-[#E3B857] via-[#D4A338] to-[#C99728] hover:from-[#EFCA70] hover:to-[#DEAC3D] text-black active:scale-[0.98]'
                  }`}
              >
                {updatingCover ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Setting Cover...
                  </span>
                ) : user?.cover === selectedPoster.poster.image ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Currently Set as Profile Cover
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    Set as Profile Cover
                  </>
                )}
              </button>

              {/* Share Poster Button */}
              <button
                onClick={() =>
                  sharePoster(selectedPoster.poster.shareUrl, selectedPoster.poster.title)
                }
                className="w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 text-white flex items-center justify-center gap-2 transition-colors border border-white/10"
              >
                <Share2 className="w-4 h-4 text-[#E3B857]" />
                Share Poster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
