import './instrument';
import * as Sentry from '@sentry/node';
import express, { raw } from 'express';
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
import transitRouter from './routes/transit';
import reportsRouter from './routes/reports';
import adminRouter from './routes/admin';
import { errorHandler } from './middleware/error';
import { stripeWebhook } from './controllers/billingController';

async function main(): Promise<void> {
  await connectDb();

  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientOrigins, credentials: true, exposedHeaders: ['Content-Disposition'] }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  // Stripe signature verification needs the unparsed body, so this must be
  // registered before express.json() below.
  app.post('/api/billing/webhook', raw({ type: 'application/json' }), stripeWebhook);

  app.use(express.json({ limit: '1mb' }));

  // /me runs on every page load, so it must not eat the login brute-force budget.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/me',
  });
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
  app.use('/api/transit', apiLimiter, transitRouter);
  app.use('/api/reports', apiLimiter, reportsRouter);
  app.use('/api/admin', apiLimiter, adminRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Sentry's Express integration (auto-enabled by instrument.ts) captures
  // errors passed to next() automatically — no manual error handler needed.
  app.use(errorHandler);

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[api] listening on http://localhost:${env.port}`);
  });
}

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[unhandledRejection]', reason);
  Sentry.captureException(reason);
});

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[fatal]', err);
  process.exit(1);
});
