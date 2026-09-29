import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDB } from './config/db';
import { initSocket, getIO } from './socket';
import { teenPattiService } from './services/teenpatti.service';
import { rouletteService } from './services/roulette.service';
import { aviatorService } from './services/aviator.service';
import { startStreamReaper } from './services/stream.service';
import { matchService } from './services/match.service';
import { startRankingEngine } from './services/ranking.service';

const start = async (): Promise<void> => {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);
  app.set('io', getIO());

  // End stale live sessions even when no feed is being fetched
  startStreamReaper();

  // Random 1:1 match queue — pair users looking for a stranger call
  matchService.start();

  // Precompute the leaderboards (§4.5) and settle finished prize windows
  startRankingEngine();

  // Start the Teen Patti multiplayer engine
  teenPattiService.start().catch((e) => console.error('Teen Patti engine start failed:', e));

  // Start the Roulette wheel engine
  rouletteService.start().catch((e) => console.error('Roulette engine start failed:', e));

  // Start the Aviator crash-game engine
  aviatorService.start().catch((e) => console.error('Aviator engine start failed:', e));

  httpServer.listen(env.port, () => {
    console.log(`\n🚀 Bogolive API running on port ${env.port}`);
    console.log(`   Environment: ${env.nodeEnv}`);
    console.log(`   Health: http://localhost:${env.port}/api/health\n`);
  });
};

const shutdown = (signal: string) => {
  console.log(`\n${signal} received — shutting down game engines...`);
  rouletteService.stop();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
