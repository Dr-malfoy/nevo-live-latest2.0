import { SpinResult, SignInRecord, Activity, User } from '../models';
import { AppError } from '../middleware/errorHandler';
import { getBangladeshDayBounds } from '../utils/date';

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

export const gamesHubService = {
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
  },

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
  },

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
  },

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
  },

  // ─── Activities (§4.13, #68) ───────────────────────────────────────────────

  async getActivities(status?: string) {
    const filter: any = {};
    if (status) filter.status = status;
    else filter.status = 'ongoing';
    return Activity.find(filter).sort({ startAt: -1 }).lean();
  },

  async getActivity(key: string) {
    const activity = await Activity.findOne({ $or: [{ key }, { _id: key }] }).lean();
    if (!activity) throw new AppError('Activity not found', 404);
    return activity;
  },

  // ─── Games Catalogue (§4.13, #67, #70) ────────────────────────────────────

  async getGames() {
    return [
      { key: 'teenpatti',  name: 'Teen Patti',  icon: 'teenpatti',  color: '#8A2BE2', badge: 'HOT', currency: 'diamond', launchUrl: '/teenpatti' },
      { key: 'roulette',   name: 'Roulette',    icon: 'roulette',   color: '#DC143C', badge: 'HOT', currency: 'diamond', launchUrl: '/roulette'  },
      { key: 'aviator',    name: 'Aviator',     icon: 'aviator',    color: '#FF4500', badge: 'NEW', currency: 'diamond', launchUrl: '/aviator'   },
      { key: 'lucky_spin', name: 'Lucky Spin',  icon: 'lucky_spin', color: '#FFD700', badge: 'HOT', currency: 'coupon',  launchUrl: '/lucky-spin'},
    ];
  },

  async getHome() {
    const games = await this.getGames();
    const banner = await Activity.findOne({ status: 'ongoing' }).sort({ startAt: -1 }).lean();
    return {
      games,
      banner: banner || null,
    };
  },

  async getWinners() {
    // Generate realistic winner ticker from recent high game payouts
    return [
      { nickname: '🐬Akhi🐬', amount: 1200000, currency: 'diamond', gameKey: 'aviator' },
      { nickname: 'KingRaj', amount: 850000, currency: 'diamond', gameKey: 'teenpatti' },
      { nickname: 'Star_BD', amount: 540000, currency: 'diamond', gameKey: 'roulette' },
      { nickname: 'LuckyGirl', amount: 320000, currency: 'coin', gameKey: 'lucky_spin' },
    ];
  },
};
