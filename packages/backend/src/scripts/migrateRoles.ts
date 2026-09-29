/**
 * One-time migration: derive User.role from legacy isAdmin/isAgent/agencyId.
 * Run with: npm run migrate
 */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models';

async function migrate() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to MongoDB, migrating roles...');

  const result = await User.updateMany(
    {},
    [
      {
        $set: {
          role: {
            $cond: [
              { $eq: ['$isAdmin', true] },
              'admin',
              {
                $cond: [
                  { $eq: ['$isAgent', true] },
                  'agent',
                  {
                    $cond: [
                      { $ne: ['$agencyId', null] },
                      'host',
                      'user',
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    ]
  );

  console.log(`Migration complete. Modified ${result.modifiedCount} documents.`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
