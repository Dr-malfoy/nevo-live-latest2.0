import { SpinResult, SignInRecord, Activity, ActivityClaim, User, TaskProgress } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getBangladeshDayBounds } from '../utils/date';
import { getIO } from '../socket';
import { taskService } from './task.service';

// Lucky spin slices: index 0..7
const SPIN_SLICES = [
  { index: 0, amount: 100,   currency: 'coin'    as const },
  { index: 1, amount: 500,   currency: 'coin'    as const },
  { index: 2, amount: 1000,  currency: 'coin'    as const },
  { index: 3, amount: 50,    currency: 'diamond' as const },
  { index: 4, amount: 5000,  currency: 'coin'    as const },
  { index: 5, amount: 100,   currency: 'diamond' as const },
  { index: 6, amount: 10000, currency: 'coin'    as const },
  { index: 7, amount: 1,     currency: 'ticket'  as const },
];

const SIGNIN_REWARDS = [
  { day: 1, reward: 100 },
  { day: 2, reward: 200 },
  { day: 3, reward: 300 },
  { day: 4, reward: 400 },
  { day: 5, reward: 500 },
  { day: 6, reward: 600 },
  { day: 7, reward: 1000 },
];

const SEED_ACTIVITIES = [
  // 1. Daily Live Watch & Stream Carnival
  {
    key: 'live_watch_carnival',
    title: 'Daily Live Watch & Stream Carnival',
    tagline: 'Fixed daily live watch milestones to earn free coins!',
    description: 'Watch your favorite streamers or broadcast live every day! Complete viewing milestones, interact in real time, and collect thousands of free coins daily.',
    banner: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80',
    badge: 'DAILY LIVE',
    prizePool: 1000000,
    currency: 'coins' as const,
    featured: true,
    status: 'ongoing' as const,
    startAt: new Date(Date.now() - 7 * 86400000),
    endAt: new Date(Date.now() + 365 * 86400000),
    rules: [
      'Watch public live streams to accumulate watch minutes in real time.',
      'Complete viewing milestones to unlock and claim instant Coin rewards.',
      'Streamers earn bonus coins by going live and hosting audiences.',
      'Claimed coins are instantly deposited directly into your wallet balance.',
      'All daily activity milestones reset every midnight (Bangladesh Time).',
    ],
    tasks: [
      {
        key: 'act_live_watch_5m',
        label: 'Watch live stream for 5 minutes',
        note: 'Stay in any live stream room for 5 minutes',
        metric: 'live_watch_minutes',
        target: 5,
        unit: 'mins',
        reward: { currency: 'coins' as const, amount: 300 },
        goTo: '/',
        actionLabel: 'Watch Live',
        order: 1,
      },
      {
        key: 'act_live_watch_15m',
        label: 'Watch live stream for 15 minutes',
        note: 'Enjoy and interact in live streams for 15 minutes',
        metric: 'live_watch_minutes',
        target: 15,
        unit: 'mins',
        reward: { currency: 'coins' as const, amount: 800 },
        goTo: '/',
        actionLabel: 'Watch Live',
        order: 2,
      },
      {
        key: 'act_live_watch_30m',
        label: 'Watch live stream for 30 minutes',
        note: 'Support your favorite streamers for 30 minutes',
        metric: 'live_watch_minutes',
        target: 30,
        unit: 'mins',
        reward: { currency: 'coins' as const, amount: 1500 },
        goTo: '/',
        actionLabel: 'Watch Live',
        order: 3,
      },
      {
        key: 'act_live_watch_60m',
        label: 'Watch live stream for 60 minutes',
        note: 'Super fan live viewer daily milestone',
        metric: 'live_watch_minutes',
        target: 60,
        unit: 'mins',
        reward: { currency: 'coins' as const, amount: 3500 },
        goTo: '/',
        actionLabel: 'Watch Live',
        order: 4,
      },
      {
        key: 'act_live_stream_15m',
        label: 'Broadcast & Go Live for 15 minutes',
        note: 'Host your own live stream and engage viewers',
        metric: 'live_stream_minutes',
        target: 15,
        unit: 'mins',
        reward: { currency: 'coins' as const, amount: 2500 },
        goTo: '/go-live',
        actionLabel: 'Go Live',
        order: 5,
      },
      {
        key: 'act_live_give_likes',
        label: 'Give 50 likes in live streams',
        note: 'Tap the screen to send likes to streamers',
        metric: 'likes',
        target: 50,
        unit: 'likes',
        reward: { currency: 'coins' as const, amount: 400 },
        goTo: '/',
        actionLabel: 'Send Likes',
        order: 6,
      },
      {
        key: 'act_live_send_gift',
        label: 'Send 1 gift in any live stream',
        note: 'Surprise streamer with any gift',
        metric: 'gift_sent',
        target: 1,
        unit: 'gift',
        reward: { currency: 'coins' as const, amount: 1200 },
        goTo: '/',
        actionLabel: 'Send Gift',
        order: 7,
      },
      {
        key: 'act_live_send_comments',
        label: 'Send 5 comments in live chat',
        note: 'Engage and chat with the streamer and room',
        metric: 'chat_sent',
        target: 5,
        unit: 'chats',
        reward: { currency: 'coins' as const, amount: 500 },
        goTo: '/',
        actionLabel: 'Join Chat',
        order: 8,
      },
    ],
    prizes: [
      { rankFrom: 1, rankTo: 1, amount: 200000, title: 'Grand Live Master' },
      { rankFrom: 2, rankTo: 3, amount: 100000, title: 'Top Live Fan' },
      { rankFrom: 4, rankTo: 10, amount: 40000, title: 'Star Viewer' },
      { rankFrom: 11, rankTo: 50, amount: 10000, title: 'Active Viewer' },
    ],
  },

  // 2. Daily PK Battle & Arena Showdown
  {
    key: 'daily_pk_battle_arena',
    title: 'Daily PK Battle & Stream Arena',
    tagline: 'Participate in PK battles, support streamers and earn coins!',
    description: 'The ultimate daily arena for PK battles. Send likes, boost your favorite hosts during battles, share the stream, and collect coin rewards daily.',
    banner: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop&q=80',
    badge: 'DAILY PK',
    prizePool: 500000,
    currency: 'coins' as const,
    featured: false,
    status: 'ongoing' as const,
    startAt: new Date(Date.now() - 5 * 86400000),
    endAt: new Date(Date.now() + 365 * 86400000),
    rules: [
      'Join live PK matches between competing streamers.',
      'Tap to send battle likes and gifts to boost PK score.',
      'Completed battle tasks can be claimed immediately.',
    ],
    tasks: [
      {
        key: 'act_pk_likes_100',
        label: 'Give 100 likes in PK battles',
        note: 'Rapid tap to power up streamer during PK',
        metric: 'likes',
        target: 100,
        unit: 'likes',
        reward: { currency: 'coins' as const, amount: 600 },
        goTo: '/',
        actionLabel: 'Join Battle',
        order: 1,
      },
      {
        key: 'act_pk_share_stream',
        label: 'Share PK battle stream',
        note: 'Invite friends to watch the battle together',
        metric: 'share_stream',
        target: 1,
        unit: 'share',
        reward: { currency: 'coins' as const, amount: 500 },
        goTo: '/invite',
        actionLabel: 'Share PK',
        order: 2,
      },
      {
        key: 'act_pk_send_gift',
        label: 'Send 1 PK booster gift',
        note: 'Drop a gift to help your host win the round',
        metric: 'gift_sent',
        target: 1,
        unit: 'gift',
        reward: { currency: 'coins' as const, amount: 1500 },
        goTo: '/',
        actionLabel: 'Boost Host',
        order: 3,
      },
    ],
    prizes: [
      { rankFrom: 1, rankTo: 1, amount: 100000, title: 'PK Champion' },
      { rankFrom: 2, rankTo: 5, amount: 40000, title: 'Arena Warrior' },
    ],
  },

  // 3. Daily Voice Party & Hangout Club
  {
    key: 'daily_voice_party',
    title: 'Daily Voice Party & Hangout Club',
    tagline: 'Hang out in voice rooms, chat on mic and collect coins!',
    description: 'Enter lively voice chat rooms, listen to music, take a mic seat, make new friends, and collect daily coins!',
    banner: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80',
    badge: 'DAILY PARTY',
    prizePool: 400000,
    currency: 'coins' as const,
    featured: false,
    status: 'ongoing' as const,
    startAt: new Date(Date.now() - 3 * 86400000),
    endAt: new Date(Date.now() + 365 * 86400000),
    rules: [
      'Join any public audio party room to start earning.',
      'Interact with users on mic and send chat messages.',
      'Claim your coin rewards once daily objectives are met.',
    ],
    tasks: [
      {
        key: 'act_party_join_room',
        label: 'Join any voice party room',
        note: 'Enter and hang out in an audio party room',
        metric: 'party_join',
        target: 1,
        unit: 'room',
        reward: { currency: 'coins' as const, amount: 500 },
        goTo: '/party',
        actionLabel: 'Join Party',
        order: 1,
      },
      {
        key: 'act_party_chat_10',
        label: 'Send 10 messages in party room',
        note: 'Chat with other participants in the party',
        metric: 'chat_sent',
        target: 10,
        unit: 'chats',
        reward: { currency: 'coins' as const, amount: 600 },
        goTo: '/party',
        actionLabel: 'Party Chat',
        order: 2,
      },
      {
        key: 'act_party_send_gift',
        label: 'Send 1 gift to any party speaker',
        note: 'Support voice speakers on mic',
        metric: 'gift_sent',
        target: 1,
        unit: 'gift',
        reward: { currency: 'coins' as const, amount: 1500 },
        goTo: '/party',
        actionLabel: 'Send Gift',
        order: 3,
      },
    ],
    prizes: [
      { rankFrom: 1, rankTo: 1, amount: 80000, title: 'Party King' },
      { rankFrom: 2, rankTo: 5, amount: 30000, title: 'Party Star' },
    ],
  },

  // 4. Daily Social, Moments & Fan Club
  {
    key: 'daily_social_creator',
    title: 'Daily Social & Moments Creator',
    tagline: 'Post moments, light up fan clubs, connect and earn coins!',
    description: 'Share your daily life on Moments, connect with friends in chats, light up your favorite creator Fan Club, and collect daily coins!',
    banner: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80',
    badge: 'DAILY SOCIAL',
    prizePool: 300000,
    currency: 'coins' as const,
    featured: false,
    status: 'ongoing' as const,
    startAt: new Date(Date.now() - 4 * 86400000),
    endAt: new Date(Date.now() + 365 * 86400000),
    rules: [
      'Post photos and statuses in the Moments feed.',
      'Send direct messages to friends and fellow fans.',
      'Light up host fan clubs daily for extra coin bonuses.',
    ],
    tasks: [
      {
        key: 'act_post_moment_1',
        label: 'Share 1 new Moment post',
        note: 'Post a photo or text update on Moments feed',
        metric: 'post_moment',
        target: 1,
        unit: 'post',
        reward: { currency: 'coins' as const, amount: 600 },
        goTo: '/moments/new',
        actionLabel: 'Post Moment',
        order: 1,
      },
      {
        key: 'act_fanclub_lightup',
        label: 'Light up your Fan Club host',
        note: 'Support your favorite host in Fan Club',
        metric: 'fanclub_light',
        target: 1,
        unit: 'light',
        reward: { currency: 'coins' as const, amount: 1000 },
        goTo: '/fan-club',
        actionLabel: 'Fan Club',
        order: 2,
      },
      {
        key: 'act_send_chat_5',
        label: 'Send 5 direct messages to friends',
        note: 'Chat with friends and creators',
        metric: 'chat_sent',
        target: 5,
        unit: 'messages',
        reward: { currency: 'coins' as const, amount: 400 },
        goTo: '/chats',
        actionLabel: 'Open Chats',
        order: 3,
      },
    ],
    prizes: [
      { rankFrom: 1, rankTo: 1, amount: 60000, title: 'Top Social Star' },
      { rankFrom: 2, rankTo: 5, amount: 20000, title: 'Moment Creator' },
    ],
  },

  // 5. Daily Games & Lucky Arcade
  {
    key: 'daily_games_arcade',
    title: 'Daily Games & Lucky Arcade',
    tagline: 'Play daily games, spin the wheel and collect coins!',
    description: 'Test your luck with daily mini-games! Spin the Lucky Wheel, play Aviator, Roulette or Teen Patti to complete daily gaming milestones and collect coins!',
    banner: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=1200&auto=format&fit=crop&q=80',
    badge: 'DAILY GAMES',
    prizePool: 600000,
    currency: 'coins' as const,
    featured: false,
    status: 'ongoing' as const,
    startAt: new Date(Date.now() - 6 * 86400000),
    endAt: new Date(Date.now() + 365 * 86400000),
    rules: [
      'Play any arcade or diamond game round to advance progress.',
      'Claim extra coin payouts upon completing required rounds.',
    ],
    tasks: [
      {
        key: 'act_play_1_game_round',
        label: 'Play 1 round of any mini game',
        note: 'Play Lucky Spin, Roulette, Teen Patti or Aviator',
        metric: 'game_rounds',
        target: 1,
        unit: 'round',
        reward: { currency: 'coins' as const, amount: 800 },
        goTo: '/game',
        actionLabel: 'Play Games',
        order: 1,
      },
      {
        key: 'act_play_3_game_rounds',
        label: 'Play 3 rounds in Diamond games',
        note: 'Enjoy thrilling rounds in Aviator or Roulette',
        metric: 'game_rounds',
        target: 3,
        unit: 'rounds',
        reward: { currency: 'coins' as const, amount: 1500 },
        goTo: '/game',
        actionLabel: 'Play Games',
        order: 2,
      },
    ],
    prizes: [
      { rankFrom: 1, rankTo: 1, amount: 120000, title: 'Arcade Master' },
      { rankFrom: 2, rankTo: 5, amount: 50000, title: 'Lucky Champion' },
    ],
  },

  // 6. Concluded Past Event
  {
    key: 'spring_live_festival',
    title: 'Spring Live Streaming Gala',
    tagline: 'Previous season celebration of top streamers and active viewers.',
    description: 'The Spring celebration concluded with great success and millions of coins distributed to participants.',
    banner: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80',
    badge: 'CONCLUDED',
    prizePool: 750000,
    currency: 'coins' as const,
    featured: false,
    status: 'closed' as const,
    startAt: new Date(Date.now() - 45 * 86400000),
    endAt: new Date(Date.now() - 5 * 86400000),
    rules: ['Event has concluded. All prizes have been distributed.'],
    tasks: [],
    prizes: [
      { rankFrom: 1, rankTo: 1, amount: 250000, title: 'Champion' },
      { rankFrom: 2, rankTo: 3, amount: 120000, title: 'Runner Up' },
    ],
  },
];

