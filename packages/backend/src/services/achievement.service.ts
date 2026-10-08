import { AchievementConfig, IAchievementConfigDocument, User } from '../models';

export interface PosterDTO {
  level: number;
  title: string;
  image: string;
  unlockedAt?: string;
  shareUrl?: string;
}

export interface AchievementGroupDTO {
  key: string;
  title: string;
  count: number;
  posters: PosterDTO[];
}

export const DEFAULT_ACHIEVEMENTS = [
  // ── Milestones ─────────────────────────────────────────────────────────────
  {
    key: 'wealth_milestones',
    category: 'milestones' as const,
    title: 'Wealth Level Milestones',
    order: 1,
    posters: [
      {
        level: 1,
        title: 'Lv.1 Novice Collector',
        image: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=85',
      },
      {
        level: 5,
        title: 'Lv.5 Bronze Luminary',
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=85',
      },
      {
        level: 10,
        title: 'Lv.10 Silver Star',
        image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=85',
      },
      {
        level: 20,
        title: 'Lv.20 Golden Magnate',
        image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&q=85',
      },
      {
        level: 50,
        title: 'Lv.50 Diamond Sovereign',
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=85',
      },
      {
        level: 100,
        title: 'Lv.100 Supreme God of Wealth',
        image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=85',
      },
    ],
  },
  {
    key: 'stream_milestones',
    category: 'milestones' as const,
    title: 'Broadcaster Glory',
    order: 2,
    posters: [
      {
        level: 1,
        title: 'First Live Debut',
        image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=85',
      },
      {
        level: 5,
        title: 'Stage Charmer',
        image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=85',
      },
      {
        level: 10,
        title: 'Featured Host',
        image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=85',
      },
      {
        level: 25,
        title: 'Superstar Broadcaster',
        image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=85',
      },
      {
        level: 50,
        title: 'Legendary Platform Icon',
        image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=85',
      },
    ],
  },
  {
    key: 'community_milestones',
    category: 'milestones' as const,
    title: 'Fanbase & Community',
    order: 3,
    posters: [
      {
        level: 1,
        title: 'Welcome Circle (10 Fans)',
        image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=85',
      },
      {
        level: 5,
        title: 'Popular Hub (50 Fans)',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=85',
      },
      {
        level: 10,
        title: 'Crowd Magnet (200 Fans)',
        image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=85',
      },
      {
        level: 25,
        title: 'Global Fame (1000 Fans)',
        image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=85',
      },
    ],
  },

  // ── Merits ─────────────────────────────────────────────────────────────────
  {
    key: 'gift_merits',
    category: 'merits' as const,
    title: 'Gifting & Generosity Honors',
    order: 1,
    posters: [
      {
        level: 1,
        title: 'First Gift Bestowed',
        image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&q=85',
      },
      {
        level: 5,
        title: 'Generous Patron (1K Diamonds)',
        image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&q=85',
      },
      {
        level: 10,
        title: 'Grand Benefactor (50K Diamonds)',
        image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=85',
      },
      {
        level: 25,
        title: 'Royal Philanthropist (500K)',
        image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&q=85',
      },
      {
        level: 50,
        title: 'Titan of Navo (5M Diamonds)',
        image: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=800&q=85',
      },
    ],
  },
  {
    key: 'loyalty_merits',
    category: 'merits' as const,
    title: 'Daily Dedication & Loyalty',
    order: 2,
    posters: [
      {
        level: 1,
        title: 'First Day Explorer',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=85',
      },
      {
        level: 7,
        title: '7-Day Devotee',
        image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=85',
      },
      {
        level: 30,
        title: 'Monthly Champion',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=85',
      },
      {
        level: 100,
        title: 'Centurion Vanguard',
        image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=85',
      },
    ],
  },
  {
    key: 'pk_merits',
    category: 'merits' as const,
    title: 'PK Battle Gladiators',
    order: 3,
    posters: [
      {
        level: 1,
        title: 'First Battle Debut',
        image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=85',
      },
      {
        level: 5,
        title: 'Brave Arena Duelist',
        image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=85',
      },
      {
        level: 10,
        title: 'PK Master of the Ring',
        image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=85',
      },
      {
        level: 25,
        title: 'Undefeated War Champion',
        image: 'https://images.unsplash.com/photo-1579546929662-711aa81148cf?w=800&q=85',
      },
    ],
  },

  // ── Identity ───────────────────────────────────────────────────────────────
  {
    key: 'noble_identity',
    category: 'identity' as const,
    title: 'Noble Hierarchy & Aristocracy',
    order: 1,
    posters: [
      {
        level: 1,
        title: 'Silver Aristocrat',
        image: 'https://images.unsplash.com/photo-1533158326339-7f3cf2404354?w=800&q=85',
      },
      {
        level: 2,
        title: 'Gold Knight',
        image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&q=85',
      },
      {
        level: 3,
        title: 'Platinum Sovereign',
        image: 'https://images.unsplash.com/photo-1579546929662-711aa81148cf?w=800&q=85',
      },
      {
        level: 4,
        title: 'Diamond Imperial Monarch',
        image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=85',
      },
    ],
  },
  {
    key: 'verified_identity',
    category: 'identity' as const,
    title: 'Official Certification & Badges',
    order: 2,
    posters: [
      {
        level: 1,
        title: 'Verified Creator',
        image: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=85',
      },
      {
        level: 2,
        title: 'Official Platform Host',
        image: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&q=85',
      },
      {
        level: 3,
        title: 'Navo Global Ambassador',
        image: 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=800&q=85',
      },
    ],
  },
  {
    key: 'status_identity',
    category: 'identity' as const,
    title: 'Special Platform Status',
    order: 3,
    posters: [
      {
        level: 1,
        title: 'Agency Master Leader',
        image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=85',
      },
      {
        level: 2,
        title: 'Platform VIP Elite',
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=85',
      },
      {
        level: 3,
        title: 'Hall of Fame Pioneer',
        image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=85',
      },
    ],
  },
];

