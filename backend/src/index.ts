import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { connectDb } from './config/db';
import authRouter from './routes/auth';
import tripsRouter from './routes/trips';
import publicRouter from './routes/public';
import usersRouter from './routes/users';
import billingRouter from './routes/billing';
import photosRouter from './routes/photos';
import publicSidequestsRouter from './routes/publicSidequests';
import spotifyRouter from './routes/spotify';
import { errorHandler } from './middleware/error';

async function main(): Promise<void> {
  await connectDb();

  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
  const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/trips', apiLimiter, tripsRouter);
  app.use('/api/public', apiLimiter, publicRouter);
  app.use('/api/users', apiLimiter, usersRouter);
  app.use('/api/billing', apiLimiter, billingRouter);
  app.use('/api/photos', apiLimiter, photosRouter);
  app.use('/api/public-sidequests', apiLimiter, publicSidequestsRouter);
  app.use('/api/spotify', apiLimiter, spotifyRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(errorHandler);

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[api] listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[fatal]', err);
  process.exit(1);
});
