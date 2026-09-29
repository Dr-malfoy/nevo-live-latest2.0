import mongoose from 'mongoose';
import { env } from '../config/env';
import { Agency } from '../models';

const generateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

async function backfill() {
  await mongoose.connect(env.mongoUri);

  const agencies = await Agency.find();
  let updated = 0;

  for (const a of agencies) {
    if (!a.code) {
      let code = generateCode();
      // Ensure uniqueness
      for (let i = 0; i < 20; i++) {
        const exists = await Agency.exists({ code });
        if (!exists) break;
        code = generateCode();
      }
      a.code = code;
      await a.save();
      updated++;
      console.log(`Backfilled code '${code}' for agency "${a.name}" (${a._id})`);
    } else {
      console.log(`Agency "${a.name}" already has code '${a.code}'`);
    }
  }

  console.log(`\nDone. Backfilled ${updated} agency(ies).`);
  await mongoose.disconnect();
}

backfill().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