export const achievementService = {
  /**
   * §4.6 — Get achievement configs and user unlock state.
   */
  async getAchievements(category?: string, userId?: string): Promise<{ obtainedCount: number; groups: AchievementGroupDTO[] }> {
    // Seed default achievements if collection is empty or update configs
    await this.ensureSeeded();

    const filter: any = {};
    if (category && category !== 'all') {
      filter.category = category;
    }

    const docs = await AchievementConfig.find(filter).sort({ order: 1, _id: 1 }).lean();

    const user = userId ? await User.findById(userId).lean() : null;
    const baseUrl = 'http://localhost:3000';

    // Calculate unlocked status for all categories to get accurate total obtainedCount
    let totalObtained = 0;

    // Calculate user metrics
    const userLevel = user?.wealthLevel || user?.level || 1;
    const liveLevel = user?.liveLevel || 1;
    const followersCount = user?.followers?.length || 0;
    const diamondsTotal = Math.max(user?.wealthExp || 0, user?.diamonds || 0);
    const isVerified = Boolean(user?.verification?.verified || user?.verification?.status === 'VERIFIED');
    const isNoble = Boolean(user?.noble?.type);
    const nobleTierLevel = user?.noble?.type === 'diamond' ? 4 : user?.noble?.type === 'platinum' ? 3 : user?.noble?.type === 'gold' ? 2 : user?.noble?.type === 'silver' ? 1 : 0;
    const isSpecialRole = Boolean(user?.isAgent || user?.isAdmin || user?.isVip || user?.role === 'admin' || user?.role === 'agent');

    // Check all achievements across DB to count total obtained posters
    const allAchievements = await AchievementConfig.find({}).lean();
    for (const group of allAchievements) {
      for (const poster of group.posters) {
        if (this.isPosterUnlocked(group.key, poster.level, {
          userLevel,
          liveLevel,
          followersCount,
          diamondsTotal,
          isVerified,
          isNoble,
          nobleTierLevel,
          isSpecialRole,
        })) {
          totalObtained++;
        }
      }
    }

    // Map matched groups
    const groups: AchievementGroupDTO[] = docs.map((doc) => {
      const posters: PosterDTO[] = (doc.posters || []).map((poster) => {
        const unlocked = this.isPosterUnlocked(doc.key, poster.level, {
          userLevel,
          liveLevel,
          followersCount,
          diamondsTotal,
          isVerified,
          isNoble,
          nobleTierLevel,
          isSpecialRole,
        });

        const shareSlug = encodeURIComponent(poster.title.toLowerCase().replace(/\s+/g, '-'));
        const shareUrl = `${baseUrl}/achievements?poster=${shareSlug}`;

        return {
          level: poster.level,
          title: poster.title,
          image: poster.image,
          unlockedAt: unlocked && user?.createdAt ? user.createdAt.toISOString() : unlocked ? new Date().toISOString() : undefined,
          shareUrl,
        };
      });

      return {
        key: doc.key,
        title: doc.title,
        count: posters.length,
        posters,
      };
    });

    return {
      obtainedCount: totalObtained,
      groups,
    };
  },

  isPosterUnlocked(
    groupKey: string,
    posterLevel: number,
    stats: {
      userLevel: number;
      liveLevel: number;
      followersCount: number;
      diamondsTotal: number;
      isVerified: boolean;
      isNoble: boolean;
      nobleTierLevel: number;
      isSpecialRole: boolean;
    }
  ): boolean {
    switch (groupKey) {
      case 'wealth_milestones':
        return stats.userLevel >= posterLevel;
      case 'stream_milestones':
        return stats.liveLevel >= posterLevel;
      case 'community_milestones':
        if (posterLevel === 1) return stats.followersCount >= 10 || stats.userLevel >= 2;
        if (posterLevel === 5) return stats.followersCount >= 50 || stats.userLevel >= 5;
        if (posterLevel === 10) return stats.followersCount >= 200 || stats.userLevel >= 10;
        if (posterLevel === 25) return stats.followersCount >= 1000 || stats.userLevel >= 25;
        return stats.followersCount >= posterLevel * 10;
      case 'gift_merits':
        if (posterLevel === 1) return stats.diamondsTotal > 0 || stats.userLevel >= 1;
        if (posterLevel === 5) return stats.diamondsTotal >= 1000 || stats.userLevel >= 5;
        if (posterLevel === 10) return stats.diamondsTotal >= 50000 || stats.userLevel >= 10;
        if (posterLevel === 25) return stats.diamondsTotal >= 500000 || stats.userLevel >= 20;
        if (posterLevel === 50) return stats.diamondsTotal >= 5000000 || stats.userLevel >= 50;
        return stats.userLevel >= posterLevel;
      case 'loyalty_merits':
        return stats.userLevel >= Math.min(posterLevel, 10);
      case 'pk_merits':
        return stats.userLevel >= posterLevel;
      case 'noble_identity':
        return stats.nobleTierLevel >= posterLevel;
      case 'verified_identity':
        return stats.isVerified;
      case 'status_identity':
        return stats.isSpecialRole;
      default:
        return stats.userLevel >= posterLevel;
    }
  },

  async ensureSeeded() {
    const count = await AchievementConfig.countDocuments();
    if (count === 0) {
      await AchievementConfig.insertMany(DEFAULT_ACHIEVEMENTS);
    } else {
      // Upsert latest configs
      for (const group of DEFAULT_ACHIEVEMENTS) {
        await AchievementConfig.findOneAndUpdate(
          { key: group.key },
          { $set: group },
          { upsert: true }
        );
      }
    }
  },
};
