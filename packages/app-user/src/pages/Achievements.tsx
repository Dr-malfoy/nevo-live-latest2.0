import { useEffect, useState } from 'react';
import { PiCaretRightBold as ChevronRight, PiMedalFill as Medal, PiShareNetworkFill as Share2 } from 'react-icons/pi';
import { achievementApi, type AchievementGroup } from '../api/progress.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { ScreenHeader, PillTabs, EmptyState, PendingApiNotice } from '../components/common';
import { Avatar } from '../components/user';
import { Loading } from '../components/ui';

/**
 * Achievement Poster — requirement #53.
 *
 * Kept on the dark gold theme from the reference: these are trophy cards, and
 * the white theme covers app chrome rather than showcases.
 */

type Category = 'milestones' | 'merits' | 'identity';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'milestones', label: 'Milestones' },
  { key: 'merits', label: 'Merits' },
  { key: 'identity', label: 'Identity' },
];

export const Achievements = () => {
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [category, setCategory] = useState<Category>('milestones');
  const [obtained, setObtained] = useState(0);
  const [groups, setGroups] = useState<AchievementGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

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

  const share = async (shareUrl?: string) => {
    if (!shareUrl) {
      showToast('This poster has no share image yet', 'info');
      return;
    }
    try {
      if (navigator.share) await navigator.share({ url: shareUrl });
      else await navigator.clipboard.writeText(shareUrl);
    } catch {
      /* dismissed */
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-10">
      {/* Gold spotlight hero */}
      <div
        className="absolute inset-x-0 top-0 h-72 pointer-events-none"
        style={{
          background:
            'radial-gradient(60% 70% at 50% 0%, rgba(201,168,106,0.35) 0%, transparent 70%)',
        }}
      />

      <div className="relative">
        <ScreenHeader title="Achievement Poster" variant="media" />

        <div className="flex flex-col items-center px-4 pt-2 pb-5">
          <div className="relative">
            <Avatar src={user?.avatar} nickname={user?.nickname || '?'} size="xl" />
            <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-2xl">🌿</span>
            <span className="absolute -right-6 top-1/2 -translate-y-1/2 text-2xl scale-x-[-1]">🌿</span>
          </div>

          <p className="text-white font-bold mt-3">{user?.nickname}</p>
          <p className="text-sm text-white/60 mt-1">
            Obtained <span className="text-[#E3B857] font-bold text-lg">{obtained}</span> Posters
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
        <Loading className="pt-10" size="lg" />
      ) : groups.length === 0 ? (
        <div className="relative">
          <EmptyState
            icon={<Medal className="w-6 h-6" />}
            title={live ? 'No posters yet' : 'Achievements not connected'}
            hint={live ? 'Posters unlock as you hit milestones.' : undefined}
            className="[&_p:first-of-type]:text-white [&_p:last-of-type]:text-white/60 [&>div]:!bg-white/10"
          />
          {!live && <PendingApiNotice section="§4.6" what="Your achievement posters" />}
        </div>
      ) : (
        <div className="relative px-3 space-y-3">
          {groups.map((group) => (
            <section key={group.key} className="rounded-sheet bg-[#2A2420] p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-bold">
                  {group.title} <span className="text-white/50">({group.count})</span>
                </h2>
                <ChevronRight className="w-5 h-5 text-white/40" />
              </div>

              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {group.posters.map((poster) => (
                  <button
                    key={poster.level}
                    onClick={() => share(poster.shareUrl)}
                    className="relative w-[120px] h-[180px] rounded-xl overflow-hidden shrink-0
                      bg-gradient-to-b from-[#241B3D] to-[#0E0A18] border border-[#C9A86A]/50"
                  >
                    {poster.image ? (
                      <img src={poster.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-3xl">⭐</span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1.5">
                      <p className="text-[10px] text-white font-semibold leading-tight truncate">
                        {poster.title}
                      </p>
                    </div>
                    <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                      <Share2 className="w-3 h-3 text-white" />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
