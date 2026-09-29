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
} from './routes';

const app = express();


const allowedOrigins = [
  "https://nevo-live.onrender.com",
  "https://nevo-live-app-user.onrender.com",
  "https://nevo-live-app-admin.onrender.com",
  "https://nevo-live-app-agent.onrender.com",

  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
  "http://localhost:3005",
  "http://localhost:3006",
  "http://localhost:3007",
  "http://localhost:3008",
  "http://localhost:3009",
  "http://localhost:3010",
];



// Global middleware
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: false,
}));


app.use(cors({
  origin(origin, callback) {

    // Postman/server-to-server requests
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter());

// Static uploads directory
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

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

// Error handler (must be last)
app.use(errorHandler);

export default app;