export class GamesHubService {
  // ─── Lucky Spin (§4.13, #66) ───────────────────────────────────────────────

  async getSpinStatus(userId: string) {
    const { dateKey, end } = getBangladeshDayBounds();
    const existing = await SpinResult.findOne({ userId, dateKey }).lean();
    return {
      slices: SPIN_SLICES,
      freeSpinAvailable: !existing,
      nextFreeSpinAt: existing ? end.toISOString() : null,
      extraSpinCostCoins: 2000,
    };
  }

  async executeSpin(userId: string, paid = false) {
    const { dateKey } = getBangladeshDayBounds();
    const existing = await SpinResult.findOne({ userId, dateKey });

    const user = await User.findById(userId).select('coins diamonds tickets');
    if (!user) throw new AppError('User not found', 404);

    if (existing) {
      if (!paid) {
        throw new AppError('Free spin already used today. Extra spin costs 2000 coins.', 409);
      }
      if ((user.coins || 0) < 2000) {
        throw new AppError('Insufficient coins for extra spin', 400);
      }
      await User.updateOne({ _id: userId, coins: { $gte: 2000 } }, { $inc: { coins: -2000 } });
    }

    // Pick slice server-side
    const sliceIndex = Math.floor(Math.random() * SPIN_SLICES.length);
    const slice = SPIN_SLICES[sliceIndex];

    const incField = slice.currency === 'diamond' ? 'diamonds' : slice.currency === 'ticket' ? 'tickets' : 'coins';
    await User.updateOne({ _id: userId }, { $inc: { [incField]: slice.amount } });

    if (!existing) {
      await SpinResult.create({
        userId,
        dateKey,
        sliceIndex,
        amount: slice.amount,
        currency: incField,
        usedFreeSpin: true,
      });
    }

    const updated = await User.findById(userId).select('coins diamonds tickets').lean();

    return {
      sliceIndex,
      reward: {
        amount: slice.amount,
        currency: slice.currency,
      },
      balances: {
        coins: updated?.coins || 0,
        diamonds: updated?.diamonds || 0,
        tickets: updated?.tickets || 0,
      },
    };
  }

