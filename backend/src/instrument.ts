// Must be imported before any other module — Sentry's Node SDK instruments
// other libraries (http, mongoose, etc.) as they're first required.
import * as Sentry from '@sentry/node';
import { env } from './config/env';

if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
    tracesSampleRate: env.isProduction ? 0.1 : 0,
  });
  // eslint-disable-next-line no-console
  console.log(`[sentry] enabled, dsn host: ${new URL(env.sentryDsn).host}`);
} else {
  // eslint-disable-next-line no-console
  console.log('[sentry] disabled — SENTRY_DSN not set');
}
