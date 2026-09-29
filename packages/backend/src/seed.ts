import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from './config/env';
import { 
  User, Gift, LevelConfig, NobleTier, PaymentConfig, 
  DailyRewardConfig, DEFAULT_REWARD_TIERS, Moment, Chat, ChatMessage 
} from './models';

const MOCK_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80'
];

const MOCK_MOMENT_PICS = [
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1080&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1080&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1080&q=80',
  'https://images.unsplash.com/photo-1504609774788-b2a632db2f26?auto=format&fit=crop&w=1080&q=80',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1080&q=80',
];

const seed = async () => {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to MongoDB for advanced seeding...');
  
  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. CLEAR EXISTING DATA FOR CLEAN SLATE
  await Promise.all([
    User.deleteMany({}),
    Moment.deleteMany({}),
    Chat.deleteMany({}),
    ChatMessage.deleteMany({}),
  ]);
  console.log('✓ Cleared old test data');

  // 2. CREATE ADMIN & AGENT
  const admin = await User.create({
    uid: '168000',
    phone: 'admin',
    password: defaultPassword,
    nickname: 'System Admin',
    avatar: MOCK_AVATARS[0],
    role: 'admin',
    diamonds: 999999,
    bio: 'Platform Administrator',
    country: 'US',
  });

  const agent = await User.create({
    uid: '168001',
    phone: 'agent_test',
    password: defaultPassword,
    nickname: 'Test Agent',
    avatar: MOCK_AVATARS[1],
    role: 'agent',
    diamonds: 50000,
    bio: 'Official Agency Partner',
    country: 'IN',
  });

  // 3. CREATE MOCK USERS & HOSTS
  const createdUsers = [admin, agent];
  for (let i = 2; i <= 10; i++) {
    const isHost = i % 2 === 0;
    createdUsers.push(await User.create({
      uid: `16800${i}`,
      phone: `test${i}`,
      password: defaultPassword,
      nickname: isHost ? `Host_User${i}` : `CoolUser${i}`,
      avatar: MOCK_AVATARS[i % MOCK_AVATARS.length],
      role: isHost ? 'host' : 'user',
      diamonds: 1000 * i,
      level: i * 2,
      bio: `Hello! I'm ${isHost ? 'a host' : 'a user'} here on Navo Live!`,
      country: ['US', 'IN', 'BD', 'PK'][i % 4],
      tags: ['#Music', '#Dance', '#Chat'],
    }));
  }
  console.log(`✓ ${createdUsers.length} users created`);

  // 4. SEED FOLLOWERS / FRIENDS
  for (let i = 0; i < createdUsers.length; i++) {
    const user = createdUsers[i];
    // Follow the next 3 users
    for (let j = 1; j <= 3; j++) {
      const target = createdUsers[(i + j) % createdUsers.length];
      user.following.push(target._id as any);
      target.followers.push(user._id as any);
      await target.save();
    }
    await user.save();
  }
  console.log('✓ Followers and friends graph seeded');

  // 5. SEED MOMENTS (POSTS) WITH PICTURES & COMMENTS
  for (let i = 0; i < createdUsers.length; i++) {
    const user = createdUsers[i];
    // Each user creates 1 or 2 moments
    for (let m = 0; m < (i % 2 === 0 ? 2 : 1); m++) {
      const moment = await Moment.create({
        userId: user._id,
        content: `Just having a great day! #Vibes #Life (Post ${m+1} from ${user.nickname})`,
        media: [MOCK_MOMENT_PICS[(i + m) % MOCK_MOMENT_PICS.length]],
        likes: [createdUsers[(i + 1) % createdUsers.length]._id, createdUsers[(i + 2) % createdUsers.length]._id],
        comments: [
          {
            userId: createdUsers[(i + 1) % createdUsers.length]._id,
            text: 'Amazing picture!! ❤️',
          }
        ]
      });
    }
  }
  console.log('✓ Moments with pictures and comments seeded');

  // 6. SEED CHATS AND MESSAGES
  const chatIds = [];
  // Create chat between Admin and Agent
  let chat = await Chat.create({
    participants: [admin._id, agent._id],
    lastMessage: 'Let us start testing!',
    lastMessageAt: new Date()
  });
  
  await ChatMessage.create({
    chatId: chat._id,
    senderId: admin._id,
    type: 'text',
    message: 'Hello Agent, how is the platform?',
    readBy: [admin._id, agent._id]
  });
  await ChatMessage.create({
    chatId: chat._id,
    senderId: agent._id,
    type: 'text',
    message: 'Let us start testing!',
    readBy: [admin._id, agent._id]
  });

  // Create chat between Agent and test3
  chat = await Chat.create({
    participants: [agent._id, createdUsers[3]._id],
    lastMessage: 'Check out my new stream later',
    lastMessageAt: new Date()
  });
  await ChatMessage.create({
    chatId: chat._id,
    senderId: createdUsers[3]._id,
    type: 'text',
    message: 'Check out my new stream later',
    readBy: [createdUsers[3]._id] // agent hasn't read it
  });

  console.log('✓ Chat threads and messages seeded');

  // 7. SEED GIFTS, LEVELS, CONFIGS (Default system data)
  const giftCount = await Gift.countDocuments();
  if (giftCount === 0) {
    const gifts = [
      { giftId: 'gift_001', name: 'Rose', icon: '🎈', priceDiamonds: 1, order: 1 },
      { giftId: 'gift_002', name: 'Lollipop', icon: '🍭', priceDiamonds: 5, order: 2 },
      { giftId: 'gift_003', name: 'Crown', icon: '👑', priceDiamonds: 10, order: 3 },
      { giftId: 'gift_004', name: 'Rocket', icon: '🚀', priceDiamonds: 50, order: 4 },
      { giftId: 'gift_005', name: 'Lamborghini', icon: '🏎️', priceDiamonds: 100, order: 5 },
      { giftId: 'gift_006', name: 'Yacht', icon: '🛥️', priceDiamonds: 500, order: 6 },
      { giftId: 'gift_007', name: 'Castle', icon: '🏰', priceDiamonds: 1000, order: 7 },
    ];
    await Gift.insertMany(gifts);
    console.log(`✓ ${gifts.length} gifts seeded`);
  }

  const levelCount = await LevelConfig.countDocuments();
  if (levelCount === 0) {
    const levels = [];
    for (let lvl = 1; lvl <= 60; lvl++) {
      levels.push({
        level: lvl,
        expRequired: lvl * 100 + Math.pow(lvl - 1, 2) * 50,
        title: lvl < 10 ? 'Bronze' : lvl < 20 ? 'Silver' : lvl < 30 ? 'Gold' : lvl < 40 ? 'Platinum' : lvl < 50 ? 'Diamond' : 'Legend',
      });
    }
    await LevelConfig.insertMany(levels);
    console.log(`✓ ${levels.length} levels seeded`);
  }

  const nobleCount = await NobleTier.countDocuments();
  if (nobleCount === 0) {
    const tiers = [
      { type: 'silver', priceDiamonds: 100, durationDays: 30, benefits: ['Exclusive badge', 'Priority support'] },
      { type: 'gold', priceDiamonds: 500, durationDays: 30, benefits: ['Exclusive badge', 'Priority support', 'Double EXP', 'Custom emoji'] },
      { type: 'platinum', priceDiamonds: 2000, durationDays: 30, benefits: ['Exclusive badge', 'Priority support', 'Triple EXP', 'Custom emoji', 'VIP chat'] },
      { type: 'diamond', priceDiamonds: 10000, durationDays: 30, benefits: ['Exclusive badge', '24/7 support', '5x EXP', 'Custom emoji', 'VIP chat', 'Featured profile'] },
    ];
    await NobleTier.insertMany(tiers);
    console.log(`✓ ${tiers.length} noble tiers seeded`);
  }

  const config = await PaymentConfig.findOne();
  if (!config) {
    await PaymentConfig.create({
      bybitEnabled: true,
      binanceEnabled: true,
      diamondRate: 1,
      agentProfitPercent: 5,
    });
    console.log('✓ Default payment config created');
  }

  const rewardConfig = await DailyRewardConfig.findOne();
  if (!rewardConfig) {
    await DailyRewardConfig.create({
      giftUserShare: 70,
      giftAdminShare: 30,
      tiers: DEFAULT_REWARD_TIERS,
    });
    console.log(`✓ Daily reward config created`);
  }

  console.log('\n✅ Advanced Seed complete!');
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
