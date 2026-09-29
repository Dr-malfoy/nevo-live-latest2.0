import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PiCaretRightBold as ChevronRight, PiLockFill as Lock, PiSparkleFill as Sparkles } from 'react-icons/pi';
import { levelApi, type LevelKind, type LevelPrivilege, type LevelState } from '../api/progress.api';
import { optional } from '../api/pending';
import { ScreenHeader, TabBar, HelpButton, EmptyState, PendingApiNotice } from '../components/common';
import { Loading } from '../components/ui';
import { compactNumber } from '../lib/time';

/**
 * Level privileges — requirements #33, #43, #55 and #61.
 *
 * Four screens in the documents are two ladders (Wealth and Livestream) at
 * different scroll positions, so this is one screen with a kind switch.
 * `GET /api/levels/:kind` is specified in BACKEND-GUIDE.md §4.6.
 *
 * The themes are deliberately dark — these are trophy screens in the
 * reference, and the white theme covers app chrome, not showcases.
 */

const THEMES: Record<LevelKind, { label: string; page: string; card: string; accent: string }> = {
  wealth: {
    label: 'Wealth Level',
    page: 'bg-gradient-to-b from-[#5D2A1A] via-[#3E1C12] to-[#1A0C08]',
    card: 'bg-[#3A2A25]/70',
    accent: 'bg-gradient-to-r from-[#FF8C42] to-[#FF4D4D]',
  },
  livestream: {
    label: 'Livestream Level',
    page: 'bg-gradient-to-b from-[#0A1A3A] via-[#0D2450] to-[#060E22]',
    card: 'bg-[#1E2A3A]/70',
    accent: 'bg-gradient-to-r from-[#60A5FA] to-[#2563EB]',
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
  all_rooms: 'Visible in all live rooms',
  ongoing_room: 'Visible only in the ongoing live room',
};

export const Levels = () => {
  const [params, setParams] = useSearchParams();
  const initial = (params.get('kind') as LevelKind) || 'wealth';

  const [kind, setKind] = useState<LevelKind>(initial);
  const [state, setState] = useState<LevelState | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  const theme = THEMES[kind];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    optional(levelApi.get(kind))
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res.data?.current) {
          setState(res.data);
          setLive(true);
        } else {
          setState(null);
          setLive(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState(null);
          setLive(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [kind]);

  const select = (next: LevelKind) => {
    setKind(next);
    setParams({ kind: next }, { replace: true });
  };

  return (
    <div className={`min-h-screen ${theme.page} pb-10`}>
      <ScreenHeader title="" variant="media" right={<HelpButton light />}>
        <div className="px-4">
          <TabBar
            tabs={[
              { key: 'wealth', label: 'Wealth Level' },
              { key: 'livestream', label: 'Livestream Level' },
            ]}
            active={kind}
            onChange={(k) => select(k as LevelKind)}
            tone="light"
          />
        </div>
      </ScreenHeader>

      {loading ? (
        <Loading className="pt-20" size="lg" />
      ) : !state ? (
        <div className="pt-6">
          <EmptyState
            icon={<Sparkles className="w-6 h-6" />}
            title="Levels not connected"
            className="[&_p:first-of-type]:text-white [&_p:last-of-type]:text-white/60"
          />
          {!live && <PendingApiNotice section="§4.6" what="Level progress and privileges" />}
        </div>
      ) : (
        <>
          {/* Current level card */}
          <div className={`mx-3 mt-2 rounded-sheet p-5 backdrop-blur border border-white/10 ${theme.card}`}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[36px] leading-none font-bold text-white">Lv.{state.current.level}</p>

                <span className="inline-flex items-center mt-3 h-6 px-2.5 rounded-full bg-white/15 text-white text-xs font-semibold tabular-nums">
                  {state.current.points.toLocaleString()}
                </span>

                <div className="h-1.5 rounded-full bg-white/15 overflow-hidden mt-3">
                  <div
                    className={`h-full rounded-full ${theme.accent}`}
                    style={{ width: `${Math.round((state.current.progress || 0) * 100)}%` }}
                  />
                </div>

                {state.current.remaining != null && (
                  <p className="text-[11px] text-white/60 mt-2">
                    Remaining progress to upgrade: {state.current.remaining.toLocaleString()}
                  </p>
                )}
              </div>

              {state.current.badgeIcon && (
                <img src={state.current.badgeIcon} alt="" className="w-20 h-20 object-contain shrink-0" />
              )}
            </div>
          </div>

          {/* Unlocked */}
          {state.unlocked.length > 0 && (
            <>
              <h2 className="px-4 pt-6 pb-2 text-sm font-semibold text-white/60">My Benefits</h2>
              <div className="flex gap-2.5 px-3 overflow-x-auto no-scrollbar pb-1">
                {state.unlocked.map((item, i) => (
                  <div
                    key={`${item.level}-${item.key}-${i}`}
                    className={`w-[152px] shrink-0 rounded-card p-3 border border-white/10 ${theme.card}`}
                  >
                    {item.icon ? (
                      <img src={item.icon} alt="" className="w-12 h-12 object-contain mb-2" />
                    ) : (
                      <span className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-2">
                        <Sparkles className="w-5 h-5 text-white/70" />
                      </span>
                    )}
                    <p className="text-sm font-semibold text-white leading-snug">{item.title}</p>
                    <button className="flex items-center gap-0.5 text-[11px] font-semibold text-[#FFD700] mt-1.5">
                      Check for Details <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Locked, grouped by unlock level */}
          {state.locked.length > 0 && (
            <>
              <h2 className="px-4 pt-6 pb-2 text-sm font-semibold text-white/60">Locked Benefits</h2>
              <div className="px-3 space-y-4">
                {groupByLevel(state.locked).map(({ level, items }) => (
                  <div key={level}>
                    <p className="flex items-center gap-1.5 text-white font-bold mb-2">
                      <Lock className="w-4 h-4" />
                      Lv.{level}
                    </p>
                    <div className="space-y-2">
                      {items.map((item, i) => (
                        <div
                          key={`${item.key}-${i}`}
                          className={`flex items-center gap-3 rounded-card p-3.5 border border-white/5 ${theme.card}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm">{item.title}</p>
                            <p className="text-[11px] text-white/50 mt-0.5">
                              {item.scope ? SCOPE_LABEL[item.scope] : item.hint}
                            </p>
                          </div>

                          {item.key === 'entry_effect' ? (
                            <span
                              className="h-7 px-2.5 rounded-full text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
                              style={{ background: item.pillColor || '#6A7CFF' }}
                            >
                              <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[9px]">
                                {level}
                              </span>
                              Po joined
                            </span>
                          ) : item.icon ? (
                            <img src={item.icon} alt="" className="w-10 h-10 object-contain shrink-0" />
                          ) : (
                            <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                              <Sparkles className="w-4 h-4 text-white/60" />
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className="px-6 pt-6 text-[11px] text-white/40 leading-relaxed text-center">
            {kind === 'wealth'
              ? 'Wealth level rises with your total gift spending. A new reward unlocks every 10 levels.'
              : 'Livestream level rises with your streaming hours and the gifts you receive.'}
          </p>
        </>
      )}
    </div>
  );
};