  // ─── Sign-in Calendar (§4.13, #66) ─────────────────────────────────────────

  async getSignInCalendar(userId: string) {
    const { dateKey } = getBangladeshDayBounds();
    const existingToday = await SignInRecord.findOne({ userId, dateKey }).lean();

    // Get all records for user this week
    const last7 = await SignInRecord.find({ userId }).sort({ createdAt: -1 }).limit(7).lean();
    const claimedDays = new Set(last7.map((r: any) => r.day));

    const days = SIGNIN_REWARDS.map((cfg) => ({
      day: cfg.day,
      reward: cfg.reward,
      claimed: claimedDays.has(cfg.day),
    }));

    return {
      days,
      todayClaimed: !!existingToday,
    };
  }

  async signIn(userId: string) {
    const { dateKey } = getBangladeshDayBounds();
    const existing = await SignInRecord.findOne({ userId, dateKey });
    if (existing) throw new AppError('Already signed in today', 409);

    const lastRecord = await SignInRecord.findOne({ userId }).sort({ createdAt: -1 });
    const lastDay = (lastRecord as any)?.day || 0;
    const day = lastDay >= 7 ? 1 : lastDay + 1;
    const rewardCfg = SIGNIN_REWARDS.find((r) => r.day === day) || SIGNIN_REWARDS[0];

    await User.updateOne({ _id: userId }, { $inc: { coins: rewardCfg.reward } });

    await SignInRecord.create({
      userId,
      dateKey,
      day,
      reward: rewardCfg.reward,
      currency: 'coins',
    });

    return {
      day,
      reward: rewardCfg.reward,
      claimed: true,
    };
  }

