import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import {
  authRoutes,
  userRoutes,
  streamRoutes,
  giftRoutes,
  transactionRoutes,
  roomRoutes,
  momentRoutes,
  agencyRoutes,
  adminRoutes,
  agentRoutes,
  notificationRoutes,
  reportRoutes,
  chatRoutes,
  callRoutes,
  officialNotificationRoutes,
  contactRoutes,
  teenpattiRoutes,
  rouletteRoutes,
  aviatorRoutes,
  uploadRoutes,
  paymentRoutes,
  rewardRoutes,
  verificationRoutes,
  rankingRoutes,
  storeRoutes,
  securityRoutes,
  taskRoutes,
  referralRoutes,
  incomeRoutes,
  transferRoutes,
  pkRoutes,
  levelRoutes,
  fanclubRoutes,
  fangroupRoutes,
  streamerRoutes,
  gamesHubRoutes,
  storyRoutes,
  noteRoutes,
} from './routes';

const app = express();


const allowedOrigins = [
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  "https://nevo-live-latest.onrender.com",
  "https://nevo-live.onrender.com",
  "https://nevo-live-app-user.onrender.com",
  "https://nevo-live-app-admin.onrender.com",
  "https://nevo-live-app-agent.onrender.com",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];

// Global middleware
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: false,
}));

app.use(cors({
  origin(origin, callback) {
    // Mobile APK (Capacitor/Cordova) or server-to-server requests
    if (!origin) {
      return callback(null, true);
    }

    if (
      allowedOrigins.includes(origin) ||
      origin.startsWith('capacitor://') ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('https://localhost') ||
      origin.endsWith('.onrender.com')
    ) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(rateLimiter());

// Static uploads directory with CORS, CORP and Range headers support
const staticUploadOptions = {
  setHeaders: (res: express.Response) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');
  },
};

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads'), staticUploadOptions));
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads'), staticUploadOptions));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads'), staticUploadOptions));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'packages/backend/uploads'), staticUploadOptions));

// Root & Health check
app.get('/', (_req, res) => {
  res.json({ name: 'Nevo Live API', status: 'online', health: '/api/health', timestamp: new Date().toISOString() });
});

app.get('/api', (_req, res) => {
  res.json({ name: 'Nevo Live API', status: 'online', health: '/api/health', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/user', userRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/gifts', giftRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/moments', momentRoutes);
app.use('/api/agency', agencyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/official-notifications', officialNotificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/teenpatti', teenpattiRoutes);
app.use('/api/roulette', rouletteRoutes);
app.use('/api/aviator', aviatorRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/pk', pkRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/fanclub', fanclubRoutes);
app.use('/api/fangroups', fangroupRoutes);
app.use('/api/streamer', streamerRoutes);
app.use('/api/games', gamesHubRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/notes', noteRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
