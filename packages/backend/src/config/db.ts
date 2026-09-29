import mongoose from 'mongoose';
import { env } from './env';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    if (env.nodeEnv === 'production') {
      console.error('MongoDB production connection error:', error);
      process.exit(1);
    }
    console.warn('Could not connect to configured MongoDB. Attempting MongoMemoryServer fallback for development...');
    try {
      const fs = await import('fs');
      const path = await import('path');
      const memPkg = 'mongodb-memory-server';
      const { MongoMemoryServer }: any = await import(memPkg);

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
