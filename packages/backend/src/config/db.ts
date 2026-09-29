import mongoose from 'mongoose';
import { env } from './env';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn('Could not connect to configured MongoDB. Attempting MongoMemoryServer fallback...');
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { MongoMemoryServer } = await import('mongodb-memory-server');

      const cacheRoot = path.resolve(__dirname, '../../../../.cache');
      const downloadDir = process.env.MONGOMS_DOWNLOAD_DIR || path.join(cacheRoot, 'mongodb-binaries');
      const dbPath = path.join(cacheRoot, 'mongodb-data');

      if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });
      if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });

      const mongoServer = await MongoMemoryServer.create({
        binary: {
          downloadDir,
        },
        instance: {
          dbPath,
          ip: '127.0.0.1',
        },
      });
      const uri = mongoServer.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`MongoDB Memory Server connected at: ${uri}`);
    } catch (memErr) {
      console.error('MongoDB connection error:', error, memErr);
      process.exit(1);
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});
