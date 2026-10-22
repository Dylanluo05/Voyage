import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/node';
import { env } from '../config/env';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten() });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // body-parser failures (malformed JSON, payload too large) are client errors.
  const bodyErr = err as { type?: string; status?: number };
  if (bodyErr?.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request body too large' });
    return;
  }
  if (bodyErr?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Malformed JSON body' });
    return;
  }
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  Sentry.captureException(err);
  const message = !env.isProduction && err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
}
