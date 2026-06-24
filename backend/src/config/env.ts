import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required('MONGO_URI', 'mongodb://localhost:27017/trip_planner'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  stripePriceExplorer: process.env.STRIPE_PRICE_EXPLORER ?? '',
  stripePricePro: process.env.STRIPE_PRICE_PRO ?? '',
  stripePriceGlobetrotter: process.env.STRIPE_PRICE_GLOBETROTTER ?? '',
  pexelsApiKey: process.env.PEXELS_API_KEY ?? '',
  adminEmails: new Set((process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)),
};