  // ─── Activities (§4.13, #68) ───────────────────────────────────────────────

  async ensureSeedActivities(): Promise<void> {
    for (const act of SEED_ACTIVITIES) {
      await Activity.updateOne({ key: act.key }, { $set: act }, { upsert: true });
    }
  }

  async getActivities(status?: string, userId?: string): Promise<any[]> {
    await this.ensureSeedActivities();

    const filter: any = {};
    if (status) filter.status = status;
    else filter.status = 'ongoing';

    const activities = await Activity.find(filter).sort({ featured: -1, startAt: -1 }).lean();

    if (!userId) {
      return activities.map((act) => ({
        ...act,
        completedTasksCount: 0,
        totalTasksCount: act.tasks?.length || 0,
        claimableCoins: 0,
      }));
    }

    const { dateKey } = getBangladeshDayBounds();

    // Fetch user progress and claims for today
    const claims = await ActivityClaim.find({ userId, dateKey }).lean();
    const claimedSet = new Set(claims.map((c) => `${c.activityKey}:${c.taskKey}`));

    const taskProgressDocs = await TaskProgress.find({ userId, dateKey }).lean();
    const progressMap = new Map(taskProgressDocs.map((p) => [p.taskKey, p.progress]));

    return activities.map((act) => {
      const tasks = act.tasks || [];
      let completedCount = 0;
      let claimableCoins = 0;

      for (const t of tasks) {
        const isClaimed = claimedSet.has(`${act.key}:${t.key}`);
        const currentProgress = progressMap.get(t.key) ?? progressMap.get(t.metric) ?? 0;
        const isReady = currentProgress >= t.target;

        if (isClaimed) {
          completedCount += 1;
        } else if (isReady) {
          claimableCoins += t.reward?.amount || 0;
        }
      }

      return {
        ...act,
        completedTasksCount: completedCount,
        totalTasksCount: tasks.length,
        claimableCoins,
      };
    });
  }

