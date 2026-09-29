import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiClockCounterClockwiseFill as History, PiRadioFill as Radio, PiTrashFill as Trash2 } from 'react-icons/pi';
import { historyApi, type WatchGroup } from '../api/social.api';
import { optional } from '../api/pending';
import { useUIStore } from '../stores';
import { ScreenHeader, TabBar, EmptyState, HelpButton, PendingApiNotice } from '../components/common';
import { Loading } from '../components/ui';
import { flagEmoji } from '../lib/countries';
import { compactNumber } from '../lib/time';

/**
 * Watch History — requirement #63.
 * `GET /api/history/watch` is specified in BACKEND-GUIDE.md §4.12.
 */
export const WatchHistory = () => {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  const [type, setType] = useState<'live' | 'video'>('live');
  const [groups, setGroups] = useState<WatchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    optional(historyApi.get(type))
      .then((res) => {
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data?.groups)) {
          setGroups(res.data.groups);
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
  }, [type]);

  const clear = async () => {
    const res = await optional(historyApi.clear()).catch(() => null);
    if (res === null) {
      showToast('Clearing history is not available yet', 'info');
      return;
    }
    setGroups([]);
    showToast('History cleared', 'success');
  };

  return (
    <div className="min-h-screen bg-white pb-8">
      <ScreenHeader
        title="Watch History"
        right={
          <div className="flex items-center gap-1">
            {groups.length > 0 && (
              <button
                onClick={clear}
                aria-label="Clear history"
                className="w-8 h-8 flex items-center justify-center text-ink-muted"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            )}
            <HelpButton />
          </div>
        }
      >
        <div className="px-4">
          <TabBar
            tabs={[
              { key: 'live', label: 'Live' },
              { key: 'video', label: 'Video' },
            ]}
            active={type}
            onChange={(k) => setType(k as 'live' | 'video')}
          />
        </div>
      </ScreenHeader>

      {loading ? (
        <Loading className="pt-20" size="lg" />
      ) : groups.length === 0 ? (
        <>
          <EmptyState
            icon={<History className="w-6 h-6" />}
            title={live ? 'Nothing watched yet' : 'Watch history not connected'}
            hint={live ? 'Rooms you visit show up here, grouped by day.' : undefined}
          />
          {!live && <PendingApiNotice section="§4.12" what="Your watch history" />}
        </>
      ) : (
        <div className="px-3 pt-3 space-y-5">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="text-lg font-bold text-ink px-1 mb-2">{group.label}</h2>

              <div className="grid grid-cols-2 gap-2">
                {group.items.map((item) => (
                  <button
                    key={item.targetId}
                    onClick={() =>
                      item.ended
                        ? navigate(`/user/${item.targetId}`)
                        : navigate(`/live/${item.targetId}`)
                    }
                    className="relative h-[200px] rounded-card overflow-hidden bg-surface-sunken text-left"
                  >
                    {item.cover ? (
                      <img src={item.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-ink-ghost">
                        <Radio className="w-7 h-7" />
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 to-transparent" />

                    <span
                      className={`absolute top-2 left-2 h-[20px] px-2 rounded text-[10px] font-bold flex items-center gap-1 ${
                        item.ended ? 'bg-black/50 text-white' : 'bg-white text-[#8B5CF6]'
                      }`}
                    >
                      {item.ended ? 'Stream ended' : <>▮▮ Live</>}
                    </span>

                    {!item.ended && item.viewerCount != null && (
                      <span className="absolute bottom-2 right-2 text-[11px] text-white font-semibold tabular-nums">
                        {compactNumber(item.viewerCount)}
                      </span>
                    )}

                    <p className="absolute inset-x-2 bottom-2 text-[12px] font-semibold text-white truncate pr-8">
                      {item.country && <span className="mr-1">{flagEmoji(item.country)}</span>}
                      {item.hostName || item.title}
                    </p>
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
