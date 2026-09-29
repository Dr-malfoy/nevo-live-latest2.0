import { LevelConfig, AchievementConfig } from '../models';

export const levelService = {
  /**
   * §4.6 — Get level configs.
   * LevelConfig model doesn't have a `kind` field (no wealth/livestream split),
   * so we return all levels sorted by level number.
   * The `kind` param is accepted for API compatibility but ignored.
   */
  async getLevels(_kind?: string) {
    return LevelConfig.find({}).sort({ level: 1 }).lean();
  },

  /** §4.6 — Get achievement configs, optionally filtered by category. */
  async getAchievements(category?: string) {
    const filter: any = {};
    if (category) filter.category = category;
    return AchievementConfig.find(filter).sort({ category: 1, order: 1 }).lean();
  },

  /** Seed default level configs up to level 100 if none exist. */
  async seed() {
    const count = await LevelConfig.countDocuments();
    if (count >= 100) return;
    await LevelConfig.deleteMany({});
    const levels = Array.from({ length: 100 }, (_, i) => ({
      level: i + 1,
      expRequired: Math.round((i + 1) * 1000 * Math.pow(1.08, i)),
      title: `Level ${i + 1}`,
      rewards: (i + 1) % 10 === 0 ? { diamonds: (i + 1) * 10 } : undefined,
    }));
    await LevelConfig.insertMany(levels);
  },
};