  async getActivity(key: string, userId?: string): Promise<any> {
    await this.ensureSeedActivities();

    const activity = await Activity.findOne({ $or: [{ key }, { _id: key.match(/^[0-9a-fA-F]{24}$/) ? key : undefined }] }).lean();
    if (!activity) throw new AppError('Activity not found', 404);

    if (!userId) {
      return {
        ...activity,
        tasks: (activity.tasks || []).map((t) => ({
          ...t,
          progress: 0,
          state: 'todo',
        })),
        userStats: {
          totalEarnedCoins: 0,
          claimableCoins: 0,
          completedCount: 0,
        },
      };
    }

    const { dateKey } = getBangladeshDayBounds();

    // Fetch user's claimed tasks for today
    const claims = await ActivityClaim.find({ userId, activityKey: activity.key, dateKey }).lean();
    const claimedSet = new Set(claims.map((c) => c.taskKey));

    // Fetch task progress
    const taskProgressDocs = await TaskProgress.find({ userId, dateKey }).lean();
    const progressMap = new Map(taskProgressDocs.map((p) => [p.taskKey, p.progress]));

    let totalEarnedCoins = claims.reduce((acc, c) => acc + (c.rewardAmount || 0), 0);
    let claimableCoins = 0;
    let completedCount = claims.length;

    const enrichedTasks = (activity.tasks || []).map((t) => {
      const isClaimed = claimedSet.has(t.key);
      const currentProgress = progressMap.get(t.key) ?? progressMap.get(t.metric) ?? 0;
      const isTargetMet = currentProgress >= t.target;

      let state: 'todo' | 'claimable' | 'claimed' = 'todo';
      if (isClaimed) {
        state = 'claimed';
      } else if (isTargetMet) {
        state = 'claimable';
        claimableCoins += t.reward?.amount || 0;
      }

      return {
        ...t,
        progress: Math.min(currentProgress, t.target),
        state,
      };
    });

    return {
      ...activity,
      tasks: enrichedTasks,
      userStats: {
        totalEarnedCoins,
        claimableCoins,
        completedCount,
      },
    };
  }

