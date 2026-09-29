import { TaskConfig, TaskProgress, User, UserInventory, StoreItem, TaskGroup } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getBangladeshDayBounds } from '../utils/date';
import { getIO } from '../socket';

const DEFAULT_TASKS = [
  // ── Daily Missions (Coins rewards) ──────────────────────────────────
  {
    key: 'daily_check_in',
    group: 'daily' as TaskGroup,
    sectionKey: 'daily_routine',
    sectionTitle: 'Daily Missions',
    sectionNote: 'Complete daily missions to earn free coins',
    label: 'Daily Sign-in & Check-in',
    note: 'Sign in every day to claim your free coin bonus',
    target: 1,
    metric: 'daily_login',
    reward: { currency: 'coins' as const, amount: 200 },
    goTo: '/rewards',
    order: 0,
  },
  {
    key: 'daily_watch_live_10m',
    group: 'daily' as TaskGroup,
    sectionKey: 'daily_routine',
    sectionTitle: 'Daily Missions',
    sectionNote: 'Complete daily missions to earn free coins',
    label: 'Watch live stream for 10 minutes',
    note: 'Stay in any live stream room for 10 minutes',
    target: 10,
    metric: 'live_watch_minutes',
    reward: { currency: 'coins' as const, amount: 500 },
    goTo: '/',
    order: 1,
  },
  {
    key: 'daily_send_1_gift',
    group: 'daily' as TaskGroup,
    sectionKey: 'daily_routine',
    sectionTitle: 'Daily Missions',
    label: 'Send at least 1 gift in any room',
    note: 'Support your favorite host with any gift',
    target: 1,
    metric: 'gift_sent',
    reward: { currency: 'coins' as const, amount: 1000 },
    goTo: '/',
    order: 2,
  },
  {
    key: 'daily_give_50_likes',
    group: 'daily' as TaskGroup,
    sectionKey: 'daily_routine',
    sectionTitle: 'Daily Missions',
    label: 'Give 50 likes in live streams',
    note: 'Tap the screen to send likes to streamers',
    target: 50,
    metric: 'likes',
    reward: { currency: 'coins' as const, amount: 200 },
    goTo: '/',
    order: 3,
  },
  {
    key: 'daily_join_party',
    group: 'daily' as TaskGroup,
    sectionKey: 'daily_routine',
    sectionTitle: 'Daily Missions',
    label: 'Join a voice party room',
    note: 'Enter and hang out in any party room',
    target: 1,
    metric: 'party_join',
    reward: { currency: 'coins' as const, amount: 300 },
    goTo: '/party',
    order: 4,
  },
  {
    key: 'daily_post_moment',
    group: 'daily' as TaskGroup,
    sectionKey: 'daily_routine',
    sectionTitle: 'Daily Missions',
    label: 'Share a Moment post',
    note: 'Post a new photo or status on Moments',
    target: 1,
    metric: 'post_moment',
    reward: { currency: 'coins' as const, amount: 300 },
    goTo: '/moments/new',
    order: 5,
  },
  {
    key: 'daily_send_chat',
    group: 'daily' as TaskGroup,
    sectionKey: 'daily_routine',
    sectionTitle: 'Daily Missions',
    label: 'Send 5 chat messages',
    note: 'Chat in live streams, party rooms or direct messages',
    target: 5,
    metric: 'chat_sent',
    reward: { currency: 'coins' as const, amount: 300 },
    goTo: '/chats',
    order: 6,
  },
  {
    key: 'daily_game_play',
    group: 'daily' as TaskGroup,
    sectionKey: 'daily_routine',
    sectionTitle: 'Daily Missions',
    label: 'Play 1 round of any game',
    note: 'Play Lucky Spin, Roulette, Teen Patti or Aviator',
    target: 1,
    metric: 'game_rounds',
    reward: { currency: 'coins' as const, amount: 400 },
    goTo: '/game',
    order: 7,
  },
  {
    key: 'daily_share_app',
    group: 'daily' as TaskGroup,
    sectionKey: 'daily_routine',
    sectionTitle: 'Daily Missions',
    label: 'Share stream or invite friends',
    note: 'Share stream link or invite code with friends',
    target: 1,
    metric: 'share_stream',
    reward: { currency: 'coins' as const, amount: 400 },
    goTo: '/invite',
    order: 8,
  },

  // ── PK Mission (#32) ────────────────────────────────────────────────
  {
    key: 'pk_likes_300',
    group: 'pk_mission' as TaskGroup,
    sectionKey: 'pk_gifts',
    sectionTitle: 'Get PK gifts for free by completing daily tasks',
    sectionNote: 'PK Gifts expire in 72h after being claimed',
    label: 'Give ≥300 likes in live',
    note: 'Same live room likes count after 20+, progress updates every 20 likes',
    target: 300,
    metric: 'likes',
    reward: { currency: 'pk_flag' as const, amount: 5, expiresInHours: 72 },
    goTo: '/',
    order: 1,
  },
  {
    key: 'pk_win_1_battle',
    group: 'pk_mission' as TaskGroup,
    sectionKey: 'pk_gifts',
    sectionTitle: 'Get PK gifts for free by completing daily tasks',
    label: 'Win 1 PK battle',
    target: 1,
    metric: 'pk_win',
    reward: { currency: 'pk_flag' as const, amount: 10, expiresInHours: 72 },
    goTo: '/party',
    order: 2,
  },

  // ── Games (#69) ─────────────────────────────────────────────────────
  {
    key: 'games_play_3_rounds',
    group: 'games' as TaskGroup,
    sectionKey: 'games_daily',
    sectionTitle: 'Diamond Games Mission',
    label: 'Play 3 rounds in any diamond game',
    target: 3,
    metric: 'game_rounds',
    reward: { currency: 'coins' as const, amount: 500 },
    goTo: '/game',
    order: 1,
  },

  // ── Interactive ─────────────────────────────────────────────────────
  {
    key: 'interactive_comment_5',
    group: 'interactive' as TaskGroup,
    sectionKey: 'social_interaction',
    sectionTitle: 'Interactive Tasks',
    label: 'Send 5 chat messages in live or party',
    target: 5,
    metric: 'chat_sent',
    reward: { currency: 'coins' as const, amount: 300 },
    goTo: '/',
    order: 1,
  },

  // ── Fan club ────────────────────────────────────────────────────────
  {
    key: 'fanclub_lightup',
    group: 'fan_club' as TaskGroup,
    sectionKey: 'fan_club_tasks',
    sectionTitle: 'Fan Club Missions',
    label: 'Light up your favorite host once today',
    target: 1,
    metric: 'fanclub_light',
    reward: { currency: 'coins' as const, amount: 500 },
    goTo: '/fan-club',
    order: 1,
  },

  // ── Activity ────────────────────────────────────────────────────────
  {
    key: 'activity_share_live',
    group: 'activity' as TaskGroup,
    sectionKey: 'activity_bonus',
    sectionTitle: 'Special Activity Tasks',
    label: 'Share a live stream with friends',
    target: 1,
    metric: 'share_stream',
    reward: { currency: 'coins' as const, amount: 400 },
    goTo: '/invite',
    order: 1,
  },
];

