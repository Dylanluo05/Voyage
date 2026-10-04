import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  // In production this must come from a real env var — no localhost fallback.
  // Locally it's convenient to default to a local MongoDB instance.
  mongoUri: isProduction ? required('MONGO_URI') : (process.env.MONGO_URI ?? 'mongodb://localhost:27017/trip_planner'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',').map(o => o.trim()).filter(Boolean),
  get clientOrigin() { return this.clientOrigins[0]; },
  nodeEnv,
  isProduction,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  stripePriceExplorer: process.env.STRIPE_PRICE_EXPLORER ?? '',
  stripePricePro: process.env.STRIPE_PRICE_PRO ?? '',
  stripePriceGlobetrotter: process.env.STRIPE_PRICE_GLOBETROTTER ?? '',
  pexelsApiKey: process.env.PEXELS_API_KEY ?? '',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  mailFrom: process.env.MAIL_FROM ?? 'Voyage <onboarding@resend.dev>',
  requireEmailOtp: process.env.REQUIRE_EMAIL_OTP === 'true',
  adminEmails: new Set((process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)),
};
