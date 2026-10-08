import mongoose from 'mongoose';
import { env } from '../config/env';
import { StoreItem } from '../models/StoreItem';

export const BADGES_SEED_DATA = [
  {
    category: 'badge' as const,
    name: 'Crown of Monarch',
    description: 'A glowing golden crown fit for royalty and platform elite.',
    image: '👑',
    preview: '👑',
    priceCoins: 10000,
    priceDiamonds: 200,
    durationDays: 30,
    rarity: 'legendary',
    badge: 'HOT',
    order: 1,
    isActive: true,
  },
  {
    category: 'badge' as const,
    name: 'Diamond VIP Elite',
    description: 'Exclusive brilliant cyan diamond badge for top spenders.',
    image: '💎',
    preview: '💎',
    priceCoins: 5000,
    priceDiamonds: 100,
    durationDays: null, // Permanent
    rarity: 'vip',
    badge: 'VIP',
    order: 2,
    isActive: true,
  },
  {
    category: 'badge' as const,
    name: 'Inferno Master',
    description: 'Blazing fire badge representing passionate and unstoppable energy.',
    image: '🔥',
    preview: '🔥',
    priceCoins: 2500,
    priceDiamonds: 50,
    durationDays: 30,
    rarity: 'epic',
    badge: 'HOT',
    order: 3,
    isActive: true,
  },
  {
    category: 'badge' as const,
    name: 'Thunder Star',
    description: 'High voltage electric bolt badge for energetic champions.',
    image: '⚡',
    preview: '⚡',
    priceCoins: 1200,
    priceDiamonds: 25,
    durationDays: 15,
    rarity: 'rare',
    badge: null,
    order: 4,
    isActive: true,
  },
  {
    category: 'badge' as const,
    name: 'Super Star',
    description: 'Shining celestial star badge for beloved community icons.',
    image: '🌟',
    preview: '🌟',
    priceCoins: 3000,
    priceDiamonds: 60,
    durationDays: 30,
    rarity: 'epic',
    badge: 'NEW',
    order: 5,
    isActive: true,
  },
  {
    category: 'badge' as const,
    name: 'Alpha Falcon',
    description: 'Majestic eagle emblem symbolizing dominance and leadership.',
    image: '🦅',
    preview: '🦅',
    priceCoins: 15000,
    priceDiamonds: 300,
    durationDays: null, // Permanent
    rarity: 'legendary',
    badge: 'EXCLUSIVE',
    order: 6,
    isActive: true,
  },
  {
    category: 'badge' as const,
    name: 'Guardian Shield',
    description: 'Sturdy guardian shield for protectors and loyal stream supporters.',
    image: '🛡️',
    preview: '🛡️',
    priceCoins: 1800,
    priceDiamonds: 35,
    durationDays: null,
    rarity: 'rare',
    badge: null,
    order: 7,
    isActive: true,
  },
  {
    category: 'badge' as const,
    name: 'Sakura Princess',
    description: 'Delicate sakura blossom badge with gentle aesthetic charm.',
    image: '🌸',
    preview: '🌸',
    priceCoins: 4000,
    priceDiamonds: 80,
    durationDays: 30,
    rarity: 'epic',
    badge: 'NEW',
    order: 8,
    isActive: true,
  },
  {
    category: 'badge' as const,
    name: 'Cosmic Voyager',
    description: 'Galactic rocket badge for users reaching beyond the stars.',
    image: '🚀',
    preview: '🚀',
    priceCoins: 2000,
    priceDiamonds: 40,
    durationDays: null,
    rarity: 'rare',
    badge: null,
    order: 9,
    isActive: true,
  },
  {
    category: 'badge' as const,
    name: 'Dragon Emperor',
    description: 'Ancient mythical dragon badge displaying immense authority.',
    image: '🐉',
    preview: '🐉',
    priceCoins: 25000,
    priceDiamonds: 500,
    durationDays: null, // Permanent
    rarity: 'legendary',
    badge: 'HOT',
    order: 10,
    isActive: true,
  },
  {
    category: 'badge' as const,
    name: 'Grand Champion',
    description: 'Golden tournament cup for true victors and top rankers.',
    image: '🏆',
    preview: '🏆',
    priceCoins: 12000,
    priceDiamonds: 250,
    durationDays: null,
    rarity: 'vip',
    badge: 'VIP',
    order: 11,
    isActive: true,
  },
  {
    category: 'badge' as const,
    name: 'Royal Fleur',
    description: 'Aristocratic French fleur-de-lis for nobility and patrons.',
    image: '⚜️',
    preview: '⚜️',
    priceCoins: 8000,
    priceDiamonds: 160,
    durationDays: null,
    rarity: 'vip',
    badge: null,
    order: 12,
    isActive: true,
  },
];

export async function seedBadges() {
  console.log('--- Seeding Badges into Store ---');
  let inserted = 0;
  for (const item of BADGES_SEED_DATA) {
    const existing = await StoreItem.findOne({ category: 'badge', name: item.name });
    if (!existing) {
      await StoreItem.create(item);
      inserted++;
      console.log(`+ Created badge: ${item.name}`);
    } else {
      await StoreItem.updateOne({ _id: existing._id }, { $set: item });
      console.log(`~ Updated badge: ${item.name}`);
    }
  }
  console.log(`✓ Badges seeding complete. Inserted/Updated ${BADGES_SEED_DATA.length} badges.`);
}

async function run() {
  try {
    await mongoose.connect(env.mongoUri);
    console.log('Connected to MongoDB');
    await seedBadges();
    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding badges:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}
