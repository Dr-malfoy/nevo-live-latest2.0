import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { User } from '../models/User';

async function setupAdmin() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bogolive';
  await mongoose.connect(mongoUri);

  const hashedPassword = await bcrypt.hash('admin123', 10);

  let admin = await User.findOne({
    $or: [{ phone: 'admin' }, { role: 'admin' }, { isAdmin: true }],
  });

  if (!admin) {
    admin = await User.create({
      uid: '168000',
      phone: 'admin',
      password: hashedPassword,
      nickname: 'System Admin',
      role: 'admin',
      isAdmin: true,
      diamonds: 999999,
      coins: 999999,
      bio: 'Platform Administrator',
      country: 'US',
    });
    console.log('✅ Created new Admin user.');
  } else {
    admin.phone = 'admin';
    admin.password = hashedPassword;
    admin.role = 'admin';
    admin.isAdmin = true;
    await admin.save();
    console.log('✅ Updated existing Admin user with known password.');
  }

  console.log('\n==========================================');
  console.log('🔑 ADMIN LOGIN CREDENTIALS');
  console.log('==========================================');
  console.log('Phone / Login ID : admin');
  console.log('Password         : admin123');
  console.log('Role             : admin');
  console.log('isAdmin          : true');
  console.log('UID              : ' + admin.uid);
  console.log('==========================================\n');

  await mongoose.disconnect();
}

setupAdmin().catch((err) => {
  console.error('Error setting admin:', err);
  process.exit(1);
});
