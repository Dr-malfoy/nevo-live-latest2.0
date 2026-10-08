import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiCalendarFill as CalendarClock,
  PiMegaphoneFill as Megaphone,
  PiGiftFill as Gift,
  PiBroadcastFill as Broadcast,
  PiPlayCircleFill as PlayCircle,
  PiHeartFill as Heart,
  PiChatTeardropTextFill as ChatIcon,
  PiCoinsFill as Coins,
  PiCheckCircleFill as CheckCircle2,
  PiSparkleFill as Sparkles,
  PiTrophyFill as Trophy,
  PiXBold as X,
  PiCaretRightBold as ChevronRight,
  PiQuestionBold as Question,
  PiClockFill as Clock,
  PiFlameFill as Flame,
  PiSwordFill as Sword,
  PiGameControllerFill as Gamepad,
  PiCameraFill as Camera,
  PiMicrophoneFill as Microphone,
} from 'react-icons/pi';
import {
  gamesApi,
  type ActivityItem,
  type ActivityTask,
  type ActivityRewardRecord,
} from '../api/economy.api';
import { optional } from '../api/pending';
import { ScreenHeader, TabBar, EmptyState } from '../components/common';
import { Loading } from '../components/ui';
import { compactNumber } from '../lib/time';
import { useAuthStore, useUIStore } from '../stores';

type Tab = 'ongoing' | 'closed' | 'rewards';
type CategoryFilter = 'all' | 'live' | 'pk' | 'party' | 'social' | 'games';
type DetailTab = 'tasks' | 'prizes' | 'rules';

