import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiArrowDownBold as ArrowDown, PiCaretRightBold as ChevronRight, PiLightbulbFill as Lightbulb, PiMapPinFill as MapPin, PiTagFill as Tag } from 'react-icons/pi';
import {
  streamerApi,
  type InspirationRow,
  type LastStreamReport,
  type StreamerRange,
  type StreamerStats,
} from '../api/streamer.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import {
  ScreenHeader,
  PillTabs,
  SectionCard,
  StatCell,
  PendingApiNotice,
  HelpButton,
} from '../components/common';
import { Loading } from '../components/ui';

/**
 * Streamer Center — requirements #40 and #42.
 *
 * #42 is #40 with the Inspiration card expanded, so it's one screen.
 * Endpoints are specified in BACKEND-GUIDE.md §4.8.
 */

const RANGES: { key: StreamerRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

const FALLBACK_GUIDELINES: InspirationRow[] = [
  {
    key: 'title',
    title: 'Live Stream Title',
    description: 'Fill in the title to highlight the key points of your stream',
  },
  {
    key: 'tags',
    title: 'Live Stream Tags',
    description: 'Choose the live tag to attract like-minded viewers',
  },
  {
    key: 'location',
    title: 'Location Recommendation',
    description: 'Enable location recommendation to reach nearby users',
  },
];

const ROW_TINT: Record<string, string> = {
  title: 'bg-[#FFE0F0] text-[#8B5CF6]',
  tags: 'bg-[#E8F4FF] text-role-agent',
  location: 'bg-[#FFF3E0] text-[#F97316]',
};

const ROW_ICON: Record<string, typeof Lightbulb> = {
  title: Lightbulb,
  tags: Tag,
  location: MapPin,
};

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/** Red down-arrow next to a metric that dropped since the previous stream. */
const Trend = ({ direction }: { direction?: 'up' | 'down' }) =>
  direction === 'down' ? (
    <ArrowDown className="w-3.5 h-3.5 text-status-live inline ml-1" />
  ) : null;

export const StreamerCenter = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [range, setRange] = useState<StreamerRange>('today');
  const [inspirationTab, setInspirationTab] = useState<'guidelines' | 'tools'>('guidelines');
  const [stats, setStats] = useState<StreamerStats | null>(null);
  const [report, setReport] = useState<LastStreamReport | null>(null);
  const [inspiration, setInspiration] = useState<{ guidelines: InspirationRow[]; tools: InspirationRow[] } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      optional(streamerApi.getStats(range)).catch(() => null),
      optional(streamerApi.getLastReport()).catch(() => null),
      optional(streamerApi.getInspiration()).catch(() => null),
    ])
      .then(([s, r, i]) => {
        if (cancelled) return;
        setStats(s?.data ?? null);
        setReport(r?.data ?? null);
        setInspiration(i?.data ?? null);
        setLive(!!s?.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  const rows =
    inspirationTab === 'guidelines'
      ? inspiration?.guidelines ?? FALLBACK_GUIDELINES
      : inspiration?.tools ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F3EEFF] via-[#FDF0F6] to-surface-soft pb-24">
      <ScreenHeader title="Streamer Center" right={<HelpButton />} />
      <p className="px-4 pt-2 pb-3 text-xs text-ink-muted">ID: {user?.uid}</p>

      {loading ? (
        <Loading className="pt-16" size="lg" />
      ) : (
        <div className="px-3 space-y-3">
          {/* Live stream data (#40.2) */}
          <SectionCard
            title="Live Stream Data"
            right={
              <button className="text-sm text-ink-muted flex items-center gap-0.5">
                More Data <ChevronRight className="w-4 h-4" />
              </button>
            }
          >
            <PillTabs
              tabs={RANGES.map((r) => ({ key: r.key, label: r.label }))}
              active={range}
              onChange={setRange}
              className="mb-3"
            />

            <div className="grid grid-cols-2 gap-1">
              <StatCell
                label="Hours of Live Streaming"
                value={formatDuration(stats?.liveDurationSec ?? 0)}
              />
              <StatCell label="Points Earned" value={(stats?.pointsEarned ?? 0).toLocaleString()} />
              <StatCell label="New Followers" value={stats?.newFollowers ?? 0} />
              <StatCell label="Average Concurrent Users" value={stats?.avgConcurrentUsers ?? 0} />
            </div>
          </SectionCard>

          {/* Last stream report (#40.3) */}
          <SectionCard
            title="Last Stream Report"
            subtitle={
              report?.startedAt
                ? `${new Date(report.startedAt).toLocaleString()} Started`
                : 'No stream yet'
            }
          >
            {report ? (
              <>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-sunken">
                  <div className="w-[76px] h-[76px] rounded-xl bg-white overflow-hidden shrink-0">
                    {report.cover && (
                      <img src={report.cover} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-ink-soft leading-snug">
                      {report.aiScoreStatus === 'in_progress'
                        ? 'AI scoring is in progress, no need to wait — start streaming now!'
                        : 'Your last stream has been scored.'}
                    </p>
                    <button
                      onClick={() => showToast('Pick a new cover from your next Go Live setup', 'info')}
                      className="mt-2 h-8 px-3.5 rounded-full bg-accent-50 text-accent-600 text-xs font-bold"
                    >
                      Change Cover
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1 mt-3">
                  <StatCell
                    label="Hours of Live Streaming"
                    value={
                      <>
                        {formatDuration(report.liveDurationSec)}
                        <Trend direction={report.trend?.liveDuration} />
                      </>
                    }
                  />
                  <StatCell label="Points Earned" value={report.pointsEarned.toLocaleString()} />
                  <StatCell label="New Followers" value={report.newFollowers} />
                  <StatCell
                    label="Viewers"
                    value={
                      <>
                        {report.viewers}
                        <Trend direction={report.trend?.viewers} />
                      </>
                    }
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-muted">
                Your last stream summary appears here once you've gone live.
              </p>
            )}
          </SectionCard>

          {/* Inspiration (#42.3) */}
          <SectionCard title="Live Stream Inspiration" flush>
            <div className="px-4 pb-3">
              <PillTabs
                tabs={[
                  { key: 'guidelines', label: 'Going Live Guidelines' },
                  { key: 'tools', label: 'Interactivity Tools' },
                ]}
                active={inspirationTab}
                onChange={(k) => setInspirationTab(k as 'guidelines' | 'tools')}
              />
            </div>

            {rows.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-ink-muted">
                Interactivity tools appear here once they're configured.
              </p>
            ) : (
              <div className="divide-y divide-line">
                {rows.map((row) => {
                  const Icon = ROW_ICON[row.key] ?? Lightbulb;
                  return (
                    <button
                      key={row.key}
                      onClick={() => navigate('/go-live')}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-surface-sunken"
                    >
                      <span
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          ROW_TINT[row.key] ?? 'bg-surface-sunken text-ink-muted'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink text-sm">{row.title}</p>
                        <p className="text-xs text-ink-muted leading-snug mt-0.5">{row.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-ink-ghost shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {!live && <PendingApiNotice section="§4.8" what="Your live stream statistics" />}
        </div>
      )}

      {/* Fixed CTA (#40.5) */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-line safe-bottom z-30 px-4 py-3">
        <button onClick={() => navigate('/go-live')} className="w-full h-12 rounded-full bg-accent-500 text-white font-bold">
          Start Streaming
        </button>
      </div>
    </div>
  );
};