export const taskService = {
  async ensureSeedTasks() {
    for (const t of DEFAULT_TASKS) {
      await TaskConfig.updateOne({ key: t.key }, { $set: t }, { upsert: true });
    }
  },

  async getTaskBoard(userId: string, group: TaskGroup = 'daily') {
    await this.ensureSeedTasks();

    const { dateKey, end: resetsAt } = getBangladeshDayBounds();

    // Auto-record check-in task for today
    const checkInTask = await TaskProgress.findOne({ userId, taskKey: 'daily_check_in', dateKey });
    if (!checkInTask) {
      await TaskProgress.create({
        userId,
        taskKey: 'daily_check_in',
        dateKey,
        progress: 1,
        target: 1,
        state: 'claimable',
      });
    }

    // 1. Fetch configs for this group
    const configs = await TaskConfig.find({ group, isActive: true }).sort({ order: 1 });

    // 2. Fetch user's progress for today
    const taskKeys = configs.map((c) => c.key);
    const progressList = await TaskProgress.find({
      userId,
      taskKey: { $in: taskKeys },
      dateKey,
    });
    const progressMap = new Map(progressList.map((p) => [p.taskKey, p]));

    // 3. Compute today's total claimed earnings across all tasks
    const allClaimedToday = await TaskProgress.find({
      userId,
      dateKey,
      state: 'claimed',
    });

    // Lookup reward values for claimed tasks
    const claimedKeys = allClaimedToday.map((p) => p.taskKey);
    const claimedConfigs = await TaskConfig.find({ key: { $in: claimedKeys } });
    const configMap = new Map(claimedConfigs.map((c) => [c.key, c]));

    let pointsEarned = 0;
    let coinsEarned = 0;
    for (const claimed of allClaimedToday) {
      const cfg = configMap.get(claimed.taskKey);
      if (cfg) {
        if (cfg.reward.currency === 'diamonds') pointsEarned += cfg.reward.amount;
        else if (cfg.reward.currency === 'coins') coinsEarned += cfg.reward.amount;
      }
    }

    // 4. Group into sections
    const sectionMap = new Map<string, any>();

    for (const cfg of configs) {
      let section = sectionMap.get(cfg.sectionKey);
      if (!section) {
        section = {
          key: cfg.sectionKey,
          title: cfg.sectionTitle,
          note: cfg.sectionNote,
          tasks: [],
        };
        sectionMap.set(cfg.sectionKey, section);
      }

      const p = progressMap.get(cfg.key);
      const progressValue = p?.progress || 0;
      const state = p?.state || (progressValue >= cfg.target ? 'claimable' : 'todo');

      section.tasks.push({
        key: cfg.key,
        label: cfg.label,
        note: cfg.note,
        progress: progressValue,
        target: cfg.target,
        reward: {
          currency: cfg.reward.currency === 'coins' ? 'coin' : cfg.reward.currency,
          amount: cfg.reward.amount,
        },
        state,
        goTo: cfg.goTo,
      });
    }

    return {
      todayEarnings: {
        points: pointsEarned,
        coins: coinsEarned,
      },
      resetsAt: resetsAt.toISOString(),
      sections: Array.from(sectionMap.values()),
    };
  },

  async recordProgress(userId: string, metric: string, increment: number = 1) {
    if (increment <= 0) return;

    const { dateKey } = getBangladeshDayBounds();
    const matchingConfigs = await TaskConfig.find({ metric, isActive: true });
    if (matchingConfigs.length === 0) return;

    for (const cfg of matchingConfigs) {
      const progress = await TaskProgress.findOne({ userId, taskKey: cfg.key, dateKey });

      if (progress) {
        if (progress.state === 'claimed') continue; // Already claimed

        const newProgress = progress.progress + increment;
        progress.progress = newProgress;
        if (newProgress >= cfg.target && progress.state === 'todo') {
          progress.state = 'claimable';
        }
        await progress.save();
      } else {
        const state = increment >= cfg.target ? 'claimable' : 'todo';
        await TaskProgress.create({
          userId,
          taskKey: cfg.key,
          dateKey,
          progress: increment,
          target: cfg.target,
          state,
        });
      }
    }
  },

  async claimTask(userId: string, taskKey: string) {
    const { dateKey } = getBangladeshDayBounds();

    const config = await TaskConfig.findOne({ key: taskKey, isActive: true });
    if (!config) throw new AppError('Task not found', 404);

    let progress = await TaskProgress.findOne({ userId, taskKey, dateKey });
    if (!progress) {
      throw new AppError('Task not started or completed yet', 400);
    }

    if (progress.state === 'claimed') {
      throw new AppError('Reward already claimed today', 400);
    }

    if (progress.progress < config.target && progress.state !== 'claimable') {
      throw new AppError('Task objective has not been achieved yet', 400);
    }

    // Atomic claim state update
    const updatedProgress = await TaskProgress.findOneAndUpdate(
      { _id: progress._id, state: { $ne: 'claimed' } },
      { state: 'claimed', claimedAt: new Date() },
      { new: true }
    );
    if (!updatedProgress) {
      throw new AppError('Reward already claimed', 409);
    }

    // Credit reward
    const reward = config.reward;
    let updatedUser = null;

    if (reward.currency === 'coins') {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { coins: reward.amount } },
        { new: true }
      );
    } else if (reward.currency === 'diamonds') {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { diamonds: reward.amount } },
        { new: true }
      );
    } else if (reward.currency === 'tickets') {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { tickets: reward.amount } },
        { new: true }
      );
    } else if (reward.currency === 'pk_flag') {
      let pkFlagItem = await StoreItem.findOne({ category: 'profile_card', name: 'PK Flag' });
      if (!pkFlagItem) {
        pkFlagItem = await StoreItem.create({
          category: 'profile_card',
          name: 'PK Flag',
          priceCoins: 0,
          priceTickets: 0,
          giftable: true,
          isActive: true,
        });
      }

      const expiresAt = new Date(Date.now() + (reward.expiresInHours || 72) * 60 * 60 * 1000);
      await UserInventory.create({
        userId,
        itemId: pkFlagItem._id,
        category: 'profile_card',
        expiresAt,
        equipped: false,
        isNewItem: true,
        acquiredAt: new Date(),
      });
    }

    // Real-time socket balance update if available
    try {
      const io = getIO();
      if (io && updatedUser) {
        io.emit('balance:update', {
          userId,
          coins: updatedUser.coins,
          diamonds: updatedUser.diamonds,
        });
      }
    } catch {
      // non-fatal
    }

    return {
      currency: reward.currency === 'coins' ? 'coin' : reward.currency,
      amount: reward.amount,
      userCoins: updatedUser?.coins,
      userDiamonds: updatedUser?.diamonds,
    };
  },
};
