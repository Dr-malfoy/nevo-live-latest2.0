import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const usersCol = mongoose.connection.collection('users');
  const storeItemsCol = mongoose.connection.collection('storeitems');
  const inventoryCol = mongoose.connection.collection('userinventories');

  // 1. Find User 168012
  const user = await usersCol.findOne({ uid: '168012' });
  if (!user) {
    console.error('User with UID 168012 not found!');
    process.exit(1);
  }
  console.log(`Found User: ${user.nickname} (UID: ${user.uid}, ID: ${user._id})`);

  // 2. Create or Update SYSTEM DEVELOPER Profile Badge
  const badgeData = {
    category: 'badge',
    name: 'SYSTEM DEVELOPER',
    description: 'Official Lead Platform Creator & System Developer of Nevo Live.',
    image: '💻',
    preview: '💻',
    rarity: 'mythic',
    priceCoins: 0,
    priceDiamonds: 0,
    priceTickets: 0,
    durationDays: null, // Permanent
    giftable: false,
    requiredHonorLevel: 0,
    isActive: false, // Exclusive: not listed in public store
    order: 0,
    updatedAt: new Date(),
  };

  let badgeItem = await storeItemsCol.findOne({ category: 'badge', name: badgeData.name });
  if (!badgeItem) {
    const res = await storeItemsCol.insertOne({
      ...badgeData,
      soldToday: 0,
      soldThisMonth: 0,
      createdAt: new Date(),
    });
    badgeItem = await storeItemsCol.findOne({ _id: res.insertedId });
    console.log(`Created Developer Badge: ${badgeItem?.name} (_id: ${badgeItem?._id})`);
  } else {
    await storeItemsCol.updateOne({ _id: badgeItem._id }, { $set: badgeData });
    console.log(`Updated Developer Badge: ${badgeItem.name} (_id: ${badgeItem._id})`);
  }

  // 3. Create or Update System Developer Cyber Frame
  const frameData = {
    category: 'avatar_frame',
    name: 'System Developer Cyber Frame',
    description: 'Exclusive Cyber Matrix Frame with animated glowing code brackets </>, quantum core, and neural circuits.',
    image: 'developer-cyber',
    preview: 'developer-cyber',
    rarity: 'SSR',
    priceCoins: 0,
    priceDiamonds: 0,
    priceTickets: 0,
    durationDays: null, // Permanent
    giftable: false,
    requiredHonorLevel: 0,
    isActive: false, // Exclusive: not listed in public store
    order: 0,
    updatedAt: new Date(),
  };

  let frameItem = await storeItemsCol.findOne({ category: 'avatar_frame', name: frameData.name });
  if (!frameItem) {
    const res = await storeItemsCol.insertOne({
      ...frameData,
      soldToday: 0,
      soldThisMonth: 0,
      createdAt: new Date(),
    });
    frameItem = await storeItemsCol.findOne({ _id: res.insertedId });
    console.log(`Created Developer Avatar Frame: ${frameItem?.name} (_id: ${frameItem?._id})`);
  } else {
    await storeItemsCol.updateOne({ _id: frameItem._id }, { $set: frameData });
    console.log(`Updated Developer Avatar Frame: ${frameItem.name} (_id: ${frameItem._id})`);
  }

  if (!badgeItem || !frameItem) {
    throw new Error('Failed to create or find store items');
  }

  // 4. Update Bag (UserInventory) for User 168012
  // Unequip currently equipped badges/frames in inventory so new developer ones are equipped
  await inventoryCol.updateMany(
    { userId: user._id, category: 'badge' },
    { $set: { equipped: false } }
  );
  await inventoryCol.updateMany(
    { userId: user._id, category: 'avatar_frame' },
    { $set: { equipped: false } }
  );

  // Upsert Badge in User's Bag
  const existingBadgeInv = await inventoryCol.findOne({ userId: user._id, itemId: badgeItem._id });
  if (!existingBadgeInv) {
    await inventoryCol.insertOne({
      userId: user._id,
      itemId: badgeItem._id,
      category: 'badge',
      expiresAt: null,
      equipped: true,
      isNewItem: false,
      source: 'exclusive',
      acquiredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`Added "${badgeItem.name}" to Bag of User 168012 (Equipped)`);
  } else {
    await inventoryCol.updateOne(
      { _id: existingBadgeInv._id },
      { $set: { equipped: true, expiresAt: null, isNewItem: false, updatedAt: new Date() } }
    );
    console.log(`Updated "${badgeItem.name}" in Bag of User 168012 (Equipped)`);
  }

  // Upsert Frame in User's Bag
  const existingFrameInv = await inventoryCol.findOne({ userId: user._id, itemId: frameItem._id });
  if (!existingFrameInv) {
    await inventoryCol.insertOne({
      userId: user._id,
      itemId: frameItem._id,
      category: 'avatar_frame',
      expiresAt: null,
      equipped: true,
      isNewItem: false,
      source: 'exclusive',
      acquiredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`Added "${frameItem.name}" to Bag of User 168012 (Equipped)`);
  } else {
    await inventoryCol.updateOne(
      { _id: existingFrameInv._id },
      { $set: { equipped: true, expiresAt: null, isNewItem: false, updatedAt: new Date() } }
    );
    console.log(`Updated "${frameItem.name}" in Bag of User 168012 (Equipped)`);
  }

  // 5. Update User Document with Developer Status & Equipped items
  const currentEquipped = user.equipped || {};
  currentEquipped.badge = badgeItem._id;
  currentEquipped.avatar_frame = frameItem._id;

  const equippedBadge = {
    _id: badgeItem._id,
    name: badgeItem.name,
    image: badgeItem.image,
    preview: badgeItem.preview,
    rarity: badgeItem.rarity,
  };

  const equippedFrame = {
    _id: frameItem._id,
    name: frameItem.name,
    image: frameItem.image,
    preview: frameItem.preview,
    rarity: frameItem.rarity,
  };

  await usersCol.updateOne(
    { _id: user._id },
    {
      $set: {
        isDeveloper: true,
        isAdmin: true,
        role: 'admin',
        equipped: currentEquipped,
        equippedBadge,
        equippedFrame,
        updatedAt: new Date(),
      },
    }
  );

  console.log('Successfully updated User 168012 to System Developer:');
  console.log('isDeveloper: true, isAdmin: true, role: admin');
  console.log('Equipped Badge:', equippedBadge);
  console.log('Equipped Frame:', equippedFrame);

  // 6. Verify in DB
  const updatedUser = await usersCol.findOne({ _id: user._id });
  console.log('Verified User in DB:');
  console.log({
    uid: updatedUser?.uid,
    nickname: updatedUser?.nickname,
    role: updatedUser?.role,
    isAdmin: updatedUser?.isAdmin,
    isDeveloper: updatedUser?.isDeveloper,
    equipped: updatedUser?.equipped,
    equippedBadge: updatedUser?.equippedBadge,
    equippedFrame: updatedUser?.equippedFrame,
  });

  const userBags = await inventoryCol.find({ userId: user._id }).toArray();
  console.log(`Total Bag items for User 168012: ${userBags.length}`);
  const equippedBags = userBags.filter((b) => b.equipped);
  console.log('Equipped items in Bag:', equippedBags.map((b) => ({ category: b.category, itemId: b.itemId, equipped: b.equipped })));

  await mongoose.disconnect();
  console.log('Database script completed successfully.');
}

run().catch((err) => {
  console.error('Error running script:', err);
  process.exit(1);
});
