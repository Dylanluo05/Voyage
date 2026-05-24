import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { connectDb } from './config/db';
import authRouter from './routes/auth';
import tripsRouter from './routes/trips';
import publicRouter from './routes/public';
import usersRouter from './routes/users';
import billingRouter from './routes/billing';
import photosRouter from './routes/photos';
import { errorHandler } from './middleware/error';

async function main(): Promise<void> {
  await connectDb();

  const app = express();
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/trips', tripsRouter);
  app.use('/api/public', publicRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/photos', photosRouter);

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