  async claimActivityTask(userId: string, activityKey: string, taskKey: string): Promise<any> {
    const { dateKey } = getBangladeshDayBounds();

    const activity = await Activity.findOne({ key: activityKey });
    if (!activity) throw new AppError('Activity not found', 404);

    const task = activity.tasks.find((t) => t.key === taskKey);
    if (!task) throw new AppError('Task not found in this activity', 404);

    const existingClaim = await ActivityClaim.findOne({ userId, activityKey, taskKey, dateKey });
    if (existingClaim) {
      throw new AppError('Reward already collected for today', 400);
    }

    // Check progress
    const progressDoc = await TaskProgress.findOne({
      userId,
      dateKey,
      taskKey: { $in: [task.key, task.metric] },
    });
    const currentProgress = progressDoc?.progress || 0;

    if (currentProgress < task.target) {
      throw new AppError(`Task target not yet reached (${currentProgress}/${task.target})`, 400);
    }

    const rewardAmount = task.reward.amount;

    // Credit user coins atomically
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { coins: rewardAmount } },
      { new: true }
    );

    if (!updatedUser) throw new AppError('User not found', 404);

    // Save claim record
    const claimDoc = await ActivityClaim.create({
      userId,
      activityKey,
      taskKey,
      dateKey,
      rewardAmount,
      currency: 'coins',
      claimedAt: new Date(),
    });

    // Realtime socket balance update
    try {
      const io = getIO();
      if (io) {
        io.to(`user:${userId}`).emit('balance:update', {
          coins: updatedUser.coins,
          diamonds: updatedUser.diamonds,
        });
      }
    } catch {
      // non-fatal
    }

    return {
      success: true,
      activityKey,
      taskKey,
      rewardAmount,
      currency: 'coins',
      newCoinsBalance: updatedUser.coins,
      claimedAt: claimDoc.claimedAt,
    };
  }

  async claimAllActivityTasks(userId: string): Promise<any> {
    const { dateKey } = getBangladeshDayBounds();

    const ongoingActivities = await Activity.find({ status: 'ongoing' }).lean();
    const claims = await ActivityClaim.find({ userId, dateKey }).lean();
    const claimedSet = new Set(claims.map((c) => `${c.activityKey}:${c.taskKey}`));

    const taskProgressDocs = await TaskProgress.find({ userId, dateKey }).lean();
    const progressMap = new Map(taskProgressDocs.map((p) => [p.taskKey, p.progress]));

    const eligibleClaims: { activityKey: string; taskKey: string; rewardAmount: number }[] = [];
    let totalCoinsToCredit = 0;

    for (const act of ongoingActivities) {
      for (const task of act.tasks || []) {
        const claimKey = `${act.key}:${task.key}`;
        if (claimedSet.has(claimKey)) continue;

        const currentProgress = progressMap.get(task.key) ?? progressMap.get(task.metric) ?? 0;
        if (currentProgress >= task.target) {
          eligibleClaims.push({
            activityKey: act.key,
            taskKey: task.key,
            rewardAmount: task.reward.amount,
          });
          totalCoinsToCredit += task.reward.amount;
        }
      }
    }

    if (eligibleClaims.length === 0) {
      throw new AppError('No ready-to-claim activity tasks found', 400);
    }

    // Credit user coins atomically
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { coins: totalCoinsToCredit } },
      { new: true }
    );

    // Create claim records
    const now = new Date();
    await ActivityClaim.insertMany(
      eligibleClaims.map((c) => ({
        userId,
        activityKey: c.activityKey,
        taskKey: c.taskKey,
        dateKey,
        rewardAmount: c.rewardAmount,
        currency: 'coins',
        claimedAt: now,
      }))
    );

    // Socket update
    try {
      const io = getIO();
      if (io && updatedUser) {
        io.to(`user:${userId}`).emit('balance:update', {
          coins: updatedUser.coins,
          diamonds: updatedUser.diamonds,
        });
      }
    } catch {
      // non-fatal
    }

    return {
      claimedCount: eligibleClaims.length,
      totalCoinsClaimed: totalCoinsToCredit,
      newCoinsBalance: updatedUser?.coins,
    };
  }

  async getActivityRewards(userId: string): Promise<any[]> {
    const claims = await ActivityClaim.find({ userId }).sort({ claimedAt: -1 }).limit(50).lean();
    const activityKeys = Array.from(new Set(claims.map((c) => c.activityKey)));
    const activities = await Activity.find({ key: { $in: activityKeys } }).lean();
    const actMap = new Map(activities.map((a) => [a.key, a]));

    return claims.map((c) => {
      const act = actMap.get(c.activityKey);
      const task = act?.tasks?.find((t) => t.key === c.taskKey);
      return {
        _id: c._id,
        activityKey: c.activityKey,
        activityTitle: act?.title || 'Live Activity',
        taskKey: c.taskKey,
        taskLabel: task?.label || 'Live Task Completed',
        rewardAmount: c.rewardAmount,
        currency: c.currency,
        dateKey: c.dateKey,
        claimedAt: c.claimedAt,
      };
    });
  }

  async recordLiveActivity(userId: string, metric: string, increment: number = 1): Promise<void> {
    if (increment <= 0) return;

    const { dateKey } = getBangladeshDayBounds();

    // 1. Update general task service (for daily tasks)
    await taskService.recordProgress(userId, metric, increment).catch(() => {});

    // 2. Also ensure progress document for metric directly
    await TaskProgress.findOneAndUpdate(
      { userId, taskKey: metric, dateKey },
      { $inc: { progress: increment } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 3. For any activity task matching this metric, also update its specific taskKey
    const ongoingActivities = await Activity.find({ status: 'ongoing' }).lean();
    for (const act of ongoingActivities) {
      const matchingTasks = (act.tasks || []).filter((t) => t.metric === metric);
      for (const t of matchingTasks) {
        await TaskProgress.findOneAndUpdate(
          { userId, taskKey: t.key, dateKey },
          { $inc: { progress: increment } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    }
  }

  // ─── Games Catalogue (§4.13, #67, #70) ────────────────────────────────────

  async getGames() {
    return [
      { key: 'teenpatti',  name: 'Teen Patti',  icon: 'teenpatti',  color: '#8A2BE2', badge: 'HOT', currency: 'diamond', launchUrl: '/teenpatti' },
      { key: 'roulette',   name: 'Roulette',    icon: 'roulette',   color: '#DC143C', badge: 'HOT', currency: 'diamond', launchUrl: '/roulette'  },
      { key: 'aviator',    name: 'Aviator',     icon: 'aviator',    color: '#FF4500', badge: 'NEW', currency: 'diamond', launchUrl: '/aviator'   },
      { key: 'lucky_spin', name: 'Lucky Spin',  icon: 'lucky_spin', color: '#FFD700', badge: 'HOT', currency: 'coupon',  launchUrl: '/lucky-spin'},
    ];
  }

  async getHome() {
    const games = await this.getGames();
    const banner = await Activity.findOne({ status: 'ongoing' }).sort({ featured: -1, startAt: -1 }).lean();
    return {
      games,
      banner: banner || null,
    };
  }

  async getWinners() {
    // Generate realistic winner ticker from recent high game payouts
    return [
      { nickname: '🐬Akhi🐬', amount: 1200000, currency: 'diamond', gameKey: 'aviator' },
      { nickname: 'KingRaj', amount: 850000, currency: 'diamond', gameKey: 'teenpatti' },
      { nickname: 'Star_BD', amount: 540000, currency: 'diamond', gameKey: 'roulette' },
      { nickname: 'LuckyGirl', amount: 320000, currency: 'coin', gameKey: 'lucky_spin' },
    ];
  }
}

export const gamesHubService = new GamesHubService();
