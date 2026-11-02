import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary';
import { env } from '../config/env';

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

async function migrateUploads() {
  console.log('====================================================');
  console.log('🚀 Migrating Local Uploads to Cloudinary');
  console.log('====================================================');

  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    throw new Error('Cloudinary credentials are not configured in environment.');
  }

  const ping = await cloudinary.api.ping();
  console.log(`✅ Cloudinary active: cloud="${env.cloudinary.cloudName}", status="${ping.status}"\n`);

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log(`Directory ${UPLOADS_DIR} does not exist. Nothing to migrate.`);
    return;
  }

  const files = fs.readdirSync(UPLOADS_DIR).filter((f) => !f.startsWith('.'));
  console.log(`Found ${files.length} local file(s) in ${UPLOADS_DIR}\n`);

  if (files.length === 0) {
    console.log('No files to migrate.');
    return;
  }

  // Connect to DB
  await mongoose.connect(env.mongoUri);
  console.log(`Connected to MongoDB at ${env.mongoUri.split('@')[1] || 'localhost'}\n`);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed.');
  }

  const urlMapping: Record<string, string> = {};

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const localFilePath = path.join(UPLOADS_DIR, filename);
    const localUrl = `/uploads/${filename}`;
    const ext = path.extname(filename).toLowerCase();

    const isVideo = ['.mp4', '.webm', '.mov', '.mkv', '.avi'].includes(ext);
    const isAudio = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext);
    const resourceType = isVideo ? 'video' : isAudio ? 'video' : 'image';

    try {
      console.log(`[${i + 1}/${files.length}] Uploading ${filename} (${resourceType})...`);
      const uploadResult = await cloudinary.uploader.upload(localFilePath, {
        folder: 'bogolive/migrated',
        resource_type: resourceType,
        transformation: resourceType === 'image' ? [{ quality: 'auto:good', fetch_format: 'auto' }] : undefined,
      });

      urlMapping[localUrl] = uploadResult.secure_url;
      console.log(`   -> ${uploadResult.secure_url}`);
    } catch (err: any) {
      console.error(`   ❌ Failed to upload ${filename}:`, err.message || err);
    }
  }

  console.log(`\nSuccessfully uploaded ${Object.keys(urlMapping).length}/${files.length} files to Cloudinary.`);

  // Update DB references
  console.log('\n--- Updating Database References ---');
  let totalUpdated = 0;

  for (const [oldUrl, newUrl] of Object.entries(urlMapping)) {
    // 1. Moments (media array, videoUrl, thumbnail)
    const mRes1 = await db.collection('moments').updateMany(
      { media: oldUrl },
      { $set: { 'media.$[elem]': newUrl } },
      { arrayFilters: [{ elem: oldUrl }] }
    );
    const mRes2 = await db.collection('moments').updateMany(
      { videoUrl: oldUrl },
      { $set: { videoUrl: newUrl } }
    );
    const mRes3 = await db.collection('moments').updateMany(
      { thumbnail: oldUrl },
      { $set: { thumbnail: newUrl } }
    );
    const mUpdated = mRes1.modifiedCount + mRes2.modifiedCount + mRes3.modifiedCount;

    // 2. Users (avatar, coverPhoto)
    const uRes1 = await db.collection('users').updateMany(
      { avatar: oldUrl },
      { $set: { avatar: newUrl } }
    );
    const uRes2 = await db.collection('users').updateMany(
      { coverPhoto: oldUrl },
      { $set: { coverPhoto: newUrl } }
    );
    const uUpdated = uRes1.modifiedCount + uRes2.modifiedCount;

    // 3. Stories (mediaUrl)
    const sRes = await db.collection('stories').updateMany(
      { mediaUrl: oldUrl },
      { $set: { mediaUrl: newUrl } }
    );

    // 4. Agencies (logo, banner)
    const aRes1 = await db.collection('agencies').updateMany(
      { logo: oldUrl },
      { $set: { logo: newUrl } }
    );
    const aRes2 = await db.collection('agencies').updateMany(
      { banner: oldUrl },
      { $set: { banner: newUrl } }
    );
    const aUpdated = aRes1.modifiedCount + aRes2.modifiedCount;

    const count = mUpdated + uUpdated + sRes.modifiedCount + aUpdated;
    if (count > 0) {
      console.log(`Updated ${count} DB record(s) for ${oldUrl} -> ${newUrl}`);
      totalUpdated += count;
    }
  }

  console.log(`\n🎉 Migration complete! Updated ${totalUpdated} database document(s).`);
  await mongoose.disconnect();
}

migrateUploads().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
