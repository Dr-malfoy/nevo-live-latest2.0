import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiCaretRightBold as ChevronRight,
  PiCaretUpBold as ChevronUp,
  PiGiftFill as Gift,
  PiSparkleFill as Sparkles,
  PiCheckCircleFill as CheckCircle2,
  PiCoinsFill as Coins,
  PiXBold as X,
  PiArrowClockwiseBold as RefreshCw,
} from 'react-icons/pi';
import { taskApi, type TaskBoard, type TaskGroup, type TaskItem, type TaskReward } from '../api/progress.api';
import { referralApi, type ReferralTask } from '../api/social.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import {
  ScreenHeader,
  TabBar,
  PillTabs,
  CountdownPill,
  EmptyState,
  HelpButton,
  SectionCard,
} from '../components/common';
import { Loading } from '../components/ui';
import { CoinIcon, DiamondIcon } from '../components/ui/CurrencyIcon';

/**
 * Daily Task & Rewards Screen
 * Users complete daily activities (watch streams, send gifts, like, chat, play games)
 * and claim free Coins directly credited to their user wallet balance.
 */

const GROUPS: { key: TaskGroup; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'interactive', label: 'Interactive' },
  { key: 'fan_club', label: 'Fan Club' },
  { key: 'pk_mission', label: 'PK Mission' },
  { key: 'games', label: 'Games' },
];

const CURRENCY_LABELS: Record<string, { icon: string; name: string; color: string }> = {
  coin: { icon: '🪙', name: 'Coins', color: 'text-amber-500' },
  coins: { icon: '🪙', name: 'Coins', color: 'text-amber-500' },
  diamond: { icon: '💎', name: 'Diamonds', color: 'text-sky-500' },
  diamonds: { icon: '💎', name: 'Diamonds', color: 'text-sky-500' },
  ticket: { icon: '🎟️', name: 'Tickets', color: 'text-purple-500' },
  tickets: { icon: '🎟️', name: 'Tickets', color: 'text-purple-500' },
  pk_flag: { icon: '🚩', name: 'PK Flags', color: 'text-rose-500' },
};

const RewardPill = ({ reward }: { reward: TaskReward }) => {
  const meta = CURRENCY_LABELS[reward.currency] || { icon: '🎁', name: reward.currency, color: 'text-ink-soft' };
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-amber-50 border border-amber-200/60 text-xs font-bold text-amber-900 tabular-nums shadow-2xs">
      <span>{meta.icon}</span>
      <span>+{reward.amount.toLocaleString()}</span>
    </span>
  );
};

