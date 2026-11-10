import { LevelConfig, AchievementConfig, LevelPrivilege, User } from '../models';
import { calculateWealthLevel, calculateLiveLevel } from '../utils/userLevels';
import { achievementService } from './achievement.service';

const DEFAULT_WEALTH_PRIVILEGES = [
  { level: 1, key: 'badge', title: 'Novice Wealth Badge', scope: 'all_rooms', hint: 'Special wealth badge visible across all live rooms', pillColor: '#FF8C42' },
  { level: 5, key: 'nameplate', title: 'Bronze Member Nameplate', scope: 'all_rooms', hint: 'Highlighted nickname frame in room member list', pillColor: '#CD7F32' },
  { level: 10, key: 'entry_effect', title: 'Silver Room Entry Effect', scope: 'current_room', hint: 'Sparkling silver banner when entering live rooms', pillColor: '#C0C0C0' },
  { level: 15, key: 'badge_vip', title: 'Wealth Spotlight Badge', scope: 'all_rooms', hint: 'Exclusive profile and chat badge', pillColor: '#FFD700' },
  { level: 20, key: 'entry_effect_gold', title: 'Golden Entry Animation', scope: 'all_rooms', hint: 'Full golden animated car banner in all rooms', pillColor: '#F59E0B' },
  { level: 30, key: 'chat_effect', title: 'Exclusive Chat Highlight', scope: 'all_rooms', hint: 'Distinct gold-gradient message bubble in live chats', pillColor: '#E11D48' },
  { level: 40, key: 'banner', title: 'Platinum Crown & Room Banner', scope: 'all_rooms', hint: 'VIP top room banner and profile border', pillColor: '#8B5CF6' },
  { level: 50, key: 'mount', title: 'Flying Castle Luxury Vehicle', scope: 'all_rooms', hint: 'Grand 3D animation car upon entering rooms', pillColor: '#3B82F6' },
  { level: 60, key: 'levelup_effect', title: 'Server-Wide Level-Up Fireworks', scope: 'all_rooms', hint: 'Full-screen celebration for everyone in the app', pillColor: '#EC4899' },
  { level: 80, key: 'global_broadcast', title: 'Global Server Entry Broadcast', scope: 'all_rooms', hint: 'System-wide notification banner when you visit any room', pillColor: '#10B981' },
  { level: 100, key: 'supreme_crown', title: 'Mythic Supreme God Crown & Wings', scope: 'all_rooms', hint: 'Ultimate supreme level privilege and special gift discounts', pillColor: '#6366F1' },
];

const DEFAULT_LIVESTREAM_PRIVILEGES = [
  { level: 1, key: 'badge', title: 'Newcomer Streamer Badge', scope: 'all_rooms', hint: 'Official streamer badge displayed on profile and live room', pillColor: '#3B82F6' },
  { level: 5, key: 'frame', title: 'Bronze Broadcast Frame', scope: 'all_rooms', hint: 'Custom live streaming camera border', pillColor: '#CD7F32' },
  { level: 10, key: 'effect', title: 'Silver Streamer Aura', scope: 'current_room', hint: 'Glowing avatar and room header aura', pillColor: '#C0C0C0' },
  { level: 15, key: 'stickers', title: 'Exclusive Live Room Stickers', scope: 'current_room', hint: 'Custom sticker pack for interactive chat', pillColor: '#10B981' },
  { level: 20, key: 'bonus', title: 'Gold Streamer Badge & 5% Income Bonus', scope: 'all_rooms', hint: 'Boosted coin/diamond conversion rate on gifts', pillColor: '#F59E0B' },
  { level: 30, key: 'crown', title: 'Diamond Streamer Crown & Recommendation', scope: 'all_rooms', hint: 'Priority homepage boost and discovery recommendation', pillColor: '#8B5CF6' },
  { level: 50, key: 'studio_fx', title: 'Studio Soundboard & AR Beauty Filters', scope: 'current_room', hint: 'Professional audio effects and 3D AR facial filters', pillColor: '#EC4899' },
  { level: 75, key: 'contract', title: 'Star Ambassador Verified Contract', scope: 'all_rooms', hint: 'Official platform creator sponsorship and event banners', pillColor: '#E11D48' },
  { level: 100, key: 'hall_of_fame', title: 'Legendary Hall of Fame Streamer Trophy', scope: 'all_rooms', hint: 'Permanent Hall of Fame placement and custom animated gift', pillColor: '#6366F1' },
];

export const levelService = {
  /**
   * §4.6 — Get level state & privileges for current user (wealth | livestream).
   */
  async getLevels(kind: string = 'wealth', userId?: string) {
    const isLivestream = kind === 'livestream';
    const user = userId ? await User.findById(userId).lean() : null;

    let points = 0;
    let level = 1;
    let remaining = 100;
    let progress = 0;
    let badgeIcon = '';

    if (isLivestream) {
      const liveStreamSeconds = user?.liveStreamSeconds || 0;
      const liveStreamMinutes = user?.liveStreamMinutes || Math.floor(liveStreamSeconds / 60);
      const levelInfo = calculateLiveLevel(liveStreamMinutes, user?.liveLevel || 1);
      points = levelInfo.currentPoints;
      level = levelInfo.level;
      remaining = levelInfo.remaining;
      progress = Number((levelInfo.progress / 100).toFixed(3));
      badgeIcon = user?.equippedBadge?.image || '';
    } else {
      const diamonds = Math.max(0, user?.diamonds || 0);
      const wealthExp = Math.max(user?.wealthExp || 0, diamonds);
      const levelInfo = calculateWealthLevel(wealthExp, user?.wealthLevel || user?.level || 1);
      points = levelInfo.currentPoints;
      level = levelInfo.level;
      remaining = levelInfo.remaining;
      progress = Number((levelInfo.progress / 100).toFixed(3));
      badgeIcon = user?.equippedBadge?.image || '';
    }

    // Get privileges from DB or fallback
    let privileges = await LevelPrivilege.find({ kind: isLivestream ? 'livestream' : 'wealth' }).sort({ level: 1 }).lean();
    if (!privileges || privileges.length === 0) {
      const defaults = isLivestream ? DEFAULT_LIVESTREAM_PRIVILEGES : DEFAULT_WEALTH_PRIVILEGES;
      try {
        await LevelPrivilege.insertMany(defaults.map((d) => ({ ...d, kind: isLivestream ? 'livestream' : 'wealth' })));
        privileges = await LevelPrivilege.find({ kind: isLivestream ? 'livestream' : 'wealth' }).sort({ level: 1 }).lean();
      } catch {
        privileges = defaults as any;
      }
    }

    const mappedPrivileges = (privileges || []).map((p) => ({
      level: p.level,
      key: p.key,
      title: p.title,
      icon: p.icon || (isLivestream ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80' : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&q=80'),
      preview: p.preview || '',
      scope: p.scope === 'current_room' ? 'ongoing_room' : 'all_rooms',
      hint: p.hint || '',
      pillColor: p.pillColor || (isLivestream ? '#3B82F6' : '#FF8C42'),
    }));

    const unlocked = mappedPrivileges.filter((p) => p.level <= level);
    const locked = mappedPrivileges.filter((p) => p.level > level);

    return {
      current: {
        level,
        points,
        nextLevel: level < 100 ? level + 1 : 100,
        remaining,
        progress,
        badgeIcon,
      },
      unlocked,
      locked,
    };
  },

  /** §4.6 — Get achievement configs, optionally filtered by category. */
  async getAchievements(category?: string, userId?: string) {
    return achievementService.getAchievements(category, userId);
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
