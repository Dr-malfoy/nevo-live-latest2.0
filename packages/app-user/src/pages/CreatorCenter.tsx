import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiSealCheckFill as BadgeCheck, PiCaretRightBold as ChevronRight, PiPlayFill as Play } from 'react-icons/pi';
import { streamerApi, type CreatorStats } from '../api/streamer.api';
import { optional } from '../api/pending';
import { useAuthStore } from '../stores';
import { ScreenHeader, SectionCard, StatCell, HelpButton, PendingApiNotice } from '../components/common';
import { Avatar } from '../components/user';
import { Loading } from '../components/ui';

/**
 * Video Creator Center — requirement #62.
 * `GET /api/creator/stats` is specified in BACKEND-GUIDE.md §4.8.
 */
export const CreatorCenter = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    optional(streamerApi.getCreatorStats())
      .then((res) => {
        if (!cancelled) setStats(res?.data ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const posted = stats?.progress.posted ?? 0;
  const target = stats?.progress.target ?? 5;
  const progress = target > 0 ? Math.min(1, posted / target) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E9FBE9] via-[#F3FFF3] to-surface-soft pb-8">
      <ScreenHeader title="Video Creator Center" right={<HelpButton />} />

      {loading ? (
        <Loading className="pt-16" size="lg" />
      ) : (
        <div className="px-3 space-y-3">
          {/* Level card (#62.2) */}
          <SectionCard className="border border-[#CFEFCF]">
            <div className="flex items-start gap-3">
              <Avatar src={user?.avatar} nickname={user?.nickname || '?'} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink truncate">{user?.nickname}</p>
                {(stats?.verified ?? user?.verification?.verified) && (
                  <span className="inline-flex items-center gap-1 mt-1 h-6 px-2 rounded-full bg-[#E6F2FF] text-role-official text-[11px] font-bold">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified Creator
                  </span>
                )}
              </div>
              <span className="w-14 h-14 rounded-2xl bg-[#8BC34A] text-white flex items-center justify-center text-xl font-bold shrink-0">
                V
              </span>
            </div>

            <div className="mt-4">
              <p className="text-[32px] leading-none font-bold text-ink">Lv.{stats?.level ?? 1}</p>
              <p className="text-sm text-ink-muted mt-1">{stats?.levelTitle ?? 'Rookie Creator'}</p>

              <div className="h-1 rounded-full bg-line overflow-hidden mt-3">
                <div
                  className="h-full rounded-full bg-[#8BC34A]"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-ink-muted mt-2">
                Post ({posted}/{target}) high-quality videos to unlock the next level.
              </p>
            </div>

            <button
              onClick={() => navigate('/moments/new')}
              className="w-full h-11 mt-4 rounded-full bg-[#22C55E] text-white font-bold active:opacity-90"
            >
              Post Now
            </button>
          </SectionCard>

          <SectionCard title="All Videos">
            <div className="grid grid-cols-2 gap-1">
              <StatCell label="Total Videos" value={stats?.totals.videos ?? 0} />
              <StatCell label="Top Original" value={stats?.totals.topOriginal ?? 0} />
            </div>
          </SectionCard>

          <SectionCard
            title="Last 7 Days Data"
            right={
              <button className="text-sm text-ink-muted flex items-center gap-0.5">
                Details <ChevronRight className="w-4 h-4" />
              </button>
            }
          >
            <div className="grid grid-cols-3 gap-1">
              <StatCell label="Views" value={stats?.last7Days.views ?? 0} />
              <StatCell label="Interaction" value={stats?.last7Days.interactions ?? 0} />
              <StatCell label="New Followers" value={stats?.last7Days.newFollowers ?? 0} />
            </div>
          </SectionCard>

          {stats?.academy?.length ? (
            <SectionCard title="Creator Academy" flush>
              <div className="flex gap-3 px-4 pb-4 overflow-x-auto no-scrollbar">
                {stats.academy.map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="relative w-[200px] h-[120px] rounded-card overflow-hidden shrink-0 bg-surface-sunken"
                  >
                    {item.thumbnail && (
                      <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <p className="absolute inset-x-2 bottom-2 text-white text-[12px] font-semibold leading-snug line-clamp-2">
                      {item.title}
                    </p>
                    <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 text-ink ml-0.5" />
                    </span>
                  </a>
                ))}
              </div>
            </SectionCard>
          ) : null}

          {!stats && <PendingApiNotice section="§4.8" what="Your creator level and video stats" />}
        </div>
      )}
    </div>
  );
};
