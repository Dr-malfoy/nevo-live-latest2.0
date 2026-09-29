import { useEffect, useState } from 'react';
import { PiCalendarFill as CalendarClock, PiMegaphoneFill as Megaphone } from 'react-icons/pi';
import { gamesApi, type ActivityItem } from '../api/economy.api';
import { optional } from '../api/pending';
import { ScreenHeader, TabBar, EmptyState, PendingApiNotice } from '../components/common';
import { Loading } from '../components/ui';
import { compactNumber } from '../lib/time';

/**
 * Activity Center — requirement #68.
 * `GET /api/activities` is specified in BACKEND-GUIDE.md §4.13.
 */

type Tab = 'ongoing' | 'closed' | 'rewards';

const formatWindow = (startAt: string, endAt: string): string => {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${fmt(startAt)} - ${fmt(endAt)}`;
};

export const ActivityCenter = () => {
  const [tab, setTab] = useState<Tab>('ongoing');
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (tab === 'rewards') {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    optional(gamesApi.getActivities(tab))
      .then((res) => {
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data)) {
          setItems(res.data);
          setLive(true);
        } else {
          setItems([]);
          setLive(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setLive(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <div className="min-h-screen bg-[#F5F0FF] pb-8">
      <ScreenHeader title="Activity Center">
        <div className="px-4">
          <TabBar
            tabs={[
              { key: 'ongoing', label: 'Ongoing' },
              { key: 'closed', label: 'Closed' },
              { key: 'rewards', label: 'Activity Rewards' },
            ]}
            active={tab}
            onChange={(k) => setTab(k as Tab)}
          />
        </div>
      </ScreenHeader>

      {loading ? (
        <Loading className="pt-16" size="lg" />
      ) : tab === 'rewards' ? (
        <>
          <EmptyState
            icon={<Megaphone className="w-6 h-6" />}
            title="No activity rewards yet"
            hint="Rewards you win from events appear here."
          />
          <PendingApiNotice section="§4.13" what="Activity rewards" />
        </>
      ) : items.length === 0 ? (
        <>
          <EmptyState
            icon={<CalendarClock className="w-6 h-6" />}
            title={
              live
                ? tab === 'ongoing'
                  ? 'No events running'
                  : 'No past events'
                : 'Activities not connected'
            }
            hint={live && tab === 'ongoing' ? 'New events are announced in the app.' : undefined}
          />
          {!live && <PendingApiNotice section="§4.13" what="Event listings" />}
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-3 pt-3">
          {items.map((item) => (
            /* flex-col, not block: a stretched grid cell centres a button's
               content vertically, which floats the banner off the card top. */
            <button
              key={item._id}
              className="rounded-card overflow-hidden bg-white text-left flex flex-col"
            >
              <div className="relative h-[220px] shrink-0 bg-gradient-to-b from-[#1B5E20] to-[#43A047]">
                {item.banner && (
                  <img src={item.banner} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/20" />

                <span
                  className={`absolute top-2 right-2 h-[20px] px-2 rounded-full text-[10px] font-bold flex items-center ${
                    item.status === 'ongoing' ? 'bg-accent-500 text-white' : 'bg-black/50 text-white'
                  }`}
                >
                  {item.status === 'ongoing' ? 'Ongoing' : 'Closed'}
                </span>

                <div className="absolute inset-x-3 bottom-3">
                  <p className="text-white font-bold text-sm leading-snug drop-shadow">{item.title}</p>
                  <p className="text-white/90 text-[13px] font-bold tabular-nums mt-1">
                    {item.currency === 'diamond' ? '💎' : '🪙'} {compactNumber(item.prizePool)}
                  </p>
                  <p className="text-white/70 text-[10px] mt-1">
                    {formatWindow(item.startAt, item.endAt)}
                  </p>
                </div>
              </div>

              <div className="p-3">
                <p className="font-semibold text-ink text-sm truncate">{item.title}</p>
                {item.note && <p className="text-[11px] text-ink-muted mt-0.5 line-clamp-2">{item.note}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