export const Rewards = () => {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);
  const { user, updateUser, fetchProfile } = useAuthStore();

  const [tab, setTab] = useState<'regular' | 'activity'>('regular');
  const [group, setGroup] = useState<TaskGroup>('daily');
  const [board, setBoard] = useState<TaskBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [claiming, setClaiming] = useState<string | null>(null);

  // How to Invite info sheet
  const [howToOpen, setHowToOpen] = useState(false);
  const [howTo, setHowTo] = useState<{ rules: { maxDailyLiveHoursCounted: number }; tasks: ReferralTask[] } | null>(
    null
  );

  const loadTasks = async () => {
    try {
      const res = await optional(taskApi.getBoard(tab === 'activity' ? 'activity' : group));
      if (res?.success && Array.isArray(res.data?.sections)) {
        setBoard(res.data);
      }
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadTasks();
  }, [tab, group]);

  const openHowTo = async () => {
    setHowToOpen(true);
    if (howTo) return;
    const res = await optional(referralApi.getTasks()).catch(() => null);
    if (res?.success && res.data) setHowTo(res.data);
  };

  const claim = async (task: TaskItem) => {
    setClaiming(task.key);
    try {
      const res = await taskApi.claim(task.key);
      if (res.data?.success) {
        const rewardAmount = task.reward.amount;
        showToast(`🎉 +${rewardAmount.toLocaleString()} Coins claimed!`, 'success');

        // Optimistically update user balance
        if (task.reward.currency === 'coins' || task.reward.currency === 'coin') {
          updateUser({ coins: (user?.coins || 0) + rewardAmount });
        }
        // Fetch fresh profile in background
        fetchProfile();

        // Update board state
        setBoard((prev) =>
          prev
            ? {
                ...prev,
                todayEarnings: {
                  ...prev.todayEarnings,
                  coins: prev.todayEarnings.coins + (task.reward.currency.includes('coin') ? rewardAmount : 0),
                  points: prev.todayEarnings.points + (task.reward.currency.includes('diamond') ? rewardAmount : 0),
                },
                sections: prev.sections.map((s) => ({
                  ...s,
                  tasks: s.tasks.map((t) => (t.key === task.key ? { ...t, state: 'claimed' } : t)),
                })),
              }
            : prev
        );
      } else {
        showToast(res.data?.error || 'Could not claim reward', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to claim reward', 'error');
    } finally {
      setClaiming(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft pb-24 text-ink">
      <ScreenHeader title="Daily Task" right={<HelpButton onClick={openHowTo} />}>
        <div className="px-4">
          <TabBar
            tabs={[
              { key: 'regular', label: 'Daily Missions' },
              { key: 'activity', label: 'Special Events' },
            ]}
            active={tab}
            onChange={(k) => setTab(k as 'regular' | 'activity')}
          />
        </div>
      </ScreenHeader>

      <div className="max-w-md mx-auto">
        {/* Today's earnings banner */}
        <SectionCard className="m-3 p-4 bg-gradient-to-br from-white via-amber-50/20 to-orange-50/30 border border-amber-200/50 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">Today's Task Earnings</p>
              <p className="text-[11px] text-ink-faint">Complete missions to earn free coins</p>
            </div>
            {board?.resetsAt && <CountdownPill to={board.resetsAt} />}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line">
            <div className="flex items-center gap-3 bg-white/80 p-2.5 rounded-xl border border-line">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <CoinIcon className="w-5 h-5 text-coin" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-ink-muted block font-medium">Earned Coins</span>
                <span className="text-base font-extrabold text-amber-600 tabular-nums">
                  {(board?.todayEarnings.coins ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/80 p-2.5 rounded-xl border border-line">
              <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0">
                <DiamondIcon className="w-5 h-5 text-sky-500" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-ink-muted block font-medium">Diamonds</span>
                <span className="text-base font-extrabold text-sky-600 tabular-nums">
                  {(board?.todayEarnings.points ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        {tab === 'regular' && (
          <PillTabs
            tabs={GROUPS.map((g) => ({ key: g.key, label: g.label }))}
            active={group}
            onChange={setGroup}
            className="px-4 pb-2"
          />
        )}

        {loading ? (
          <Loading className="pt-16" size="lg" />
        ) : !board || board.sections.length === 0 ? (
          <div className="px-4 py-8">
            <EmptyState
              icon={<Gift className="w-8 h-8 text-amber-500" />}
              title="No tasks right now"
              hint="New tasks appear after the daily midnight reset."
            />
          </div>
        ) : (
          <div className="px-3 pt-1 space-y-3">
            {board.sections.map((section) => {
              const isCollapsed = collapsed[section.key];
              return (
                <div key={section.key} className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
                  <div className="flex items-start gap-3 p-4">
                    <span className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink text-[15px] leading-snug">{section.title}</p>
                      {section.note && (
                        <p className="text-xs text-ink-muted mt-0.5">{section.note}</p>
                      )}
                      {section.totals && section.totals.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {section.totals.map((t, i) => (
                            <RewardPill key={i} reward={t} />
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setCollapsed((c) => ({ ...c, [section.key]: !c[section.key] }))
                      }
                      className="text-xs font-semibold text-ink-muted hover:text-ink shrink-0 flex items-center gap-0.5 p-1 rounded-lg"
                    >
                      {isCollapsed ? 'Show' : 'Hide'}
                      <ChevronUp className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="px-4 pb-4 space-y-3 divide-y divide-line">
                      {section.tasks.map((task) => {
                        const isDone = task.state === 'claimed';
                        const isReadyToClaim = task.state === 'claimable' || task.progress >= task.target;
                        const progressPercent = Math.min(100, Math.round((task.progress / task.target) * 100));

                        return (
                          <div key={task.key} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-semibold text-ink leading-snug truncate">{task.label}</p>
                                <span className="text-xs font-bold text-ink-faint tabular-nums">
                                  ({task.progress}/{task.target})
                                </span>
                              </div>

                              {task.note && (
                                <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed truncate">{task.note}</p>
                              )}

                              {/* Progress bar */}
                              <div className="w-full bg-surface-sunken h-1.5 rounded-full mt-2 overflow-hidden max-w-xs">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isDone
                                      ? 'bg-emerald-500'
                                      : isReadyToClaim
                                      ? 'bg-amber-500'
                                      : 'bg-accent-500'
                                  }`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>

                              <div className="mt-2">
                                <RewardPill reward={task.reward} />
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="shrink-0">
                              {isDone ? (
                                <span className="h-8 px-3.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                                </span>
                              ) : isReadyToClaim ? (
                                <button
                                  onClick={() => claim(task)}
                                  disabled={claiming === task.key}
                                  className="h-8.5 px-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-amber-500/30 transition-all disabled:opacity-50"
                                >
                                  {claiming === task.key ? (
                                    'Claiming...'
                                  ) : (
                                    <>
                                      <span>🪙</span>
                                      <span>Claim</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (task.goTo) navigate(task.goTo);
                                    else navigate('/');
                                  }}
                                  className="h-8 px-3.5 rounded-full bg-surface-sunken hover:bg-surface-sunken/80 border border-line-strong text-ink text-xs font-bold flex items-center gap-1 active:scale-[0.98] transition-all"
                                >
                                  GO <ChevronRight className="w-3.5 h-3.5 text-ink-muted" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* How to Invite bottom sheet */}
      {howToOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHowToOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-sheet max-h-[85vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-4 h-14 border-b border-line shrink-0">
              <h3 className="text-base font-bold text-ink">Daily Tasks & Rules</h3>
              <button onClick={() => setHowToOpen(false)} aria-label="Close" className="text-ink-muted p-1 hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div>
                <h4 className="font-bold text-amber-600 mb-1">How Daily Tasks Work</h4>
                <ul className="text-xs text-ink-muted space-y-1.5 list-disc list-inside leading-relaxed">
                  <li>Daily missions reset every midnight (Bangladesh Time).</li>
                  <li>Complete any task to unlock the instant "Claim" button.</li>
                  <li>Claimed coin rewards are added directly to your account Coin balance.</li>
                  <li>Use your earned coins for gifting, playing games, or exchanging with verified agents.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-amber-600 mb-1">Inviting Friends</h4>
                <ul className="text-xs text-ink-muted space-y-1.5 list-disc list-inside leading-relaxed">
                  <li>Your friend downloads the app and enters your User ID.</li>
                  <li>You earn bonus coins once your invitee completes verification and tasks.</li>
                </ul>
              </div>

              {howTo?.tasks?.length ? (
                <div className="rounded-xl overflow-hidden border border-line">
                  <div className="flex items-center h-9 px-3 bg-amber-50 text-xs font-bold text-amber-900">
                    <span className="flex-1">Task</span>
                    <span>Reward</span>
                  </div>
                  {howTo.tasks.map((task, i) => (
                    <div
                      key={task.key}
                      className={`flex items-center h-10 px-3 text-xs ${i % 2 ? 'bg-surface-soft' : 'bg-white'}`}
                    >
                      <span className="flex-1 text-ink-soft">{task.label}</span>
                      <span className="font-bold text-amber-600 tabular-nums flex items-center gap-1">
                        🪙 {task.reward.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