const formatWindow = (startAt: string, endAt: string): string => {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${fmt(startAt)} - ${fmt(endAt)}`;
};

const getTaskIcon = (metric: string, key: string) => {
  if (metric.includes('watch') || key.includes('watch')) return <PlayCircle className="w-5 h-5 text-indigo-500" />;
  if (metric.includes('stream') || key.includes('stream') || key.includes('live')) return <Broadcast className="w-5 h-5 text-rose-500" />;
  if (metric.includes('pk')) return <Sword className="w-5 h-5 text-red-500" />;
  if (metric.includes('like') || key.includes('like')) return <Heart className="w-5 h-5 text-pink-500" />;
  if (metric.includes('gift') || key.includes('gift')) return <Gift className="w-5 h-5 text-amber-500" />;
  if (metric.includes('chat') || key.includes('comment')) return <ChatIcon className="w-5 h-5 text-sky-500" />;
  if (metric.includes('party')) return <Microphone className="w-5 h-5 text-purple-500" />;
  if (metric.includes('moment') || key.includes('moment')) return <Camera className="w-5 h-5 text-emerald-500" />;
  if (metric.includes('game') || key.includes('game')) return <Gamepad className="w-5 h-5 text-orange-500" />;
  return <Flame className="w-5 h-5 text-orange-500" />;
};

const CATEGORIES: { key: CategoryFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All Activities', icon: '🌟' },
  { key: 'live', label: 'Daily Live', icon: '📺' },
  { key: 'pk', label: 'Daily PK', icon: '⚔️' },
  { key: 'party', label: 'Voice Party', icon: '🎙️' },
  { key: 'social', label: 'Social & Fan', icon: '📸' },
  { key: 'games', label: 'Arcade Games', icon: '🎮' },
];

const DEFAULT_ACTIVITIES: ActivityItem[] = [
  {
    _id: 'act_1',
    key: 'live_watch_carnival',
    title: 'Daily Live Watch & Stream Carnival',
    tagline: 'Fixed daily live watch milestones to earn free coins!',
    description: 'Watch your favorite streamers or broadcast live every day! Complete viewing milestones, interact in real time, and collect thousands of free coins daily.',
    banner: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80',
    badge: 'DAILY LIVE',
    prizePool: 1000000,
    currency: 'coins',
    featured: true,
    status: 'ongoing',
    startAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    totalTasksCount: 8,
    completedTasksCount: 0,
    claimableCoins: 0,
    rules: [
      'Watch public live streams to accumulate watch minutes in real time.',
      'Complete viewing milestones to unlock and claim instant Coin rewards.',
      'Streamers earn bonus coins by going live and hosting audiences.',
      'Claimed coins are instantly deposited directly into your wallet balance.',
      'All daily activity milestones reset every midnight (Bangladesh Time).',
    ],
    tasks: [
      { key: 'act_live_watch_5m', label: 'Watch live stream for 5 minutes', note: 'Stay in any live stream room for 5 minutes', metric: 'live_watch_minutes', target: 5, unit: 'mins', reward: { currency: 'coins', amount: 300 }, goTo: '/', actionLabel: 'Watch Live', order: 1, progress: 0, state: 'todo' },
      { key: 'act_live_watch_15m', label: 'Watch live stream for 15 minutes', note: 'Enjoy and interact in live streams for 15 minutes', metric: 'live_watch_minutes', target: 15, unit: 'mins', reward: { currency: 'coins', amount: 800 }, goTo: '/', actionLabel: 'Watch Live', order: 2, progress: 0, state: 'todo' },
      { key: 'act_live_watch_30m', label: 'Watch live stream for 30 minutes', note: 'Support your favorite streamers for 30 minutes', metric: 'live_watch_minutes', target: 30, unit: 'mins', reward: { currency: 'coins', amount: 1500 }, goTo: '/', actionLabel: 'Watch Live', order: 3, progress: 0, state: 'todo' },
      { key: 'act_live_watch_60m', label: 'Watch live stream for 60 minutes', note: 'Super fan live viewer daily milestone', metric: 'live_watch_minutes', target: 60, unit: 'mins', reward: { currency: 'coins', amount: 3500 }, goTo: '/', actionLabel: 'Watch Live', order: 4, progress: 0, state: 'todo' },
      { key: 'act_live_stream_15m', label: 'Broadcast & Go Live for 15 minutes', note: 'Host your own live stream and engage viewers', metric: 'live_stream_minutes', target: 15, unit: 'mins', reward: { currency: 'coins', amount: 2500 }, goTo: '/go-live', actionLabel: 'Go Live', order: 5, progress: 0, state: 'todo' },
      { key: 'act_live_give_likes', label: 'Give 50 likes in live streams', note: 'Tap the screen to send likes to streamers', metric: 'likes', target: 50, unit: 'likes', reward: { currency: 'coins', amount: 400 }, goTo: '/', actionLabel: 'Send Likes', order: 6, progress: 0, state: 'todo' },
      { key: 'act_live_send_gift', label: 'Send 1 gift in any live stream', note: 'Surprise streamer with any gift', metric: 'gift_sent', target: 1, unit: 'gift', reward: { currency: 'coins', amount: 1200 }, goTo: '/', actionLabel: 'Send Gift', order: 7, progress: 0, state: 'todo' },
      { key: 'act_live_send_comments', label: 'Send 5 comments in live chat', note: 'Engage and chat with the streamer and room', metric: 'chat_sent', target: 5, unit: 'chats', reward: { currency: 'coins', amount: 500 }, goTo: '/', actionLabel: 'Join Chat', order: 8, progress: 0, state: 'todo' },
    ],
    prizes: [
      { rankFrom: 1, rankTo: 1, amount: 200000, title: 'Grand Live Master' },
      { rankFrom: 2, rankTo: 3, amount: 100000, title: 'Top Live Fan' },
      { rankFrom: 4, rankTo: 10, amount: 40000, title: 'Star Viewer' },
      { rankFrom: 11, rankTo: 50, amount: 10000, title: 'Active Viewer' },
    ],
  },
  {
    _id: 'act_2',
    key: 'daily_pk_battle_arena',
    title: 'Daily PK Battle & Stream Arena',
    tagline: 'Participate in PK battles, support streamers and earn coins!',
    description: 'The ultimate daily arena for PK battles. Send likes, boost your favorite hosts during battles, share the stream, and collect coin rewards daily.',
    banner: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop&q=80',
    badge: 'DAILY PK',
    prizePool: 500000,
    currency: 'coins',
    featured: false,
    status: 'ongoing',
    startAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    totalTasksCount: 3,
    completedTasksCount: 0,
    claimableCoins: 0,
    tasks: [
      { key: 'act_pk_likes_100', label: 'Give 100 likes in PK battles', note: 'Rapid tap to power up streamer during PK', metric: 'likes', target: 100, unit: 'likes', reward: { currency: 'coins', amount: 600 }, goTo: '/', actionLabel: 'Join Battle', order: 1, progress: 0, state: 'todo' },
      { key: 'act_pk_share_stream', label: 'Share PK battle stream', note: 'Invite friends to watch the battle together', metric: 'share_stream', target: 1, unit: 'share', reward: { currency: 'coins', amount: 500 }, goTo: '/invite', actionLabel: 'Share PK', order: 2, progress: 0, state: 'todo' },
      { key: 'act_pk_send_gift', label: 'Send 1 PK booster gift', note: 'Drop a gift to help your host win the round', metric: 'gift_sent', target: 1, unit: 'gift', reward: { currency: 'coins', amount: 1500 }, goTo: '/', actionLabel: 'Boost Host', order: 3, progress: 0, state: 'todo' },
    ],
    prizes: [
      { rankFrom: 1, rankTo: 1, amount: 100000, title: 'PK Champion' },
      { rankFrom: 2, rankTo: 5, amount: 40000, title: 'Arena Warrior' },
    ],
  },
  {
    _id: 'act_3',
    key: 'daily_voice_party',
    title: 'Daily Voice Party & Hangout Club',
    tagline: 'Hang out in voice rooms, chat on mic and collect coins!',
    description: 'Enter lively voice chat rooms, listen to music, take a mic seat, make new friends, and collect daily coins!',
    banner: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80',
    badge: 'DAILY PARTY',
    prizePool: 400000,
    currency: 'coins',
    featured: false,
    status: 'ongoing',
    startAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    totalTasksCount: 3,
    completedTasksCount: 0,
    claimableCoins: 0,
    tasks: [
      { key: 'act_party_join_room', label: 'Join any voice party room', note: 'Enter and hang out in an audio party room', metric: 'party_join', target: 1, unit: 'room', reward: { currency: 'coins', amount: 500 }, goTo: '/party', actionLabel: 'Join Party', order: 1, progress: 0, state: 'todo' },
      { key: 'act_party_chat_10', label: 'Send 10 messages in party room', note: 'Chat with other participants in the party', metric: 'chat_sent', target: 10, unit: 'chats', reward: { currency: 'coins', amount: 600 }, goTo: '/party', actionLabel: 'Party Chat', order: 2, progress: 0, state: 'todo' },
      { key: 'act_party_send_gift', label: 'Send 1 gift to any party speaker', note: 'Support voice speakers on mic', metric: 'gift_sent', target: 1, unit: 'gift', reward: { currency: 'coins', amount: 1500 }, goTo: '/party', actionLabel: 'Send Gift', order: 3, progress: 0, state: 'todo' },
    ],
    prizes: [
      { rankFrom: 1, rankTo: 1, amount: 80000, title: 'Party King' },
      { rankFrom: 2, rankTo: 5, amount: 30000, title: 'Party Star' },
    ],
  },
  {
    _id: 'act_4',
    key: 'daily_social_creator',
    title: 'Daily Social & Moments Creator',
    tagline: 'Post moments, light up fan clubs, connect and earn coins!',
    description: 'Share your daily life on Moments, connect with friends in chats, light up your favorite creator Fan Club, and collect daily coins!',
    banner: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80',
    badge: 'DAILY SOCIAL',
    prizePool: 300000,
    currency: 'coins',
    featured: false,
    status: 'ongoing',
    startAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    totalTasksCount: 3,
    completedTasksCount: 0,
    claimableCoins: 0,
    tasks: [
      { key: 'act_post_moment_1', label: 'Share 1 new Moment post', note: 'Post a photo or text update on Moments feed', metric: 'post_moment', target: 1, unit: 'post', reward: { currency: 'coins', amount: 600 }, goTo: '/moments/new', actionLabel: 'Post Moment', order: 1, progress: 0, state: 'todo' },
      { key: 'act_fanclub_lightup', label: 'Light up your Fan Club host', note: 'Support your favorite host in Fan Club', metric: 'fanclub_light', target: 1, unit: 'light', reward: { currency: 'coins', amount: 1000 }, goTo: '/fan-club', actionLabel: 'Fan Club', order: 2, progress: 0, state: 'todo' },
      { key: 'act_send_chat_5', label: 'Send 5 direct messages to friends', note: 'Chat with friends and creators', metric: 'chat_sent', target: 5, unit: 'messages', reward: { currency: 'coins', amount: 400 }, goTo: '/chats', actionLabel: 'Open Chats', order: 3, progress: 0, state: 'todo' },
    ],
    prizes: [
      { rankFrom: 1, rankTo: 1, amount: 60000, title: 'Top Social Star' },
      { rankFrom: 2, rankTo: 5, amount: 20000, title: 'Moment Creator' },
    ],
  },
  {
    _id: 'act_5',
    key: 'daily_games_arcade',
    title: 'Daily Games & Lucky Arcade',
    tagline: 'Play daily games, spin the wheel and collect coins!',
    description: 'Test your luck with daily mini-games! Spin the Lucky Wheel, play Aviator, Roulette or Teen Patti to complete daily gaming milestones and collect coins!',
    banner: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=1200&auto=format&fit=crop&q=80',
    badge: 'DAILY GAMES',
    prizePool: 600000,
    currency: 'coins',
    featured: false,
    status: 'ongoing',
    startAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    totalTasksCount: 2,
    completedTasksCount: 0,
    claimableCoins: 0,
    tasks: [
      { key: 'act_play_1_game_round', label: 'Play 1 round of any mini game', note: 'Play Lucky Spin, Roulette, Teen Patti or Aviator', metric: 'game_rounds', target: 1, unit: 'round', reward: { currency: 'coins', amount: 800 }, goTo: '/game', actionLabel: 'Play Games', order: 1, progress: 0, state: 'todo' },
      { key: 'act_play_3_game_rounds', label: 'Play 3 rounds in Diamond games', note: 'Enjoy thrilling rounds in Aviator or Roulette', metric: 'game_rounds', target: 3, unit: 'rounds', reward: { currency: 'coins', amount: 1500 }, goTo: '/game', actionLabel: 'Play Games', order: 2, progress: 0, state: 'todo' },
    ],
    prizes: [
      { rankFrom: 1, rankTo: 1, amount: 120000, title: 'Arcade Master' },
      { rankFrom: 2, rankTo: 5, amount: 50000, title: 'Lucky Champion' },
    ],
  },
];

export const ActivityCenter = () => {
  const navigate = useNavigate();
  const { user, updateUser, fetchProfile } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const [tab, setTab] = useState<Tab>('ongoing');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [items, setItems] = useState<ActivityItem[]>(DEFAULT_ACTIVITIES);
  const [rewards, setRewards] = useState<ActivityRewardRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('tasks');
  const [claimingKey, setClaimingKey] = useState<string | null>(null);
  const [claimingAll, setClaimingAll] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const loadActivities = () => {
    let cancelled = false;

    if (tab === 'rewards') {
      setLoading(true);
      optional(gamesApi.getActivityRewards())
        .then((res) => {
          if (cancelled) return;
          if (res?.success && Array.isArray(res.data)) {
            setRewards(res.data);
          } else {
            setRewards([]);
          }
        })
        .catch(() => {
          if (!cancelled) setRewards([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => { cancelled = true; };
    }

    optional(gamesApi.getActivities(tab))
      .then((res) => {
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setItems(res.data);
        } else if (tab === 'ongoing') {
          setItems(DEFAULT_ACTIVITIES);
        } else {
          setItems([]);
        }
      })
      .catch(() => {
        if (!cancelled && tab === 'ongoing') {
          setItems(DEFAULT_ACTIVITIES);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    const cleanup = loadActivities();
    return () => cleanup?.();
  }, [tab]);

  // Open activity detail modal
  const openActivityDetail = async (act: ActivityItem) => {
    setSelectedActivity(act);
    setDetailTab('tasks');
    setDetailLoading(true);

    try {
      const res = await gamesApi.getActivity(act.key || act._id);
      if (res.data?.success && res.data.data) {
        setSelectedActivity(res.data.data);
      }
    } catch {
      // keep basic act
    } finally {
      setDetailLoading(false);
    }
  };

  // Collect coins for a single task
  const handleClaimTask = async (task: ActivityTask, actKey: string) => {
    if (!task || claimingKey) return;
    setClaimingKey(task.key);

    try {
      const res = await gamesApi.claimActivityTask(actKey, task.key);
      if (res.data?.success) {
        const rewardAmount = task.reward.amount;
        showToast(`🎉 Collected +${rewardAmount.toLocaleString()} Coins!`, 'success');

        if (user) {
          updateUser({ coins: (user.coins || 0) + rewardAmount });
        }
        fetchProfile();

        setSelectedActivity((prev) => {
          if (!prev || !prev.tasks) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.key === task.key ? { ...t, state: 'claimed' as const } : t
            ),
            userStats: {
              totalEarnedCoins: (prev.userStats?.totalEarnedCoins || 0) + rewardAmount,
              claimableCoins: Math.max(0, (prev.userStats?.claimableCoins || 0) - rewardAmount),
              completedCount: (prev.userStats?.completedCount || 0) + 1,
            },
          };
        });

        setItems((prev) =>
          prev.map((item) => {
            if (item.key === actKey || item._id === actKey) {
              return {
                ...item,
                completedTasksCount: (item.completedTasksCount || 0) + 1,
                claimableCoins: Math.max(0, (item.claimableCoins || 0) - rewardAmount),
              };
            }
            return item;
          })
        );
      } else {
        showToast(res.data?.error || 'Could not claim coins', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to claim coins', 'error');
    } finally {
      setClaimingKey(null);
    }
  };

  // One-tap Collect All Ready Coins
  const handleClaimAll = async () => {
    if (claimingAll) return;
    setClaimingAll(true);

    try {
      const res = await gamesApi.claimAllActivityTasks();
      if (res.data?.success) {
        const { totalCoinsClaimed, claimedCount, newCoinsBalance } = res.data.data;
        showToast(`🎉 Collected +${totalCoinsClaimed.toLocaleString()} Coins across ${claimedCount} activities!`, 'success');

        if (newCoinsBalance != null) {
          updateUser({ coins: newCoinsBalance });
        } else if (user) {
          updateUser({ coins: (user.coins || 0) + totalCoinsClaimed });
        }
        fetchProfile();
        loadActivities();
        if (selectedActivity) {
          openActivityDetail(selectedActivity);
        }
      } else {
        showToast(res.data?.error || 'No ready coins to claim', 'info');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to claim ready coins', 'error');
    } finally {
      setClaimingAll(false);
    }
  };

  // Filter activities by category
  const filteredItems = items.filter((item) => {
    if (category === 'all') return true;
    if (category === 'live') return item.key.includes('live') || item.badge?.includes('LIVE');
    if (category === 'pk') return item.key.includes('pk') || item.badge?.includes('PK');
    if (category === 'party') return item.key.includes('party') || item.badge?.includes('PARTY');
    if (category === 'social') return item.key.includes('social') || item.badge?.includes('SOCIAL');
    if (category === 'games') return item.key.includes('game') || item.badge?.includes('GAMES');
    return true;
  });

  const totalClaimableAcrossAll = items.reduce((acc, i) => acc + (i.claimableCoins || 0), 0);
  const featuredActivity = items.find((i) => i.featured || i.key === 'live_watch_carnival') || items[0];

  return (
    <div className="min-h-screen bg-[#F6F4FC] pb-16 text-ink">
      {/* Header */}
      <ScreenHeader
        title="Activity Center"
        right={
          <button
            onClick={() => setRulesOpen(true)}
            aria-label="Activity Rules"
            className="w-8 h-8 rounded-full bg-surface-sunken flex items-center justify-center text-ink-muted hover:text-ink transition-colors"
          >
            <Question className="w-5 h-5" />
          </button>
        }
      >
        <div className="px-4">
          <TabBar
            tabs={[
              { key: 'ongoing', label: 'Daily Activities' },
              { key: 'closed', label: 'Past Events' },
              { key: 'rewards', label: 'Activity Rewards' },
            ]}
            active={tab}
            onChange={(k) => setTab(k as Tab)}
          />
        </div>
      </ScreenHeader>

      <div className="max-w-md mx-auto px-3 pt-3 space-y-3">
        {/* User Balance & Daily Fixed Activities Overview Banner */}
        <div className="bg-gradient-to-br from-[#2D124D] via-[#4A154B] to-[#7B1FA2] rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute right-2 top-2 opacity-15 pointer-events-none">
            <Coins className="w-28 h-28 text-amber-300" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-bold text-amber-300 backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                Daily Fixed Activities
              </span>
              <span className="text-[10px] text-purple-200 bg-black/30 px-2 py-0.5 rounded-full">
                Resets Daily 00:00 BD
              </span>
            </div>

            <h2 className="text-lg font-black tracking-tight text-white leading-tight mt-1.5">
              Complete Daily Activities & Earn Coins
            </h2>
            <p className="text-xs text-purple-200 mt-0.5">
              Watch live streams, do daily activities & collect 25,000+ free coins every day!
            </p>
          </div>

          {/* User coin status & Claim All bar */}
          <div className="mt-3.5 pt-3 border-t border-white/15 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-200 block">Your Balance</span>
                <span className="text-sm font-extrabold text-amber-300 tabular-nums">
                  {(user?.coins || 0).toLocaleString()} 🪙
                </span>
              </div>
            </div>

            {totalClaimableAcrossAll > 0 ? (
              <button
                onClick={handleClaimAll}
                disabled={claimingAll}
                className="px-3.5 py-2 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-purple-950 text-xs font-black shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex items-center gap-1.5 animate-bounce disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-950" />
                <span>Claim All (+{totalClaimableAcrossAll.toLocaleString()} 🪙)</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (featuredActivity) openActivityDetail(featuredActivity);
                  else navigate('/');
                }}
                className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 text-xs font-extrabold shadow-sm active:scale-95 transition-transform flex items-center gap-1"
              >
                <span>Earn Coins</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Ongoing Category Filter Pills */}
        {tab === 'ongoing' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all active:scale-95 ${
                  category === cat.key
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white text-ink-muted border border-line hover:border-purple-300 hover:text-ink'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Content Tabs */}
        {loading ? (
          <Loading className="pt-16" size="lg" />
        ) : tab === 'rewards' ? (
          /* Activity Rewards Tab */
          rewards.length === 0 ? (
            <div className="pt-6">
              <EmptyState
                icon={<Megaphone className="w-8 h-8 text-purple-500" />}
                title="No activity rewards yet"
                hint="Complete any fixed daily activity to collect instant free coins!"
              />
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setTab('ongoing')}
                  className="px-5 py-2.5 rounded-full bg-purple-600 text-white font-bold text-xs shadow-md active:scale-95 transition-transform flex items-center gap-1.5"
                >
                  <Broadcast className="w-4 h-4" /> Start Daily Activities
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-ink-muted uppercase">Claimed Activity Coins</span>
                <span className="text-xs font-extrabold text-amber-600">
                  {rewards.reduce((acc, r) => acc + (r.rewardAmount || 0), 0).toLocaleString()} 🪙 Earned
                </span>
              </div>
              {rewards.map((r) => (
                <div
                  key={r._id}
                  className="bg-white rounded-xl p-3 border border-line shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center shrink-0">
                      <Coins className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-ink truncate">{r.taskLabel}</p>
                      <p className="text-[11px] text-ink-muted truncate">{r.activityTitle}</p>
                      <p className="text-[10px] text-ink-faint mt-0.5">
                        {new Date(r.claimedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs tabular-nums">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      +{r.rewardAmount.toLocaleString()} 🪙
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredItems.length === 0 ? (
          /* Empty events */
          <div className="pt-6">
            <EmptyState
              icon={<CalendarClock className="w-8 h-8 text-purple-500" />}
              title={tab === 'ongoing' ? 'No activities in this category' : 'No past events'}
              hint="Check back soon for new daily activities!"
            />
          </div>
        ) : (
          /* Ongoing Activities List */
          <div className="space-y-3.5">
            {/* Featured Hero Activity Card */}
            {tab === 'ongoing' && category === 'all' && featuredActivity && (
              <div
                onClick={() => openActivityDetail(featuredActivity)}
                className="cursor-pointer bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-800 rounded-2xl overflow-hidden shadow-md text-white border border-purple-500/20 active:scale-[0.99] transition-all relative group"
              >
                <div className="relative h-44 w-full overflow-hidden bg-black/40">
                  {featuredActivity.banner ? (
                    <img
                      src={featuredActivity.banner}
                      alt={featuredActivity.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                  {/* Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      DAILY LIVE
                    </span>
                    {featuredActivity.badge && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-purple-950 text-[10px] font-black uppercase tracking-wide shadow-sm">
                        {featuredActivity.badge}
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-300" />
                      Fixed Daily
                    </span>
                  </div>

                  {/* Card bottom info */}
                  <div className="absolute inset-x-3 bottom-3">
                    <h3 className="font-extrabold text-base text-white drop-shadow-md leading-tight">
                      {featuredActivity.title}
                    </h3>
                    <p className="text-[11px] text-purple-200 mt-0.5 line-clamp-1 drop-shadow-sm">
                      {featuredActivity.tagline || 'Watch live streams & do live tasks to collect free coins!'}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-xs border border-white/10">
                        <span className="text-xs">🪙</span>
                        <span className="text-xs font-black text-amber-300 tabular-nums">
                          {compactNumber(featuredActivity.prizePool)} Coins Pool
                        </span>
                      </div>

                      <span className="text-xs font-bold text-amber-300 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        Collect Coins <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar info footer */}
                <div className="p-3 bg-purple-950/90 flex items-center justify-between text-xs border-t border-purple-800/40">
                  <div className="flex items-center gap-2">
                    <Broadcast className="w-4 h-4 text-amber-400" />
                    <span className="text-purple-200 text-[11px]">
                      {featuredActivity.completedTasksCount || 0}/{featuredActivity.totalTasksCount || 8} Tasks Done
                    </span>
                  </div>
                  {(featuredActivity.claimableCoins || 0) > 0 ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-400 text-emerald-950 text-[11px] font-black animate-pulse flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" /> +{(featuredActivity.claimableCoins || 0).toLocaleString()} Ready to Claim!
                    </span>
                  ) : (
                    <span className="text-purple-300 text-[11px]">Tap to view tasks</span>
                  )}
                </div>
              </div>
            )}

            {/* Grid of All Fixed Daily Activities */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-ink-muted uppercase">
                  {tab === 'ongoing' ? 'Fixed Daily Activities' : 'Past Events'}
                </span>
                <span className="text-xs text-ink-faint">{filteredItems.length} Activities</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {filteredItems.map((item) => {
                  const isOngoing = item.status === 'ongoing';
                  const hasClaimable = (item.claimableCoins || 0) > 0;

                  return (
                    <button
                      key={item._id || item.key}
                      onClick={() => openActivityDetail(item)}
                      className="rounded-2xl overflow-hidden bg-white text-left flex flex-col border border-line shadow-xs hover:shadow-md transition-all active:scale-[0.98] group"
                    >
                      {/* Banner */}
                      <div className="relative h-28 shrink-0 bg-gradient-to-br from-indigo-900 to-purple-800 overflow-hidden">
                        {item.banner && (
                          <img
                            src={item.banner}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                        <span
                          className={`absolute top-2 right-2 h-4.5 px-2 rounded-full text-[9px] font-black flex items-center uppercase ${
                            isOngoing ? 'bg-amber-400 text-purple-950' : 'bg-black/60 text-white'
                          }`}
                        >
                          {item.badge || (isOngoing ? 'Daily' : 'Closed')}
                        </span>

                        {hasClaimable && (
                          <span className="absolute top-2 left-2 h-4.5 px-1.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center animate-bounce shadow-xs">
                            Claim!
                          </span>
                        )}

                        <div className="absolute inset-x-2.5 bottom-2">
                          <p className="text-white font-extrabold text-xs leading-snug drop-shadow line-clamp-1">
                            {item.title}
                          </p>
                          <p className="text-amber-300 text-[11px] font-black tabular-nums mt-0.5">
                            🪙 {compactNumber(item.prizePool)} Coins
                          </p>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-2.5 flex-1 flex flex-col justify-between bg-white">
                        <p className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
                          {item.tagline || item.note || 'Complete daily objectives to collect free coins.'}
                        </p>

                        <div className="mt-2 pt-2 border-t border-line/60 flex items-center justify-between text-[10px]">
                          <span className="font-bold text-purple-700">
                            {item.completedTasksCount || 0}/{item.totalTasksCount || item.tasks?.length || 0} Done
                          </span>
                          <span className="text-purple-600 font-bold flex items-center gap-0.5">
                            Collect <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Activity Details & Coin Collector Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-2xs animate-fade-in"
            onClick={() => setSelectedActivity(null)}
          />

          <div className="relative w-full max-w-md bg-white rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl animate-slide-up overflow-hidden">
            {/* Modal Header Banner */}
            <div className="relative h-40 bg-gradient-to-br from-[#240A40] via-[#4A154B] to-[#6A1B9A] text-white shrink-0 overflow-hidden">
              {selectedActivity.banner && (
                <img
                  src={selectedActivity.banner}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-40"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              {/* Close button */}
              <button
                onClick={() => setSelectedActivity(null)}
                aria-label="Close"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute inset-x-4 bottom-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider">
                    {selectedActivity.badge || 'FIXED DAILY'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-black/40 text-purple-200 text-[9px] font-bold">
                    Resets at 00:00 BD
                  </span>
                </div>
                <h3 className="text-lg font-black text-white leading-tight drop-shadow">
                  {selectedActivity.title}
                </h3>
                <p className="text-xs text-purple-200 mt-0.5 line-clamp-1">
                  {selectedActivity.tagline || selectedActivity.description}
                </p>

                <div className="mt-2 flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 font-bold text-amber-300">
                    <Coins className="w-4 h-4" />
                    <span>Pool: {selectedActivity.prizePool.toLocaleString()} 🪙</span>
                  </div>
                  <div className="text-purple-200 text-[11px]">
                    {formatWindow(selectedActivity.startAt, selectedActivity.endAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-line bg-surface-soft px-3 shrink-0">
              <button
                onClick={() => setDetailTab('tasks')}
                className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors ${
                  detailTab === 'tasks'
                    ? 'border-purple-600 text-purple-700 bg-white'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                Daily Tasks & Coins
              </button>
              <button
                onClick={() => setDetailTab('prizes')}
                className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors ${
                  detailTab === 'prizes'
                    ? 'border-purple-600 text-purple-700 bg-white'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                Prize Tiers
              </button>
              <button
                onClick={() => setDetailTab('rules')}
                className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors ${
                  detailTab === 'rules'
                    ? 'border-purple-600 text-purple-700 bg-white'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                Activity Rules
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {detailLoading ? (
                <Loading className="py-12" size="md" />
              ) : detailTab === 'tasks' ? (
                /* Tasks Tab */
                !selectedActivity.tasks || selectedActivity.tasks.length === 0 ? (
                  <div className="py-8 text-center text-ink-muted text-xs">
                    No active tasks for this activity right now.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-amber-50 border border-amber-200/70 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-extrabold text-amber-900">
                          Complete daily tasks to claim coins
                        </p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Claimed coins are instantly added to your wallet balance.
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-amber-700 block">Earned Today</span>
                        <span className="text-xs font-black text-amber-600 tabular-nums">
                          +{(selectedActivity.userStats?.totalEarnedCoins || 0).toLocaleString()} 🪙
                        </span>
                      </div>
                    </div>

                    {selectedActivity.tasks.map((task) => {
                      const isClaimed = task.state === 'claimed';
                      const isReady = task.state === 'claimable' || task.progress >= task.target;
                      const progressPct = Math.min(100, Math.round((task.progress / task.target) * 100));
                      const isClaimingThis = claimingKey === task.key;

                      return (
                        <div
                          key={task.key}
                          className="bg-white rounded-2xl border border-line p-3.5 shadow-xs flex items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center shrink-0 mt-0.5">
                              {getTaskIcon(task.metric, task.key)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-bold text-ink leading-snug truncate">{task.label}</p>
                                <span className="text-[11px] font-extrabold text-purple-700 tabular-nums">
                                  ({task.progress}/{task.target} {task.unit || ''})
                                </span>
                              </div>

                              {task.note && (
                                <p className="text-[11px] text-ink-muted mt-0.5 truncate">{task.note}</p>
                              )}

                              {/* Progress bar */}
                              <div className="w-full bg-surface-sunken h-1.5 rounded-full mt-2 overflow-hidden max-w-xs">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isClaimed
                                      ? 'bg-emerald-500'
                                      : isReady
                                      ? 'bg-amber-500'
                                      : 'bg-purple-600'
                                  }`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>

                              <div className="mt-2">
                                <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-extrabold text-amber-800">
                                  <span>🪙</span>
                                  <span>+{task.reward.amount.toLocaleString()} Coins</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Task Action Button */}
                          <div className="shrink-0">
                            {isClaimed ? (
                              <span className="h-8 px-3 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                              </span>
                            ) : isReady ? (
                              <button
                                onClick={() => handleClaimTask(task, selectedActivity.key)}
                                disabled={isClaimingThis}
                                className="h-8.5 px-3.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white text-xs font-black flex items-center gap-1 shadow-sm shadow-amber-500/30 transition-all disabled:opacity-50 animate-pulse"
                              >
                                {isClaimingThis ? (
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
                                  setSelectedActivity(null);
                                  if (task.goTo) navigate(task.goTo);
                                  else navigate('/');
                                }}
                                className="h-8 px-3 rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                              >
                                <span>{task.actionLabel || 'Go'}</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : detailTab === 'prizes' ? (
                /* Prizes Tab */
                <div className="space-y-2">
                  <div className="p-3 bg-purple-50 border border-purple-200/60 rounded-xl text-xs text-purple-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      Leaderboard Coin Rewards
                    </p>
                    <p className="text-[11px] text-purple-700 mt-0.5">
                      Top active participants receive extra coin bonuses at daily reset.
                    </p>
                  </div>

                  {selectedActivity.prizes?.map((prize, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl border border-line p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center font-black text-xs text-amber-800">
                          #{prize.rankFrom === prize.rankTo ? prize.rankFrom : `${prize.rankFrom}-${prize.rankTo}`}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-ink">{prize.title || `Rank ${prize.rankFrom}`}</p>
                          <p className="text-[10px] text-ink-muted">Event Leaderboard Prize</p>
                        </div>
                      </div>
                      <span className="font-extrabold text-amber-600 text-xs tabular-nums flex items-center gap-1">
                        🪙 {prize.amount.toLocaleString()} Coins
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                /* Rules Tab */
                <div className="space-y-3 text-xs text-ink-muted leading-relaxed">
                  <h4 className="font-bold text-ink text-sm">Activity Participation Rules</h4>
                  <ul className="space-y-2 list-disc list-inside">
                    {selectedActivity.rules && selectedActivity.rules.length > 0 ? (
                      selectedActivity.rules.map((rule, idx) => <li key={idx}>{rule}</li>)
                    ) : (
                      <>
                        <li>Complete daily objectives to accumulate progress.</li>
                        <li>Milestones unlock coin rewards instantly.</li>
                        <li>Claimed coins are immediately credited to your account.</li>
                        <li>Tasks reset every midnight (Bangladesh Time).</li>
                      </>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rules Info Modal */}
      {rulesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRulesOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <h3 className="font-bold text-base text-ink flex items-center gap-1.5">
                <Coins className="w-5 h-5 text-amber-500" />
                Daily Fixed Activities
              </h3>
              <button onClick={() => setRulesOpen(false)} className="text-ink-muted p-1 hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-ink-muted space-y-2 leading-relaxed">
              <p>
                <strong className="text-ink">1. Fixed Daily Activities:</strong> Multiple daily activities are available every day (Live Watch, PK Battles, Voice Parties, Moments & Mini Games).
              </p>
              <p>
                <strong className="text-ink">2. Real-Time Tracking:</strong> Watch minutes, streaming time, likes, comments, and games are recorded in real time.
              </p>
              <p>
                <strong className="text-ink">3. Collect Coins:</strong> Tap <strong>Claim</strong> on any completed task, or tap <strong>Claim All</strong> at the top to collect all coins in one tap!
              </p>
              <p>
                <strong className="text-ink">4. Daily Reset:</strong> All daily task milestones reset every midnight (00:00 Bangladesh Time).
              </p>
            </div>

            <button
              onClick={() => setRulesOpen(false)}
              className="w-full py-2.5 bg-purple-600 text-white font-bold text-xs rounded-xl shadow-sm active:scale-95 transition-transform"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
